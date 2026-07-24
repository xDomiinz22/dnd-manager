import type { AbilityKey, CharacterFull } from "@dnd-manager/shared";
import { ABILITY_FULL_LABELS, asFoundryItems, type FoundryItem } from "./foundryDisplay";
import { evaluateFormula, multiplyFormulaTerms, type RollData } from "./formulaEval";
import { formatIdentifier, resolveScaleValues } from "./scaleValues";

export type RollableActionKind = "damage" | "heal";

export interface RollableAction {
  itemId: string;
  activityId: string;
  itemName: string;
  activityName: string | null;
  /** "heal" para activities `type: "heal"` (Curar heridas...) — el resto son "damage". */
  kind: RollableActionKind;
  attackFormula: string | null;
  damageFormula: string | null;
  /**
   * Solo presente en conjuros de nivel 1+ cuyo daño/curación escala al
   * lanzarlos con un hueco de nivel superior (p.ej. Ola atronadora: +1d8
   * por nivel por encima del 1) — los dados que se SUMAN por cada nivel de
   * más. `spellBaseLevel` es el nivel del hueco "de serie", contra el que
   * se cuentan esos niveles de más. Los trucos (nivel 0) no usan esto: su
   * escalado no es una elección, así que ya viene sumado en `damageFormula`
   * según el nivel total del personaje (ver `cantripScalingSteps`).
   */
  damageScalingPerLevel: string | null;
  spellBaseLevel: number | null;
}

const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

/** Texto del botón/etiqueta de tirada según el tipo de activity — reutilizado en ficha, chat y combate. */
export function damageActionLabels(kind: RollableActionKind): { verb: string; prefix: string } {
  return kind === "heal" ? { verb: "Curar", prefix: "Curación" } : { verb: "Daño", prefix: "Daño" };
}

/**
 * Modificador de característica para una activity de ataque. Prioriza el
 * dato real (`activity.attack.ability`) cuando Foundry lo trae relleno;
 * cuando viene vacío (bastante común en items homebrew, ver el caso real de
 * "Espadón de hielo" en Dominz.md) caemos a las reglas estándar de 5e:
 * conjuros → característica de conjuro, armas con la propiedad "fin"
 * (sutil) → la mejor entre FUE/DES, a distancia → DES, cuerpo a cuerpo → FUE.
 */
function resolveAbilityMod(
  ability: string | undefined,
  item: FoundryItem,
  character: CharacterFull,
): number {
  const mods = character.derived.abilityModifiers;
  if (ability && ability in mods) return mods[ability as AbilityKey];

  if (item.type === "spell" && character.derived.spellcastingAbility) {
    return mods[character.derived.spellcastingAbility];
  }

  if (item.type === "weapon") {
    const properties: string[] = item.system?.properties ?? [];
    const typeValue: string = item.system?.type?.value ?? "";
    if (typeValue.endsWith("R")) return mods.dex;
    if (properties.includes("fin")) return Math.max(mods.str, mods.dex);
    return mods.str;
  }

  return mods.str;
}

/**
 * Competencia con un arma: usa el flag explícito de Foundry si está puesto
 * (1/true o 0/false); si viene sin definir (null), lo derivamos de la lista
 * de competencias con armas del personaje (simples/marciales o el arma base
 * concreta) — el mismo dato que ya usa el propio sistema dnd5e.
 */
function isProficientWithWeapon(item: FoundryItem, character: CharacterFull): boolean {
  const proficient = item.system?.proficient;
  if (proficient === 1 || proficient === true) return true;
  if (proficient === 0 || proficient === false) return false;

  const rawSystem = character.rawSystem as { traits?: { weaponProf?: { value?: string[] } } };
  const weaponProf: string[] = rawSystem?.traits?.weaponProf?.value ?? [];
  const typeValue: string = item.system?.type?.value ?? "";
  const baseItem: string = item.system?.type?.baseItem ?? "";
  if (typeValue.startsWith("simple") && weaponProf.includes("sim")) return true;
  if (typeValue.startsWith("martial") && weaponProf.includes("mar")) return true;
  return baseItem ? weaponProf.includes(baseItem) : false;
}

