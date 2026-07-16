import { describe, expect, it, vi } from "vitest";
import { InvalidDiceFormulaError, rollFormula } from "./diceRoll";

describe("rollFormula", () => {
  it("suma dado + modificador positivo", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.65); // 1 + floor(0.65*20) = 14
    const result = rollFormula("1d20+5");
    expect(result.rolls).toEqual([{ die: "1d20", values: [14] }]);
    expect(result.modifier).toBe(5);
    expect(result.total).toBe(19);
    vi.restoreAllMocks();
  });

  it("soporta varios grupos de dados y un modificador negativo", () => {
    const values = [0.0, 0.99, 0.5]; // 1, 6, 4 en un d6 (1+floor(x*6))
    let i = 0;
    vi.spyOn(Math, "random").mockImplementation(() => values[i++]!);
    const result = rollFormula("2d6-1");
    expect(result.rolls).toEqual([{ die: "2d6", values: [1, 6] }]);
    expect(result.modifier).toBe(-1);
    expect(result.total).toBe(1 + 6 - 1);
    vi.restoreAllMocks();
  });

  it("resta el resultado de un grupo de dados con signo negativo", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // 1 + floor(0.5*20) = 11, 1 + floor(0.5*4) = 3
    const result = rollFormula("1d20-1d4");
    expect(result.rolls).toEqual([
      { die: "1d20", values: [11] },
      { die: "-1d4", values: [3] },
    ]);
    expect(result.total).toBe(11 - 3);
    vi.restoreAllMocks();
  });

  it("limita el número de dados y las caras a un máximo razonable", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = rollFormula("9999d9999");
    expect(result.rolls[0]!.values).toHaveLength(100);
    expect(result.rolls[0]!.die).toBe("100d1000");
    vi.restoreAllMocks();
  });

  it("lanza InvalidDiceFormulaError si no hay ningún término válido", () => {
    expect(() => rollFormula("abc")).toThrow(InvalidDiceFormulaError);
  });
});
