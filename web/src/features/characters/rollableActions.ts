import type { AbilityKey, CharacterFull } from "@dnd-manager/shared";
import { detectItemEffect, type DetectedItemEffect } from "./detectItemEffect";
import { ABILITY_FULL_LABELS, asFoundryItems, type FoundryItem } from "./foundryDisplay";
import { evaluateFormula, multiplyFormulaTerms, type RollData } from "./formulaEval";
import { formatIdentifier, resolveScaleValues } from "./scaleValues";
import { canUpcastSpell, computeSpellSlots, maxCastableSpellLevel } from "./spellProgression";

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
  /** Nivel de hueco más alto realmente disponible — acota el selector de nivel a huecos que el personaje de verdad tiene (A13). */
  maxCastableLevel: number | null;
  /**
   * CD de la salvación (A12) — solo para activities `type: "save"`. Ya va
   * incluida en `activityName` (p.ej. "Salvación de Constitución (CD 13)"),
   * se expone aparte por si la UI la quiere mostrar de otra forma.
   */
  saveDc: number | null;
  /** Texto "A niveles superiores" extraído de la descripción (A15) — red de seguridad para lo que el resto del algoritmo no llega a calcular. */
  higherLevelText: string | null;
  /**
   * A5 (rebanada práctica): rasgos de "gasta N puntos, recibe N" con
   * `consumption.scaling.allowed: true` y una fórmula que referencia
   * `@scaling` (p.ej. Imponer las Manos — cura tantos PG como puntos de la
   * reserva gastes, hasta el máximo disponible). `damageFormula` ya trae un
   * valor por defecto (gasto máximo); esto permite a la UI ofrecer elegir
   * cuánto gastar dentro de `[min, max]` y recalcular en el cliente.
   */
  resourceScaling: { formula: string; rollData: RollData; min: number; max: number } | null;
  /**
   * A7 (rebanada práctica): nº de objetivos cuando `system.target.affects.count`
   * es una fórmula (típicamente `@item.level`, p.ej. Hechizar persona: "una
   * bestia adicional por cada nivel por encima de 1") — calculado al nivel
   * base del conjuro, no reactivo al hueco elegido (para eso haría falta un
   * selector de nivel propio en conjuros sin daño, fuera de alcance por ahora).
   */
  targetCount: number | null;
  /**
   * Efecto de combate detectado en el propio ítem (buff/debuff con bono
   * reconocible, ver detectItemEffect.ts) — permite ofrecer "aplicar" en un
   * clic al usar esta acción en combate. `null` si el ítem no trae ningún
   * `change` reconocible.
   */
  detectedEffect: DetectedItemEffect | null;
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
  attack?: { ability?: string; type?: { value?: string; classification?: string } };
  attackMode?: string;
  save?: { ability?: string[]; dc?: { calculation?: string; formula?: string; bonus?: string } };
  damage?: { includeBase?: boolean; parts?: DiceEntry[] };
  healing?: DiceEntry;
  consumption?: { scaling?: { allowed?: boolean; max?: string } };
}

/**
 * A5 (rebanada práctica): tope de puntos gastables en un rasgo
 * "gasta N, recibe N" — `consumption.scaling.max` cuando está presente
 * (p.ej. Imponer las Manos: `5 * @classes.paladin.levels - @item.uses.spent`,
 * ya descuenta lo gastado hoy); si no hay fórmula propia, se cae al pool de
 * usos del propio ítem (`item.system.uses.max` — puede ser fórmula o
 * número — menos `uses.spent`).
 */
function resolveResourceMax(
  item: FoundryItem,
  activity: FoundryActivity,
  rollData: RollData,
): number {
  const maxFormula = activity.consumption?.scaling?.max;
  if (maxFormula) {
    return Math.max(1, evaluateFormula(maxFormula, rollData, { deterministic: true }));
  }
  const usesMax = item.system?.uses?.max;
  const spent = Number(item.system?.uses?.spent) || 0;
  if (typeof usesMax === "string" && usesMax) {
    return Math.max(1, evaluateFormula(usesMax, rollData, { deterministic: true }) - spent);
  }
  if (typeof usesMax === "number") return Math.max(1, usesMax - spent);
  return 1;
}

export interface ActorBonusFormulas {
  attack?: string;
  damage?: string;
}

