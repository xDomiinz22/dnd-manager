export class InvalidDiceFormulaError extends Error {}

export interface DieGroupResult {
  die: string;
  values: number[];
}

export interface DiceRollResult {
  rolls: DieGroupResult[];
  modifier: number;
  total: number;
}

// Solo términos "NdM" (dado) o enteros, unidos por + / -. Cualquier otra cosa
// (paréntesis, multiplicación, referencias @mod sin resolver...) se rechaza
// antes de llegar aquí — ver createRollSchema en shared/src/dice.ts.
const TOKEN_PATTERN = /([+-]?)\s*(\d*d\d+|\d+)/gi;
const MAX_DICE_COUNT = 100;
const MAX_DIE_FACES = 1000;

function rollDie(faces: number): number {
  return 1 + Math.floor(Math.random() * faces);
}

/**
 * Tira una fórmula tipo "1d20+5" o "2d6+1d4-1" contra dados reales
 * (Math.random, no criptográfico — esto es una tirada de mesa, no algo que
 * necesite resistir manipulación de un atacante con acceso al proceso).
 * Lanza InvalidDiceFormulaError si la fórmula no tiene ningún término válido.
 */
export function rollFormula(formula: string): DiceRollResult {
  const rolls: DieGroupResult[] = [];
  let modifier = 0;
  let total = 0;
  let matchedAny = false;

  for (const match of formula.matchAll(TOKEN_PATTERN)) {
    matchedAny = true;
    const sign = match[1] === "-" ? -1 : 1;
    const token = match[2]!.toLowerCase();

    if (token.includes("d")) {
      const [countRaw, facesRaw] = token.split("d");
      const count = Math.min(Math.max(Number(countRaw || "1"), 1), MAX_DICE_COUNT);
      const faces = Math.min(Math.max(Number(facesRaw), 1), MAX_DIE_FACES);
      const values = Array.from({ length: count }, () => rollDie(faces));
      const groupTotal = values.reduce((a, b) => a + b, 0);
      total += sign * groupTotal;
      rolls.push({ die: `${sign < 0 ? "-" : ""}${count}d${faces}`, values });
    } else {
      const value = Number(token);
      modifier += sign * value;
      total += sign * value;
    }
  }

  if (!matchedAny) {
    throw new InvalidDiceFormulaError(`Fórmula de dados no válida: "${formula}"`);
  }

  return { rolls, modifier, total };
}
