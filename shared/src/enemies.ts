import { z } from "zod";
import { assetSchema } from "./assets";
import { derivedStatsSchema } from "./characters";
import { FORMULA_PATTERN } from "./dice";

export const quickAttackSchema = z.object({
  name: z.string().trim().min(1, "Falta el nombre del ataque").max(80),
  attackFormula: z
    .string()
    .trim()
    .min(1, "Falta la fórmula de ataque")
    .max(60)
    .regex(FORMULA_PATTERN, "Fórmula de dados no válida"),
  damageFormula: z
    .string()
    .trim()
    .max(60)
    .regex(FORMULA_PATTERN, "Fórmula de dados no válida")
    .nullable(),
});
export type QuickAttack = z.infer<typeof quickAttackSchema>;

export const createEnemySchema = z.object({
  name: z.string().trim().min(1, "El nombre no puede estar vacío").max(100),
  maxHp: z.number().int().min(1, "Los PG deben ser al menos 1"),
  armorClass: z.number().int().nullable().optional(),
  initiativeBonus: z.number().int(),
  quickAttacks: z.array(quickAttackSchema).max(20),
  portraitAssetId: z.string().optional(),
});
export type CreateEnemyInput = z.infer<typeof createEnemySchema>;

export const updateEnemySchema = createEnemySchema.partial();
export type UpdateEnemyInput = z.infer<typeof updateEnemySchema>;

export const importEnemySchema = z.object({
  md: z.string().min(1, "Pega el contenido del .md"),
  portraitAssetId: z.string().optional(),
});
export type ImportEnemyInput = z.infer<typeof importEnemySchema>;

export const importEnemyMdSchema = z.object({
  md: z.string().min(1, "Pega el contenido del .md"),
});
export type ImportEnemyMdInput = z.infer<typeof importEnemyMdSchema>;

// Ficha completa: solo la ve el Master (creación/edición/uso de ataques en combate).
export const enemyFullSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  name: z.string(),
  maxHp: z.number(),
  armorClass: z.number().nullable(),
  initiativeBonus: z.number(),
  portraitUrl: z.string().nullable(),
  portraitAssetId: z.string().nullable(),
  quickAttacks: z.array(quickAttackSchema).nullable(),
  rawSystem: z.unknown().nullable(),
  items: z.unknown().nullable(),
  derived: derivedStatsSchema.nullable(),
  sourceMdHash: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EnemyFull = z.infer<typeof enemyFullSchema>;

// Entrada reducida para jugadores normales: solo foto + nombre, nunca stats
// ni ataques (regla de negocio — "los usuarios normales podran solamente ver
// su foto"), mismo patrón que characterRosterEntrySchema en shared/src/groups.ts.
export const enemyRosterEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  portraitUrl: z.string().nullable(),
});
export type EnemyRosterEntry = z.infer<typeof enemyRosterEntrySchema>;

export const enemyListItemSchema = z.discriminatedUnion("access", [
  z.object({ access: z.literal("FULL"), enemy: enemyFullSchema }),
  z.object({ access: z.literal("LIMITED"), enemy: enemyRosterEntrySchema }),
]);
export type EnemyListItem = z.infer<typeof enemyListItemSchema>;

export const uploadEnemyImageResponseSchema = z.object({
  asset: assetSchema,
  enemy: enemyFullSchema,
});
export type UploadEnemyImageResponse = z.infer<typeof uploadEnemyImageResponseSchema>;
