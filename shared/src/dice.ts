import { z } from "zod";

// Solo dígitos, "d"/"D", +, - y espacios: rechaza cualquier cosa que no sea
// una suma de términos "NdM" o enteros antes de que llegue al roller (ver
// lib/diceRoll.ts). Sin esto, un formula arbitraria podría intentar cosas
// como paréntesis o texto que el roller no sabe interpretar.
const FORMULA_PATTERN = /^[0-9dD+\-\s]+$/;

export const createRollSchema = z.object({
  characterId: z.string().nullable().optional(),
  label: z.string().trim().min(1, "Falta una etiqueta para la tirada").max(80),
  formula: z
    .string()
    .trim()
    .min(1, "Falta la fórmula")
    .max(60)
    .regex(FORMULA_PATTERN, "Fórmula de dados no válida"),
});
export type CreateRollInput = z.infer<typeof createRollSchema>;

export const dieGroupResultSchema = z.object({
  die: z.string(),
  values: z.array(z.number()),
});
export type DieGroupResult = z.infer<typeof dieGroupResultSchema>;

export const diceRollSchema = z.object({
  id: z.string(),
  characterId: z.string().nullable(),
  characterName: z.string().nullable(),
  userId: z.string(),
  username: z.string(),
  label: z.string(),
  formula: z.string(),
  rolls: z.array(dieGroupResultSchema),
  modifier: z.number(),
  total: z.number(),
  createdAt: z.string(),
});
export type DiceRollDto = z.infer<typeof diceRollSchema>;

export const diceRollListSchema = z.array(diceRollSchema);
