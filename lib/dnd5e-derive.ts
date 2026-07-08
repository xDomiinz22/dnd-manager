export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function proficiencyBonus(totalLevel: number): number {
  return 2 + Math.floor((totalLevel - 1) / 4);
}

export function savingThrow(mod: number, proficient: boolean, pb: number): number {
  return mod + (proficient ? pb : 0);
}

/** value: 0 = sin competencia, 0.5 = media competencia, 1 = competente, 2 = experto. */
export function skillBonus(mod: number, value: number, pb: number): number {
  return mod + Math.floor(value * pb);
}

export function passiveScore(total: number): number {
  return 10 + total;
}

export function initiativeBonus(dexMod: number, bonus = 0): number {
  return dexMod + bonus;
}

/** D&D redondea el promedio de un dado hacia arriba: floor(caras/2) + 1. */
export function avgDieValue(dieSize: number): number {
  return Math.floor(dieSize / 2) + 1;
}

export function maxHitPoints(
  hitDieSize: number,
  conMod: number,
  level: number,
  bonusPerLevel = 0,
): number {
  if (level < 1) return 0;
  const firstLevel = hitDieSize + conMod + bonusPerLevel;
  const otherLevels = (level - 1) * (avgDieValue(hitDieSize) + conMod + bonusPerLevel);
  return firstLevel + otherLevels;
}

export interface ArmorClassConfig {
  /** Valor de Foundry `attributes.ac.calc` (p.ej. "default", "flat", "natural", "mage"...). */
  calc: string;
  flat: number | null;
  /** Suma de bonificadores "add" de active effects no deshabilitados sobre `ac.bonus`. */
  bonus?: number;
}

export interface ArmorClassResult {
  computed: number | null;
  /** true si `calc` no es un modo soportado por esta heurística y hace falta que el usuario lo fije a mano. */
  needsOverride: boolean;
}

/**
 * Solo soporta los modos "flat" y "default" (10 + DEX). Cualquier otro calc
 * (natural, mage, draconic...) depende de reglas de subclase/objetos que no
 * intentamos modelar aquí: se expone como override editable en su lugar.
 */
export function computeArmorClass(config: ArmorClassConfig, dexMod: number): ArmorClassResult {
  const bonus = config.bonus ?? 0;

  if (config.calc === "flat") {
    return config.flat != null
      ? { computed: config.flat + bonus, needsOverride: false }
      : { computed: null, needsOverride: true };
  }

  if (config.calc === "default") {
    return { computed: 10 + dexMod + bonus, needsOverride: false };
  }

  return { computed: null, needsOverride: true };
}

export interface SkillInput {
  code: string;
  ability: AbilityKey;
  value: number;
}

export interface SkillResult {
  ability: AbilityKey;
  value: number;
  bonus: number;
  passive: number;
}

export interface DeriveInput {
  abilityScores: Record<AbilityKey, number>;
  abilityProficiencies: Partial<Record<AbilityKey, boolean>>;
  skills: SkillInput[];
  level: number;
  hitDieSize: number;
  hpBonusPerLevel?: number;
  armorClass: ArmorClassConfig;
  initiativeBonus?: number;
  spellcastingAbility?: AbilityKey | null;
}

export interface DerivedStats {
  proficiencyBonus: number;
  abilityModifiers: Record<AbilityKey, number>;
  savingThrows: Record<AbilityKey, number>;
  skills: Record<string, SkillResult>;
  passivePerception: number;
  initiative: number;
  hitPoints: { max: number };
  armorClass: ArmorClassResult;
  spellcastingAbility: AbilityKey | null;
}

export function deriveCharacterStats(input: DeriveInput): DerivedStats {
  const pb = proficiencyBonus(input.level);

  const abilityModifiers = Object.fromEntries(
    ABILITY_KEYS.map((key) => [key, abilityModifier(input.abilityScores[key])]),
  ) as Record<AbilityKey, number>;

  const savingThrows = Object.fromEntries(
    ABILITY_KEYS.map((key) => [
      key,
      savingThrow(abilityModifiers[key], !!input.abilityProficiencies[key], pb),
    ]),
  ) as Record<AbilityKey, number>;

  const skills = Object.fromEntries(
    input.skills.map((skill) => {
      const mod = abilityModifiers[skill.ability];
      const bonus = skillBonus(mod, skill.value, pb);
      return [skill.code, { ability: skill.ability, value: skill.value, bonus, passive: passiveScore(bonus) }];
    }),
  );

  const perception = skills.prc;
  const passivePerception = perception ? perception.passive : passiveScore(abilityModifiers.wis);

  return {
    proficiencyBonus: pb,
    abilityModifiers,
    savingThrows,
    skills,
    passivePerception,
    initiative: initiativeBonus(abilityModifiers.dex, input.initiativeBonus ?? 0),
    hitPoints: {
      max: maxHitPoints(input.hitDieSize, abilityModifiers.con, input.level, input.hpBonusPerLevel ?? 0),
    },
    armorClass: computeArmorClass(input.armorClass, abilityModifiers.dex),
    spellcastingAbility: input.spellcastingAbility ?? null,
  };
}
