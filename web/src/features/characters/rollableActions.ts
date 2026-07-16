import type { AbilityKey, CharacterFull } from "@dnd-manager/shared";
import { asFoundryItems, type FoundryItem } from "./foundryDisplay";

export interface RollableAction {
  itemId: string;
  activityId: string;
  itemName: string;
  activityName: string | null;
  attackFormula: string | null;
  damageFormula: string | null;
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
}

function diceTerm(entry: DiceEntry | undefined): string | null {
  if (!entry) return null;
  if (entry.custom?.enabled && entry.custom.formula) return entry.custom.formula;
  if (entry.denomination) return `${entry.number ?? 1}d${entry.denomination}`;
  return null;
}

function formatSigned(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildDamageFormula(item: FoundryItem, activity: any, abilityMod: number): string | null {
  const terms: string[] = [];
  if (activity.damage?.includeBase !== false) {
    const base = diceTerm(item.system?.damage?.base);
    if (base) terms.push(base);
  }
  for (const part of activity.damage?.parts ?? []) {
    const term = diceTerm(part);
    if (term) terms.push(term);
  }
  if (terms.length === 0) return null;

  let formula = terms.join("+");
  if (item.system?.damage?.base?.bonus === "@mod" && abilityMod !== 0) {
    formula += formatSigned(abilityMod);
  }
  return formula;
}

/**
 * Ataques/acciones tirables de un personaje: recorre TODOS sus items
 * (armas, dotes, conjuros...) buscando activities `type: "attack"` de
 * Foundry. Es una estimación de mejor esfuerzo (ver resolveAbilityMod /
 * isProficientWithWeapon) — la fórmula calculada se muestra siempre junto
 * al botón para que el jugador pueda comprobarla antes de tirar.
 */
export function getRollableActions(items: unknown, character: CharacterFull): RollableAction[] {
  const actions: RollableAction[] = [];

  for (const item of asFoundryItems(items)) {
    const activities = item.system?.activities;
    if (!activities || typeof activities !== "object") continue;

    for (const [activityId, activity] of Object.entries(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      activities as Record<string, any>,
    )) {
      if (activity?.type !== "attack") continue;

      const abilityMod = resolveAbilityMod(activity.attack?.ability, item, character);
      const proficient = item.type === "weapon" ? isProficientWithWeapon(item, character) : true;
      const attackBonus = abilityMod + (proficient ? character.derived.proficiencyBonus : 0);

      actions.push({
        itemId: item._id ?? activityId,
        activityId,
        itemName: item.name ?? "Sin nombre",
        activityName: activity.name && activity.name !== "Attack" ? activity.name : null,
        attackFormula: `1d20${formatSigned(attackBonus)}`,
        damageFormula: buildDamageFormula(item, activity, abilityMod),
      });
    }
  }

  return actions;
}
