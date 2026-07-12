import { z } from "zod";
import { assetSchema } from "./assets";

export const abilityKeySchema = z.enum(["str", "dex", "con", "int", "wis", "cha"]);
export type AbilityKey = z.infer<typeof abilityKeySchema>;

// Desglose de multiclase (nombre de clase + su propio nivel). `CharacterSheet.className`/
// `level` solo guardan la clase "original" + la suma total de niveles.
export const classLevelSchema = z.object({
  name: z.string(),
  level: z.number(),
});
export type ClassLevel = z.infer<typeof classLevelSchema>;

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
  md: z.string().min(1, "Pega el contenido del .md"),
  ownerId: z.string().optional(),
  portraitAssetId: z.string().optional(),
});
export type ImportCharacterInput = z.infer<typeof importCharacterSchema>;

export const importCharacterMdSchema = z.object({
  md: z.string().min(1, "Pega el contenido del .md"),
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

export const updateHpSchema = z.object({
  currentHp: z.number().int().min(0, "Los PG no pueden ser negativos"),
});
export type UpdateHpInput = z.infer<typeof updateHpSchema>;

export const SPELL_SLOT_LEVELS = [1, 2, 3, 4, 5, 6, 7] as const;
export const spellSlotLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
]);
export type SpellSlotLevel = z.infer<typeof spellSlotLevelSchema>;

export const spellSlotSchema = z.object({
  used: z.number().int().min(0),
  max: z.number().int().min(0),
});
export type SpellSlot = z.infer<typeof spellSlotSchema>;

export const spellSlotsSchema = z.object({
  1: spellSlotSchema,
  2: spellSlotSchema,
  3: spellSlotSchema,
  4: spellSlotSchema,
  5: spellSlotSchema,
  6: spellSlotSchema,
  7: spellSlotSchema,
});
export type SpellSlots = z.infer<typeof spellSlotsSchema>;

export const updateSpellSlotSchema = z
  .object({
    level: spellSlotLevelSchema,
    used: z.number().int().min(0, "No puede ser negativo").optional(),
    max: z.number().int().min(0, "No puede ser negativo").optional(),
  })
  .refine((v) => v.used !== undefined || v.max !== undefined, {
    message: "Indica al menos usados o máximo",
  });
export type UpdateSpellSlotInput = z.infer<typeof updateSpellSlotSchema>;

export const characterFullSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  groupId: z.string(),
  name: z.string(),
  level: z.number(),
  className: z.string().nullable(),
  classes: z.array(classLevelSchema),
  subclassName: z.string().nullable(),
  species: z.string().nullable(),
  background: z.string().nullable(),
  alignment: z.string().nullable(),
  portraitUrl: z.string().nullable(),
  portraitAssetId: z.string().nullable(),
  currentHp: z.number(),
  spellSlots: spellSlotsSchema,
  rawSystem: z.unknown(),
  items: z.unknown(),
  derived: derivedStatsSchema,
  sourceMdHash: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CharacterFull = z.infer<typeof characterFullSchema>;

export const characterLimitedSchema = z.object({
  id: z.string(),
  name: z.string(),
  portraitUrl: z.string().nullable(),
});
export type CharacterLimited = z.infer<typeof characterLimitedSchema>;

// GET /characters/:id: FULL para el Master del grupo o el dueño, LIMITED para
// el resto de miembros (solo nombre + foto). `access` deja explícito cuál es
// para que el frontend no tenga que adivinarlo por la forma del objeto.
export const characterViewSchema = z.discriminatedUnion("access", [
  z.object({ access: z.literal("FULL"), character: characterFullSchema }),
  z.object({ access: z.literal("LIMITED"), character: characterLimitedSchema }),
]);
export type CharacterView = z.infer<typeof characterViewSchema>;

export const characterListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.number(),
  className: z.string().nullable(),
  classes: z.array(classLevelSchema),
  groupId: z.string(),
  groupName: z.string(),
  portraitUrl: z.string().nullable(),
});
export type CharacterListItem = z.infer<typeof characterListItemSchema>;

export const duplicateCharacterSchema = z.object({
  targetGroupId: z.string(),
});
export type DuplicateCharacterInput = z.infer<typeof duplicateCharacterSchema>;

export const uploadCharacterImageResponseSchema = z.object({
  asset: assetSchema,
  character: characterFullSchema,
});
export type UploadCharacterImageResponse = z.infer<typeof uploadCharacterImageResponseSchema>;
