import { createHash } from "node:crypto";
import yaml from "js-yaml";
import {
  deriveCharacterStats,
  ABILITY_KEYS,
  type AbilityKey,
  type DeriveInput,
  type DerivedStats,
} from "../../lib/dnd5e-derive";

export class FoundryParseError extends Error {}

const ACTOR_BLOCK_PATTERN = /```Actor\r?\n([\s\S]*?)```/;

export interface ParsedCharacter {
  name: string;
  level: number;
  className: string | null;
  subclassName: string | null;
  species: string | null;
  background: string | null;
  alignment: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawSystem: any;
  items: unknown[];
  derived: DerivedStats;
  sourceMdHash: string;
}

export function extractActorBlock(md: string): string {
  const match = md.match(ACTOR_BLOCK_PATTERN);
  if (!match) {
    throw new FoundryParseError('No se encontró un bloque ```Actor en el archivo .md');
  }
  return match[1]!;
}

export function hashMdContent(md: string): string {
  return createHash("sha256").update(md).digest("hex");
}

// El export de Foundry no tiene un tipo TS oficial y varía bastante entre
// campañas (homebrew, módulos de terceros...); tipamos laxo a propósito y
// toleramos campos ausentes en vez de reventar en el parseo.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FoundryItem = Record<string, any>;

function findItemById(items: FoundryItem[], id: string | null | undefined): FoundryItem | undefined {
  if (!id) return undefined;
  return items.find((item) => item._id === id);
}

/**
 * Suma los bonos "add" sobre `system.attributes.ac.bonus` de active effects
 * NO deshabilitados. No modela el resto de active effects (no es un motor
 * general): cubre el caso común de objetos/dotes homebrew que suman CA plana.
 */
function sumAcBonusFromEffects(items: FoundryItem[]): number {
  let total = 0;
  for (const item of items) {
    for (const effect of item.effects ?? []) {
      if (effect?.disabled) continue;
      for (const change of effect?.system?.changes ?? []) {
        if (change?.key === "system.attributes.ac.bonus" && change?.type === "add") {
          const value = Number(change.value);
          if (Number.isFinite(value)) total += value;
        }
      }
    }
  }
  return total;
}

function totalLevelFromItems(items: FoundryItem[]): number {
  return items
    .filter((item) => item.type === "class")
    .reduce((sum, item) => sum + (Number(item.system?.levels) || 0), 0);
}

export function parseFoundryMd(md: string): ParsedCharacter {
  const block = extractActorBlock(md);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed = yaml.load(block) as any;
  if (!parsed || typeof parsed !== "object") {
    throw new FoundryParseError('El bloque ```Actor no contiene YAML válido');
  }

  const name: string = typeof parsed.name === "string" && parsed.name ? parsed.name : "Sin nombre";
  const system = parsed.system ?? {};
  const items: FoundryItem[] = Array.isArray(parsed.items) ? parsed.items : [];

  const details = system.details ?? {};
  const raceItem = findItemById(items, details.race);
  const classItem = findItemById(items, details.originalClass);
  const subclassItem = items.find(
    (item) =>
      item.type === "subclass" &&
      classItem?.system?.identifier &&
      item.system?.classIdentifier === classItem.system.identifier,
  );
  const backgroundItem = findItemById(items, details.background);

  const level = totalLevelFromItems(items) || Number(classItem?.system?.levels) || 1;

  const abilities = system.abilities ?? {};
  const abilityScores = Object.fromEntries(
    ABILITY_KEYS.map((key) => [key, Number(abilities[key]?.value) || 10]),
  ) as Record<AbilityKey, number>;
  const abilityProficiencies = Object.fromEntries(
    ABILITY_KEYS.map((key) => [key, (Number(abilities[key]?.proficient) || 0) > 0]),
  ) as Partial<Record<AbilityKey, boolean>>;

  const skillsRaw = system.skills ?? {};
  const skills = Object.entries(skillsRaw as Record<string, { ability?: string; value?: number }>)
    .filter(([, skill]) => ABILITY_KEYS.includes(skill?.ability as AbilityKey))
    .map(([code, skill]) => ({
      code,
      ability: skill.ability as AbilityKey,
      value: Number(skill.value) || 0,
    }));

  const hitDieSize = Number(String(classItem?.system?.hd?.denomination ?? "").replace(/\D/g, "")) || 6;

  const ac = system.attributes?.ac ?? {};
  const acBonus = sumAcBonusFromEffects(items);

  const spellcastingRaw = system.attributes?.spellcasting;
  const spellcastingAbility: AbilityKey | null = ABILITY_KEYS.includes(spellcastingRaw as AbilityKey)
    ? (spellcastingRaw as AbilityKey)
    : null;

  const deriveInput: DeriveInput = {
    abilityScores,
    abilityProficiencies,
    skills,
    level,
    hitDieSize,
    armorClass: { calc: ac.calc ?? "default", flat: ac.flat ?? null, bonus: acBonus },
    initiativeBonus: Number(system.attributes?.init?.bonus) || 0,
    spellcastingAbility,
  };

  return {
    name,
    level,
    className: classItem?.name ?? null,
    subclassName: subclassItem?.name ?? null,
    species: raceItem?.name ?? null,
    background: backgroundItem?.name ?? null,
    alignment: typeof details.alignment === "string" && details.alignment ? details.alignment : null,
    rawSystem: system,
    items,
    derived: deriveCharacterStats(deriveInput),
    sourceMdHash: hashMdContent(md),
  };
}
