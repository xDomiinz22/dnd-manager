import { z } from "zod";

export const abilityKeySchema = z.enum(["str", "dex", "con", "int", "wis", "cha"]);
export type AbilityKey = z.infer<typeof abilityKeySchema>;

const abilityRecordSchema = z.object({
  str: z.number(),
  dex: z.number(),
  con: z.number(),
  int: z.number(),
  wis: z.number(),
  cha: z.number(),
});

export const skillResultSchema = z.object({
  ability: abilityKeySchema,
  value: z.number(),
  bonus: z.number(),
  passive: z.number(),
});

export const armorClassResultSchema = z.object({
  computed: z.number().nullable(),
  needsOverride: z.boolean(),
  override: z.number().nullable().optional(),
});

export const derivedStatsSchema = z.object({
  proficiencyBonus: z.number(),
  abilityModifiers: abilityRecordSchema,
  savingThrows: abilityRecordSchema,
  skills: z.record(z.string(), skillResultSchema),
  passivePerception: z.number(),
  initiative: z.number(),
  hitPoints: z.object({ max: z.number(), override: z.number().nullable().optional() }),
  armorClass: armorClassResultSchema,
  spellcastingAbility: abilityKeySchema.nullable(),
});
export type DerivedStats = z.infer<typeof derivedStatsSchema>;

export const importCharacterSchema = z.object({
  md: z.string().min(1),
  ownerId: z.string().optional(),
  portraitAssetId: z.string().optional(),
});
export type ImportCharacterInput = z.infer<typeof importCharacterSchema>;

export const importCharacterMdSchema = z.object({
  md: z.string().min(1),
});
export type ImportCharacterMdInput = z.infer<typeof importCharacterMdSchema>;

export const reassignOwnerSchema = z.object({
  ownerId: z.string(),
});
export type ReassignOwnerInput = z.infer<typeof reassignOwnerSchema>;

export const changePortraitSchema = z.object({
  assetId: z.string(),
});
export type ChangePortraitInput = z.infer<typeof changePortraitSchema>;

export const characterFullSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  groupId: z.string(),
  name: z.string(),
  level: z.number(),
  className: z.string().nullable(),
  subclassName: z.string().nullable(),
  species: z.string().nullable(),
  background: z.string().nullable(),
  alignment: z.string().nullable(),
  portraitUrl: z.string().nullable(),
  rawSystem: z.unknown(),
  items: z.unknown(),
  derived: derivedStatsSchema,
  sourceMdHash: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CharacterFull = z.infer<typeof characterFullSchema>;
