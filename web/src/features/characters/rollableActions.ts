import type { AbilityKey, CharacterFull } from "@dnd-manager/shared";
import { ABILITY_FULL_LABELS, asFoundryItems, type FoundryItem } from "./foundryDisplay";

export interface RollableAction {
  itemId: string;
  activityId: string;
  itemName: string;
  activityName: string | null;
  attackFormula: string | null;
  damageFormula: string | null;
  /**
   * Solo presente en conjuros de nivel 1+ cuyo daño escala al lanzarlos con
   * un hueco de nivel superior (p.ej. Ola atronadora: +1d8 por nivel por
   * encima del 1) — los dados que se SUMAN por cada nivel de más, ya
   * multiplicados si la propia entrada trae más de un dado por paso.
   * `spellBaseLevel` es el nivel del hueco "de serie" del conjuro, contra el
   * que se cuentan esos niveles de más. Los trucos (nivel 0) no usan esto:
   * su escalado no es una elección, así que ya viene sumado en
   * `damageFormula` según el nivel total del personaje (ver
   * `cantripScalingSteps`).
   */
  damageScalingPerLevel: string | null;
  spellBaseLevel: number | null;
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

interface DiceEntry {
  number?: number;
  denomination?: number | string;
  custom?: { enabled?: boolean; formula?: string };
  // Dados extra por "paso" de escalado — un espacio de conjuro por encima
  // del nivel base (conjuros normales) o un tramo de nivel de personaje
  // (trucos). `mode` casi siempre es "whole" (un múltiplo entero de
  // `number` dados por paso); no hay ningún otro modo en la práctica en los
  // exports que hemos visto, así que no se distingue aquí.
  scaling?: { mode?: string; number?: number };
}

function diceTerm(entry: DiceEntry | undefined): string | null {
  if (!entry) return null;
  if (entry.custom?.enabled && entry.custom.formula) return entry.custom.formula;
  if (entry.denomination) return `${entry.number ?? 1}d${entry.denomination}`;
  return null;
}

interface ScalingDice {
  count: number;
  denomination: number;
}

function scalingDiceEntry(entry: DiceEntry | undefined): ScalingDice | null {
  const count = entry?.scaling?.number;
  const denomination = entry?.denomination;
  if (!count || denomination === undefined) return null;
  const denominationNumber = typeof denomination === "number" ? denomination : Number(denomination);
  if (!Number.isFinite(denominationNumber)) return null;
  return { count, denomination: denominationNumber };
}

/** `[{count:1,denomination:8}, {count:1,denomination:6}]` × 2 pasos → `"2d8+2d6"`. */
function formatScalingDice(scalingDice: ScalingDice[], steps: number): string | null {
  if (steps <= 0 || scalingDice.length === 0) return null;
  return scalingDice.map((d) => `${d.count * steps}d${d.denomination}`).join("+");
}

function formatSigned(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

// Forma mínima de una activity de Foundry que necesitamos leer aquí — el
// resto de campos (consumption, duration, effects...) no nos interesan.
interface FoundryActivity {
  type?: string;
  name?: string;
  attack?: { ability?: string };
  save?: { ability?: string[] };
  damage?: { includeBase?: boolean; parts?: DiceEntry[] };
}

interface BuiltDamage {
  formula: string | null;
  scalingDice: ScalingDice[];
}

function buildDamage(
  item: FoundryItem,
  activity: FoundryActivity,
  abilityMod: number,
): BuiltDamage {
  const terms: string[] = [];
  const scalingDice: ScalingDice[] = [];

  if (activity.damage?.includeBase !== false) {
    const baseEntry = item.system?.damage?.base as DiceEntry | undefined;
    const base = diceTerm(baseEntry);
    if (base) terms.push(base);
    const baseScaling = scalingDiceEntry(baseEntry);
    if (baseScaling) scalingDice.push(baseScaling);
  }
  for (const part of activity.damage?.parts ?? []) {
    const term = diceTerm(part);
    if (term) terms.push(term);
    const scaling = scalingDiceEntry(part);
    if (scaling) scalingDice.push(scaling);
  }
  if (terms.length === 0) return { formula: null, scalingDice: [] };

  let formula = terms.join("+");
  if (item.system?.damage?.base?.bonus === "@mod" && abilityMod !== 0) {
    formula += formatSigned(abilityMod);
  }
  return { formula, scalingDice };
}

/**
 * Escalado de un truco (nivel 0): NO es una elección al lanzarlo (a
 * diferencia de un conjuro con hueco), escala solo con el nivel total del
 * personaje — por eso se suma directo a `damageFormula` en vez de dejarse
 * como opción en la UI. Tramos estándar de 5e (2014 y 2024): nivel 5, 11 y
 * 17.
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
 * Aplica el escalado de daño de un conjuro (ver `DiceEntry.scaling`):
 * - Truco (nivel 0 del ítem): se suma ya mismo a `damageFormula` según el
 *   nivel total del personaje — el jugador no elige nada.
 * - Conjuro de nivel 1+: se deja como `damageScalingPerLevel` +
 *   `spellBaseLevel` para que la UI ofrezca elegir con qué nivel de hueco
 *   se lanza antes de tirar (el mismo dato, pero por nivel, no ya sumado).
 * - Armas u otros ítems: el campo `scaling` (si lo trajeran) se ignora, no
 *   existe el concepto de "hueco de conjuro" para ellos.
 */
function applySpellScaling(
  item: FoundryItem,
  character: CharacterFull,
  built: BuiltDamage,
): {
  damageFormula: string | null;
  damageScalingPerLevel: string | null;
  spellBaseLevel: number | null;
} {
  if (!built.formula || built.scalingDice.length === 0 || item.type !== "spell") {
    return { damageFormula: built.formula, damageScalingPerLevel: null, spellBaseLevel: null };
  }

  const itemLevel = typeof item.system?.level === "number" ? item.system.level : null;
  if (itemLevel === 0) {
    const extra = formatScalingDice(built.scalingDice, cantripScalingSteps(character.level));
    return {
      damageFormula: extra ? `${built.formula}+${extra}` : built.formula,
      damageScalingPerLevel: null,
      spellBaseLevel: null,
    };
  }
  if (itemLevel !== null && itemLevel >= 1) {
    return {
      damageFormula: built.formula,
      damageScalingPerLevel: built.scalingDice.map((d) => `${d.count}d${d.denomination}`).join("+"),
      spellBaseLevel: itemLevel,
    };
  }
  return { damageFormula: built.formula, damageScalingPerLevel: null, spellBaseLevel: null };
}

/**
 * Ataques/acciones tirables de un personaje: recorre TODOS sus items
 * (armas, dotes, conjuros...) buscando activities `type: "attack"` o
 * `type: "save"` de Foundry. Es una estimación de mejor esfuerzo (ver
 * resolveAbilityMod / isProficientWithWeapon) — la fórmula calculada se
 * muestra siempre junto al botón para que el jugador pueda comprobarla
 * antes de tirar.
 *
 * Las activities `save` (Ola atronadora, Bola de fuego...) no tienen tirada
 * de ataque — es el OBJETIVO quien tira la salvación — así que solo
 * generan botón de daño, nunca de "Atacar". Su daño tampoco suma el
 * modificador de característica del lanzador (a diferencia de un ataque):
 * por eso se llama a buildDamage con abilityMod=0 — en la práctica da
 * igual, porque item.system.damage.base.bonus (el único sitio donde ese mod
 * se sumaría) nunca es "@mod" en un conjuro, pero así queda explícito y a
 * prueba de que algún día lo sea. Muchas activities `save` no hacen daño en
 * absoluto (Enmarañar, Hechizar persona... solo imponen una condición) —
 * esas se descartan porque buildDamage no encuentra ningún término de dados
 * que montar.
 */
export function getRollableActions(items: unknown, character: CharacterFull): RollableAction[] {
  const actions: RollableAction[] = [];

  for (const item of asFoundryItems(items)) {
    const activities = item.system?.activities;
    if (!activities || typeof activities !== "object") continue;

    for (const [activityId, activity] of Object.entries(
      activities as Record<string, FoundryActivity>,
    )) {
      if (activity?.type === "attack") {
        const abilityMod = resolveAbilityMod(activity.attack?.ability, item, character);
        const proficient = item.type === "weapon" ? isProficientWithWeapon(item, character) : true;
        const attackBonus = abilityMod + (proficient ? character.derived.proficiencyBonus : 0);
        const built = buildDamage(item, activity, abilityMod);
        const scaled = applySpellScaling(item, character, built);

        actions.push({
          itemId: item._id ?? activityId,
          activityId,
          itemName: item.name ?? "Sin nombre",
          activityName: activity.name && activity.name !== "Attack" ? activity.name : null,
          attackFormula: `1d20${formatSigned(attackBonus)}`,
          ...scaled,
        });
        continue;
      }

      if (activity?.type === "save") {
        const built = buildDamage(item, activity, 0);
        if (!built.formula) continue;
        const scaled = applySpellScaling(item, character, built);

        actions.push({
          itemId: item._id ?? activityId,
          activityId,
          itemName: item.name ?? "Sin nombre",
          activityName:
            (activity.name && activity.name !== "Attack" ? activity.name : null) ??
            resolveSaveAbilityLabel(activity),
          attackFormula: null,
          ...scaled,
        });
      }
    }
  }

  return actions;
}