function formatSigned(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

interface DiceEntry {
  number?: number;
  denomination?: number | string;
  bonus?: string;
  custom?: { enabled?: boolean; formula?: string };
  // "whole" (1 paso por nivel) | "half" (floor(niveles/2)) | ausente/otro ⇒
  // NO escala — ver §4.3 de la guía: `scaling.number` sin `mode` es ruido
  // frecuente (Ataque furtivo, Longbow, el dardo de Ice Knife...), no una
  // señal de escalado por hueco.
  scaling?: { mode?: string; number?: number; formula?: string };
}

// Forma mínima de una activity de Foundry que necesitamos leer aquí — el
// resto de campos (consumption, duration, effects...) no nos interesan.
interface FoundryActivity {
  type?: string;
  name?: string;
  attack?: { ability?: string };
  save?: { ability?: string[] };
  damage?: { includeBase?: boolean; parts?: DiceEntry[] };
  healing?: DiceEntry;
}

/**
 * Fórmula "de serie" (increase=0) de una entrada de daño/curación. Si
 * `custom.enabled`, la fórmula es la que traiga `custom.formula` tal cual —
 * y el `bonus` del part se IGNORA (Foundry lo hace así: ver "Ataque sin
 * armas", `custom:{enabled:true, formula:"1"}` + `bonus:"@mod"`, cuyo daño
 * real es `1 + @mod` porque el "+@mod" lo añade la lógica de armas, no este
 * campo — ver rollData/mod más abajo). El texto puede llevar `@refs` sin
 * resolver todavía (se resuelven al final, una sola vez, con
 * `evaluateFormula`).
 */
function baseFormulaText(entry: DiceEntry | undefined, extraCount = 0): string {
  if (!entry) return "";
  if (entry.custom?.enabled) return entry.custom.formula ?? "";
  const count = (entry.number ?? 0) + extraCount;
  let text = count && entry.denomination ? `${count}d${entry.denomination}` : "";
  if (entry.bonus) text = text ? `${text} + ${entry.bonus}` : entry.bonus;
  return text;
}

function scalingSteps(entry: DiceEntry | undefined, increase: number): number {
  const mode = entry?.scaling?.mode;
  if (mode === "whole") return increase;
  if (mode === "half") return Math.floor(increase / 2);
  return 0;
}

/**
 * `scaledFormula` (A6 de la guía) — el algoritmo central de escalado,
 * traducción literal de `DamageData#scaledFormula` de dnd5e. Se usa cuando
 * el `increase` ya se conoce de antemano (trucos: automático según nivel de
 * personaje). Para conjuros de nivel 1+ (el jugador elige el hueco en la
 * UI) se usa en su lugar `buildDeferred`, más abajo, que solo soporta el
 * canal A (dados) — ver la nota ahí.
 */
function scaledFormulaText(entry: DiceEntry | undefined, increase: number): string {
  const steps = scalingSteps(entry, increase);
  if (!steps) return baseFormulaText(entry);

  const dieIncrease = (entry?.scaling?.number ?? 0) * steps;
  let text: string;
  if (entry?.custom?.enabled) {
    const custom = entry.custom.formula ?? "";
    text = dieIncrease
      ? custom.replace(/^(\d*)d/, (_match, n: string) => `${(Number(n) || 1) + dieIncrease}d`)
      : custom;
  } else {
    text = baseFormulaText(entry, dieIncrease);
  }

  // Canal B (§4.1): casi siempre vacío en datos reales, pero hace falta
  // implementarlo para homebrew/contenido migrado de dnd5e ≤v3 — si no,
  // esos conjuros escalarían de menos en silencio.
  if (entry?.scaling?.formula) {
    const scaled = multiplyFormulaTerms(entry.scaling.formula, steps);
    text = text ? `${text} + ${scaled}` : scaled;
  }
  return text;
}

interface ScalingDice {
  count: number;
  denomination: number;
}

interface BuiltFormula {
  /** Fórmula con increase=0, con `@refs` sin resolver todavía. */
  base: string | null;
  /** Dados que añade CADA nivel de más — solo entradas `mode:"whole"` sin `custom` (ver comentario en `DiceEntry.scaling`). */
  scalingDice: ScalingDice[];
}

function buildDeferred(entries: DiceEntry[]): BuiltFormula {
  const terms: string[] = [];
  const scalingDice: ScalingDice[] = [];
  for (const entry of entries) {
    const term = baseFormulaText(entry);
    if (term) terms.push(term);
    if (
      entry.scaling?.mode === "whole" &&
      entry.scaling.number &&
      !entry.custom?.enabled &&
      entry.denomination !== undefined
    ) {
      const denomination =
        typeof entry.denomination === "number" ? entry.denomination : Number(entry.denomination);
      if (Number.isFinite(denomination))
        scalingDice.push({ count: entry.scaling.number, denomination });
    }
  }
  return { base: terms.length > 0 ? terms.join(" + ") : null, scalingDice };
}

function collectDamageEntries(item: FoundryItem, activity: FoundryActivity): DiceEntry[] {
  const entries: DiceEntry[] = [];
  if (activity.damage?.includeBase !== false) {
    const base = item.system?.damage?.base as DiceEntry | undefined;
    if (base) entries.push(base);
  }
  entries.push(...(activity.damage?.parts ?? []));
  return entries;
}

/**
 * Escalado de un truco (nivel 0): NO es una elección al lanzarlo (a
 * diferencia de un conjuro con hueco), escala solo con el nivel total del
 * personaje — por eso se aplica ya mismo en vez de dejarse como opción en
 * la UI. Tramos estándar de 5e (2014 y 2024): nivel 5, 11 y 17
 * (`floor((nivel+1)/6)`).
 */
function cantripScalingSteps(characterLevel: number): number {
  if (characterLevel >= 17) return 3;
  if (characterLevel >= 11) return 2;
  if (characterLevel >= 5) return 1;
  return 0;
}

/**
 * Etiqueta de contexto para una activity de salvación sin nombre propio
 * (el caso normal: `activity.name` suele venir vacío) — p.ej. "Salvación de
 * Constitución", a partir de `activity.save.ability` (Foundry siempre trae
 * un array, aunque solo tenga una característica).
 */
function resolveSaveAbilityLabel(activity: FoundryActivity): string | null {
  const ability = activity.save?.ability?.[0];
  if (typeof ability === "string" && ability in ABILITY_FULL_LABELS) {
    return `Salvación de ${ABILITY_FULL_LABELS[ability as AbilityKey]}`;
  }
  return null;
}

/**
 * Roll data (§2 de la guía) común a todo el personaje — se construye UNA
 * vez por ficha, no por activity. Cubre las rutas que necesitamos en esta
 * fase: `@abilities.*`, `@details.level`, `@classes.*.levels`,
 * `@subclasses.*.levels`, `@scale.*` (vía `resolveScaleValues`, A2) y
 * `@prof`. Cualquier otra ruta (`@item.uses.spent`, `@attributes.spell.*`...)
 * resuelve a 0 — fases posteriores de la guía las añadirán.
 */
function buildRollDataBase(character: CharacterFull): Omit<RollData, "mod" | "item"> {
  const abilities = Object.fromEntries(
    ABILITY_KEYS.map((key) => [key, { value: 10, mod: character.derived.abilityModifiers[key] }]),
  );

  const items = asFoundryItems(character.items);
  const classItems = items.filter((item) => item.type === "class");
  const subclassItems = items.filter((item) => item.type === "subclass");

  const classes = Object.fromEntries(
    classItems.map((item) => [
      item.system?.identifier || formatIdentifier(item.name ?? ""),
      { levels: Number(item.system?.levels) || 0 },
    ]),
  );
  const subclasses = Object.fromEntries(
    subclassItems.map((item) => {
      const parent = classItems.find((c) => c.system?.identifier === item.system?.classIdentifier);
      return [
        item.system?.identifier || formatIdentifier(item.name ?? ""),
        { levels: Number(parent?.system?.levels) || 0 },
      ];
    }),
  );

  const originalClassId =
    (character.rawSystem as { details?: { originalClass?: string } } | null)?.details
      ?.originalClass ?? null;

  return {
    abilities,
    attributes: { spellcasting: character.derived.spellcastingAbility },
    classes,
    subclasses,
    details: { level: character.level },
    prof: character.derived.proficiencyBonus,
    scale: resolveScaleValues(character.items, originalClassId),
  };
}

/**
 * Ataques/acciones tirables de un personaje: recorre TODOS sus items
 * (armas, dotes, conjuros...) buscando activities `type: "attack"`,
 * `"save"`, `"damage"` o `"heal"` de Foundry. Es una estimación de mejor
 * esfuerzo (ver resolveAbilityMod / isProficientWithWeapon) — la fórmula
 * calculada se muestra siempre junto al botón para que el jugador pueda
 * comprobarla antes de tirar.
 *
 * - `attack`: tirada de ataque + daño opcional (True Strike no tiene daño
 *   propio — usa el del arma empuñada, algo que no cruzamos aquí).
 * - `save`: sin tirada de ataque (tira el OBJETIVO la salvación) — su daño
 *   tampoco suma el modificador del lanzador (RAW), por eso usa `mod=0`.
 *   Se descarta si no hay ningún dado que montar (Enmarañar, Hechizar
 *   persona... solo imponen una condición).
 * - `damage`/`heal`: activities "sueltas" sin tirada propia (Ataque
 *   furtivo, Castigo Divino, Curar heridas...) — antes se ignoraban por
 *   completo (bug #1 del diagnóstico).
 */
export function getRollableActions(items: unknown, character: CharacterFull): RollableAction[] {
  const actions: RollableAction[] = [];
  const rollDataBase = buildRollDataBase(character);

  for (const item of asFoundryItems(items)) {
    const activities = item.system?.activities;
    if (!activities || typeof activities !== "object") continue;

    for (const [activityId, activity] of Object.entries(
      activities as Record<string, FoundryActivity>,
    )) {
      const type = activity?.type;
      if (type !== "attack" && type !== "save" && type !== "damage" && type !== "heal") continue;

      const kind: RollableActionKind = type === "heal" ? "heal" : "damage";
      const entries =
        kind === "heal"
          ? activity.healing
            ? [activity.healing]
            : []
          : collectDamageEntries(item, activity);

      // @mod para esta activity concreta: en un ataque, la característica
      // resuelta para el propio ataque; en una salvación, 0 (RAW: el daño
      // de una salvación no suma el mod del lanzador); en `damage`/`heal`
      // sueltos (sin tirada propia, casi siempre de conjuro), la de
      // conjuro por defecto vía el mismo fallback que ya usa el ataque.
      const mod =
        type === "attack"
          ? resolveAbilityMod(activity.attack?.ability, item, character)
          : type === "damage" || type === "heal"
            ? resolveAbilityMod(undefined, item, character)
            : 0;

      const rollData: RollData = { ...rollDataBase, mod };

      let attackFormula: string | null = null;
      if (type === "attack") {
        const proficient = item.type === "weapon" ? isProficientWithWeapon(item, character) : true;
        const attackBonus = mod + (proficient ? character.derived.proficiencyBonus : 0);
        attackFormula = `1d20${formatSigned(attackBonus)}`;
      }

      const built = buildDeferred(entries);
      let damageFormula: string | null = built.base ? evaluateFormula(built.base, rollData) : null;
      let damageScalingPerLevel: string | null = null;
      let spellBaseLevel: number | null = null;

      if (item.type === "spell" && built.base) {
        const itemLevel = typeof item.system?.level === "number" ? item.system.level : null;
        if (itemLevel === 0) {
          const steps = cantripScalingSteps(character.level);
          if (steps > 0) {
            const scaledTerms = entries
              .map((entry) => scaledFormulaText(entry, steps))
              .filter((text) => text.length > 0);
            if (scaledTerms.length > 0) {
              damageFormula = evaluateFormula(scaledTerms.join(" + "), rollData);
            }
          }
        } else if (itemLevel !== null && itemLevel >= 1 && built.scalingDice.length > 0) {
          damageScalingPerLevel = built.scalingDice
            .map((d) => `${d.count}d${d.denomination}`)
            .join("+");
          spellBaseLevel = itemLevel;
        }
      }

      // Sin tirada de ataque propia y sin nada que tirar ⇒ no hay botón que mostrar.
      if (type !== "attack" && !damageFormula) continue;

      actions.push({
        itemId: item._id ?? activityId,
        activityId,
        itemName: item.name ?? "Sin nombre",
        activityName:
          (activity.name && activity.name !== "Attack" ? activity.name : null) ??
          (type === "save" ? resolveSaveAbilityLabel(activity) : null),
        kind,
        attackFormula,
        damageFormula,
        damageScalingPerLevel,
        spellBaseLevel,
      });
    }
  }

  return actions;
}