export type ActionTypeKey = "mwak" | "rwak" | "msak" | "rsak";

/**
 * Bonos temporales de un combate en curso (efectos activos con duración por
 * rondas, ver CombatPanel.tsx) — se pasan aparte de `character.rawSystem`
 * porque no viven en la ficha, sino en el estado del combate, y solo deben
 * aplicarse mientras dure el efecto.
 */
export interface CombatBonuses {
  byActionType?: Partial<Record<ActionTypeKey, ActorBonusFormulas>>;
  spellDc?: string;
}

/**
 * `actor.system.bonuses.{mwak,rwak,msak,rsak}` (rebanada práctica de A14):
 * bonos GLOBALES de ataque/daño que el jugador rellena a mano en la ficha
 * (o que una Active Effect sobrescribe) — son fórmulas de texto ya
 * presentes tal cual en el export, no hace falta recorrer `effects[]` para
 * leerlas. La clasificación "unarmed" cuenta como arma a estos efectos
 * (mismo actionType que un arma normal en dnd5e).
 */
function resolveActionTypeKey(activity: FoundryActivity): ActionTypeKey | null {
  const range = activity.attack?.type?.value;
  const classification = activity.attack?.type?.classification;
  if (range !== "melee" && range !== "ranged") return null;
  if (classification === "spell") return range === "melee" ? "msak" : "rsak";
  if (classification === "weapon" || classification === "unarmed") {
    return range === "melee" ? "mwak" : "rwak";
  }
  return null;
}

function resolveActorBonuses(character: CharacterFull, key: ActionTypeKey): ActorBonusFormulas {
  const rawSystem = character.rawSystem as { bonuses?: Record<string, ActorBonusFormulas> } | null;
  return rawSystem?.bonuses?.[key] ?? {};
}

function resolveSpellDcBonus(character: CharacterFull): string | undefined {
  const rawSystem = character.rawSystem as { bonuses?: { spell?: { dc?: string } } } | null;
  return rawSystem?.bonuses?.spell?.dc;
}

