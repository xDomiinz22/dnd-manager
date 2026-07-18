import { z } from "zod";

// Solo dígitos, "d"/"D", +, - y espacios: rechaza cualquier cosa que no sea
// una suma de términos "NdM" o enteros antes de que llegue al roller (ver
// parseDiceFormula más abajo). Sin esto, un formula arbitraria podría
// intentar cosas como paréntesis o texto que el roller no sabe interpretar.
const FORMULA_PATTERN = /^[0-9dD+\-\s]+$/;

export const dieGroupResultSchema = z.object({
  die: z.string(),
  values: z.array(z.number()),
});
export type DieGroupResult = z.infer<typeof dieGroupResultSchema>;

export const createRollSchema = z.object({
  characterId: z.string().nullable().optional(),
  label: z.string().trim().min(1, "Falta una etiqueta para la tirada").max(80),
  formula: z
    .string()
    .trim()
    .min(1, "Falta la fórmula")
    .max(60)
    .regex(FORMULA_PATTERN, "Fórmula de dados no válida"),
  // Presente cuando el dispositivo que tira ya animó los dados 3D con
  // físicas reales (ver DiceOverlay.rollPhysics en el cliente) — el
  // resultado real pasa a ser el que salió en esa física, no uno generado
  // aparte por el servidor. Si falta (reduced-motion, sin WebGL, fallo de
  // dice-box...), el servidor tira él mismo como antes.
  rolls: z.array(dieGroupResultSchema).optional(),
});
export type CreateRollInput = z.infer<typeof createRollSchema>;

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

// --- Parseo de fórmula, compartido entre servidor y cliente -------------
//
// El cliente lo usa para saber qué notación pedirle a dice-box (ver
// DiceOverlay.tsx); el servidor lo usa tanto para tirar él mismo
// (rollFormula en lib/diceRoll.ts) como para validar los valores que manda
// el cliente tras tirar la física real (buildRollFromClientValues).

export class InvalidDiceFormulaError extends Error {}

export interface DiceFormulaGroup {
  sign: 1 | -1;
  count: number;
  faces: number;
}

export interface ParsedDiceFormula {
  groups: DiceFormulaGroup[];
  modifier: number;
}

const TOKEN_PATTERN = /([+-]?)\s*(\d*d\d+|\d+)/gi;
export const MAX_DICE_COUNT = 100;
export const MAX_DIE_FACES = 1000;

export function parseDiceFormula(formula: string): ParsedDiceFormula {
  const groups: DiceFormulaGroup[] = [];
  let modifier = 0;
  let matchedAny = false;

  for (const match of formula.matchAll(TOKEN_PATTERN)) {
    matchedAny = true;
    const sign = match[1] === "-" ? -1 : 1;
    const token = match[2]!.toLowerCase();

    if (token.includes("d")) {
      const [countRaw, facesRaw] = token.split("d");
      const count = Math.min(Math.max(Number(countRaw || "1"), 1), MAX_DICE_COUNT);
      const faces = Math.min(Math.max(Number(facesRaw), 1), MAX_DIE_FACES);
      groups.push({ sign, count, faces });
    } else {
      modifier += sign * Number(token);
    }
  }

  if (!matchedAny) {
    throw new InvalidDiceFormulaError(`Fórmula de dados no válida: "${formula}"`);
  }

  return { groups, modifier };
}

export function diceFormulaGroupLabel(group: DiceFormulaGroup): string {
  return `${group.sign < 0 ? "-" : ""}${group.count}d${group.faces}`;
}
