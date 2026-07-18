import {
  parseDiceFormula,
  diceFormulaGroupLabel,
  InvalidDiceFormulaError,
  type DieGroupResult,
} from "@dnd-manager/shared";

export { InvalidDiceFormulaError };
export type { DieGroupResult };

export interface DiceRollResult {
  rolls: DieGroupResult[];
  modifier: number;
  total: number;
}

function rollDie(faces: number): number {
  return 1 + Math.floor(Math.random() * faces);
}

/**
 * Tira una fórmula tipo "1d20+5" o "2d6+1d4-1" contra dados reales
 * (Math.random, no criptográfico — esto es una tirada de mesa, no algo que
 * necesite resistir manipulación de un atacante con acceso al proceso).
 * Fallback para cuando el cliente no manda su propia tirada física (ver
 * buildRollFromClientValues) — reduced-motion, sin WebGL, fallo de
 * dice-box... Lanza InvalidDiceFormulaError si la fórmula no tiene ningún
 * término válido.
 */
export function rollFormula(formula: string): DiceRollResult {
  const { groups, modifier } = parseDiceFormula(formula);
  let total = modifier;

  const rolls = groups.map((group) => {
    const values = Array.from({ length: group.count }, () => rollDie(group.faces));
    total += group.sign * values.reduce((a, b) => a + b, 0);
    return { die: diceFormulaGroupLabel(group), values };
  });

  return { rolls, modifier, total };
}

/**
 * El dispositivo que tira ya animó los dados 3D con físicas reales (ver
 * DiceOverlay.rollPhysics en el cliente) y manda los valores que salieron —
 * el resultado real pasa a ser ese, no uno generado aparte aquí. Aun así se
 * valida que cuadre con la fórmula (mismo número de dados, mismo tipo, cada
 * valor dentro del rango de caras) para que no se pueda mandar cualquier
 * resultado por API directamente.
 */
export function buildRollFromClientValues(
  formula: string,
  clientRolls: DieGroupResult[],
): DiceRollResult {
  const { groups, modifier } = parseDiceFormula(formula);

  if (clientRolls.length !== groups.length) {
    throw new InvalidDiceFormulaError("La tirada recibida no coincide con la fórmula");
  }

  let total = modifier;
  const rolls = groups.map((group, i) => {
    const client = clientRolls[i]!;
    const expectedDie = diceFormulaGroupLabel(group);
    if (client.die !== expectedDie || client.values.length !== group.count) {
      throw new InvalidDiceFormulaError("La tirada recibida no coincide con la fórmula");
    }
    for (const value of client.values) {
      if (!Number.isInteger(value) || value < 1 || value > group.faces) {
        throw new InvalidDiceFormulaError("Valor de dado fuera de rango");
      }
    }
    total += group.sign * client.values.reduce((a, b) => a + b, 0);
    return { die: expectedDie, values: client.values };
  });

  return { rolls, modifier, total };
}