function concatFormula(a: string | undefined, b: string | undefined): string | undefined {
  if (a && b) return `${a} + ${b}`;
  return a ?? b;
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

function collectDamageEntries(
  item: FoundryItem,
  activity: FoundryActivity,
): { base: DiceEntry | null; parts: DiceEntry[] } {
  const base =
    activity.damage?.includeBase !== false
      ? ((item.system?.damage?.base as DiceEntry | undefined) ?? null)
      : null;
  return { base, parts: activity.damage?.parts ?? [] };
}

/** Mano torpe con arma versátil/dos armas: nunca suma el mod si ya es ≥0 (regla 5e). */
function isOffhandWithPositiveMod(activity: FoundryActivity, mod: number): boolean {
  return !!activity.attackMode?.endsWith("offhand") && mod >= 0;
}

/** Ataques con conjuro clasificados como "natural" (garras/mordisco de un familiar transformado, p.ej.) no suman @mod aparte. */
function isNaturalSpellWeapon(item: FoundryItem, activity: FoundryActivity): boolean {
  return (
    activity.attack?.type?.classification === "spell" && item.system?.type?.value === "natural"
  );
}

/**
 * `@mod` implícito de armas (A11, §6.3): el daño de un arma SIEMPRE suma el
 * modificador de característica, no es algo que dependa de un flag por
 * item — el `bonus` explícito en `damage.base.bonus` es la excepción rara
 * (p.ej. armas con un bono ya escrito a mano), no la regla. Sin esto,
 * cualquier arma "normal" (Longbow, Ice Monarch...) sale con el dado pelado
 * sin el modificador.
 *
 * Caso especial: `custom.enabled` (Ataque sin armas: `formula:"1"`) ignora
 * `bonus` por completo (ver `baseFormulaText`) — para esas, el `@mod` se
 * añade directamente a `custom.formula`, no al `bonus` que nunca se lee.
 */
function applyImplicitWeaponMod(
  item: FoundryItem,
  activity: FoundryActivity,
  base: DiceEntry,
  mod: number,
): DiceEntry {
  if (item.type !== "weapon") return base;
  if (isOffhandWithPositiveMod(activity, mod) || isNaturalSpellWeapon(item, activity)) return base;

  if (base.custom?.enabled) {
    const formula = base.custom.formula ?? "";
    if (/@mod\b/.test(formula)) return base;
    return { ...base, custom: { ...base.custom, formula: formula ? `${formula} + @mod` : "@mod" } };
  }

  const baseText = baseFormulaText(base);
  const isFlat = baseText.length > 0 && !/\d*d\d+/.test(baseText);
  if (isFlat || /@mod\b/.test(baseText)) return base;
  return { ...base, bonus: base.bonus ? `${base.bonus} + @mod` : "@mod" };
}

/** `item.system.magicalBonus` (p.ej. un arma +1/+2/+3) — se suma tal cual cuando el ítem lo trae activo. */
function magicalBonusText(item: FoundryItem): string | null {
  if (!item.system?.magicAvailable) return null;
  const bonus = item.system?.magicalBonus;
  return typeof bonus === "number" && bonus !== 0 ? formatSigned(bonus) : null;
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
 * Característica de conjuro de UN ítem concreto (A12, §7.2): prioriza el
 * override explícito del propio conjuro (`item.system.ability`, p.ej. Ola
 * atronadora trae "wis" aunque el personaje lance con otra clase); si no,
 * cae a la característica de conjuro global del personaje. La resolución
 * completa por clase de origen (`sourceItem: "class:druid"`) es de A14
 * (Active Effects) y queda para una fase posterior — este fallback ya es
 * correcto para personajes con una sola clase lanzadora, que es el caso
 * común.
 */
function resolveSpellcastingAbilityForItem(
  item: FoundryItem,
  character: CharacterFull,
): AbilityKey | null {
  const itemAbility = item.system?.ability;
  if (typeof itemAbility === "string" && itemAbility in character.derived.abilityModifiers) {
    return itemAbility as AbilityKey;
  }
  return character.derived.spellcastingAbility;
}

/**
 * A7 (rebanada práctica): `system.target.affects.count` — casi siempre un
 * número fijo ("1", "3"...) pero a veces una fórmula real (`@item.level`,
 * ver Hechizar persona/Fuego feérico/Heroísmo en las fichas de ejemplo).
 * Se evalúa al nivel base declarado del conjuro (no al hueco elegido —
 * estos conjuros no tienen daño, así que hoy no hay selector de nivel al
 * que enganchar un recálculo reactivo).
 */
function resolveTargetCount(item: FoundryItem, rollData: RollData): number | null {
  if (item.type !== "spell") return null;
  const raw = item.system?.target?.affects?.count;
  if (typeof raw !== "string" || !raw.trim()) return null;
  const itemLevel = typeof item.system?.level === "number" ? item.system.level : 0;
  const value = evaluateFormula(
    raw,
    { ...rollData, item: { level: itemLevel } },
    { deterministic: true },
  );
  return Number.isFinite(value) ? value : null;
}

/**
 * CD de una activity de salvación (A12, §7.1): `8 + prof + mod` de la
 * característica resuelta, más cualquier bono de la propia activity
 * (`save.dc.bonus`). `bonuses.spell.dc` (Active Effects globales) es de A14
 * y todavía no se suma aquí. `calculation` puede ser: "" (CD ya fijada como
 * fórmula plana en `save.dc.formula`), una característica concreta
 * (forzada), o "spellcasting" (el caso normal).
 */
function resolveSaveDc(
  item: FoundryItem,
  activity: FoundryActivity,
  character: CharacterFull,
  rollData: RollData,
  combatSpellDcBonus: string | undefined,
): number | null {
  const dcConfig = activity.save?.dc;
  const calculation = dcConfig?.calculation;
  let dc: number;

  if (!calculation) {
    if (!dcConfig?.formula) return null;
    dc = evaluateFormula(dcConfig.formula, rollData, { deterministic: true });
  } else {
    let ability: AbilityKey | null;
    if (calculation in character.derived.abilityModifiers) {
      ability = calculation as AbilityKey;
    } else if (calculation === "spellcasting") {
      ability = resolveSpellcastingAbilityForItem(item, character);
    } else {
      ability = (activity.save?.ability?.[0] as AbilityKey | undefined) ?? null;
    }
    const mod = ability ? character.derived.abilityModifiers[ability] : 0;
    dc = 8 + mod + character.derived.proficiencyBonus;
  }

  if (dcConfig?.bonus) {
    dc += evaluateFormula(dcConfig.bonus, rollData, { deterministic: true });
  }
  // A14: `system.bonuses.spell.dc` — bono global a CD de conjuro (el
  // mismo mecanismo de bono manual/Active Effect que mwak/rwak/msak/rsak).
  // Se suma también el bono temporal de un efecto de combate activo, si lo hay.
  if (item.type === "spell") {
    const spellDcBonus = concatFormula(resolveSpellDcBonus(character), combatSpellDcBonus);
    if (spellDcBonus) dc += evaluateFormula(spellDcBonus, rollData, { deterministic: true });
  }
  return dc;
}

// "A niveles superiores"/"Using a Higher-Level Spell Slot" suele venir como
// un <p> cuyo primer <span> es el propio título (no un heading aparte antes
// del párrafo) — ver Ray of Sickness en Lilith.md. Se busca el <p> que
// CONTIENE la frase, no que empieza por ella, y se devuelve su texto plano.
const HIGHER_LEVEL_KEYWORDS = /niveles superiores|higher-level spell slot/i;

/**
 * A15 de la guía: red de seguridad frente a formas de escalado no
 * modeladas (E7/E10/E12 y cualquier homebrew imprevisto) — mostrar el
 * texto tal cual, siempre, cueste casi nada y cubre el 100% de los casos
 * que el resto del algoritmo no llega a calcular.
 */
function extractHigherLevelText(descriptionHtml: unknown): string | null {
  if (typeof descriptionHtml !== "string" || !descriptionHtml) return null;
  const paragraphs = descriptionHtml.match(/<p>[\s\S]*?<\/p>/gi) ?? [];
  const match = paragraphs.find((p) => HIGHER_LEVEL_KEYWORDS.test(p));
  if (!match) return null;
  const text = match
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text || null;
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
export function getRollableActions(
  items: unknown,
  character: CharacterFull,
  combatBonuses?: CombatBonuses,
): RollableAction[] {
  const actions: RollableAction[] = [];
  const rollDataBase = buildRollDataBase(character);
  // A13: una sola vez por personaje — el nivel de hueco más alto realmente
  // disponible acota el selector de la UI a huecos que existen de verdad
  // (antes ofrecía nv1-7 siempre, aunque el personaje solo tuviera nv1).
  const spellSlots = computeSpellSlots(character.items);
  const maxSlotLevel = maxCastableSpellLevel(spellSlots);

  for (const item of asFoundryItems(items)) {
    const activities = item.system?.activities;
    if (!activities || typeof activities !== "object") continue;

    const detectedEffect = detectItemEffect(item);

    for (const [activityId, activity] of Object.entries(
      activities as Record<string, FoundryActivity>,
    )) {
      const type = activity?.type;
      if (type !== "attack" && type !== "save" && type !== "damage" && type !== "heal") continue;

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

      const kind: RollableActionKind = type === "heal" ? "heal" : "damage";
      let entries: DiceEntry[];
      if (kind === "heal") {
        entries = activity.healing ? [activity.healing] : [];
      } else {
        const { base, parts } = collectDamageEntries(item, activity);
        // A11: el `@mod` de un arma es implícito — no depende de un `bonus`
        // literal `"@mod"` en los datos (esa era la regla vieja, incorrecta).
        // Solo se aplica a la entrada BASE del arma, nunca a `parts` extra.
        const adjustedBase =
          base && type === "attack" ? applyImplicitWeaponMod(item, activity, base, mod) : base;
        entries = adjustedBase ? [adjustedBase, ...parts] : parts;
      }

      const rollData: RollData = { ...rollDataBase, mod };
      // A14 (rebanada de bonos globales del actor): `system.bonuses.<actionType>.*`
      // — un ataque cuerpo a cuerpo con arma también recibe el bono de
      // `mwak`, uno de conjuro a distancia el de `rsak`, etc. Se suma
      // aparte del `@mod` implícito (A11), no lo sustituye.
      const actionTypeKey = type === "attack" ? resolveActionTypeKey(activity) : null;
      const combatActionBonuses = actionTypeKey
        ? combatBonuses?.byActionType?.[actionTypeKey]
        : undefined;
      const actorBonuses: ActorBonusFormulas = actionTypeKey
        ? {
            attack: concatFormula(
              resolveActorBonuses(character, actionTypeKey).attack,
              combatActionBonuses?.attack,
            ),
            damage: concatFormula(
              resolveActorBonuses(character, actionTypeKey).damage,
              combatActionBonuses?.damage,
            ),
          }
        : {};

      let attackFormula: string | null = null;
      if (type === "attack") {
        const proficient = item.type === "weapon" ? isProficientWithWeapon(item, character) : true;
        let attackBonus = mod + (proficient ? character.derived.proficiencyBonus : 0);
        if (actorBonuses.attack) {
          attackBonus += evaluateFormula(actorBonuses.attack, rollData, { deterministic: true });
        }
        attackFormula = `1d20${formatSigned(attackBonus)}`;
      }

      const built = buildDeferred(entries);
      let damageFormula: string | null = built.base ? evaluateFormula(built.base, rollData) : null;
      if (damageFormula && type === "attack") {
        const magicalBonus = magicalBonusText(item);
        if (magicalBonus) damageFormula = `${damageFormula} ${magicalBonus}`;
        if (actorBonuses.damage) {
          const bonusText = evaluateFormula(actorBonuses.damage, rollData);
          if (bonusText) damageFormula = `${damageFormula} + ${bonusText}`;
        }
      }
      let damageScalingPerLevel: string | null = null;
      let spellBaseLevel: number | null = null;
      let maxCastableLevel: number | null = null;
      let higherLevelText: string | null = null;
      let resourceScaling: RollableAction["resourceScaling"] = null;

      // A5 (rebanada práctica): "gasta N puntos de una reserva, recibe N"
      // (Imponer las Manos) — `@scaling` no está en ninguna otra ruta de
      // rollData, así que sin esto siempre resolvía a 0 ("Curar (0)").
      if (built.base && activity.consumption?.scaling?.allowed && /@scaling\b/.test(built.base)) {
        const max = resolveResourceMax(item, activity, rollData);
        resourceScaling = { formula: built.base, rollData, min: 1, max };
        damageFormula = evaluateFormula(built.base, { ...rollData, scaling: max });
      }

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
        } else if (
          itemLevel !== null &&
          itemLevel >= 1 &&
          built.scalingDice.length > 0 &&
          canUpcastSpell(item.system?.method)
        ) {
          damageScalingPerLevel = built.scalingDice
            .map((d) => `${d.count}d${d.denomination}`)
            .join("+");
          spellBaseLevel = itemLevel;
          // Por si acaso el cálculo de huecos no llega al nivel base del
          // propio conjuro (huecos "desincronizados" del `.md`, ver §14) —
          // el selector nunca debe ofrecer MENOS que el nivel de serie.
          maxCastableLevel = Math.max(itemLevel, maxSlotLevel);
          higherLevelText = extractHigherLevelText(item.system?.description?.value);
        }
      }

      const saveDc =
        type === "save"
          ? resolveSaveDc(item, activity, character, rollData, combatBonuses?.spellDc)
          : null;
      const saveLabel = type === "save" ? resolveSaveAbilityLabel(activity) : null;

      // Antes se descartaban aquí las activities `save` sin daño (hechizos
      // de control/utilidad puros como Hechizar persona) — su CD nunca
      // llegaba a mostrarse en ningún sitio. Se conservan cuando al menos
      // tienen una CD resuelta, aunque no haya nada que tirar como daño.
      const isInfoOnlySave = type === "save" && saveDc !== null;
      if (type !== "attack" && !damageFormula && !isInfoOnlySave) continue;

      const targetCount = resolveTargetCount(item, rollData);

      actions.push({
        itemId: item._id ?? activityId,
        activityId,
        itemName: item.name ?? "Sin nombre",
        activityName:
          (activity.name && activity.name !== "Attack" ? activity.name : null) ??
          (saveLabel && saveDc !== null ? `${saveLabel} (CD ${saveDc})` : saveLabel),
        kind,
        attackFormula,
        damageFormula,
        damageScalingPerLevel,
        spellBaseLevel,
        maxCastableLevel,
        saveDc,
        higherLevelText,
        resourceScaling,
        targetCount,
        detectedEffect,
      });
    }
  }

  return actions;
}
