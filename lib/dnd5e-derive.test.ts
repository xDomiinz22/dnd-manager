import { describe, expect, it } from "vitest";
import {
  abilityModifier,
  avgDieValue,
  deriveCharacterStats,
  maxHitPoints,
  proficiencyBonus,
  type DeriveInput,
} from "./dnd5e-derive";

// Fixture real: XxAlbertoPro01xX, Hechicero (Wild Magic) nivel 4, dragonborn.
// Valores esperados tomados del HTML de referencia (ver prisma/schema Anexo).
const albertoInput: DeriveInput = {
  abilityScores: { str: 8, dex: 15, con: 13, int: 10, wis: 12, cha: 19 },
  abilityProficiencies: { con: true, cha: true },
  skills: [
    { code: "acr", ability: "dex", value: 0 },
    { code: "ani", ability: "wis", value: 0 },
    { code: "arc", ability: "int", value: 1 },
    { code: "ath", ability: "str", value: 0 },
    { code: "dec", ability: "cha", value: 1 },
    { code: "his", ability: "int", value: 0 },
    { code: "ins", ability: "wis", value: 0 },
    { code: "itm", ability: "cha", value: 0 },
    { code: "inv", ability: "int", value: 0 },
    { code: "med", ability: "wis", value: 0 },
    { code: "nat", ability: "int", value: 0 },
    { code: "prc", ability: "wis", value: 0 },
    { code: "prf", ability: "cha", value: 0 },
    { code: "per", ability: "cha", value: 0 },
    { code: "rel", ability: "int", value: 0 },
    { code: "slt", ability: "dex", value: 0 },
    { code: "ste", ability: "dex", value: 0 },
    { code: "sur", ability: "wis", value: 0 },
  ],
  level: 4,
  hitDieSize: 6,
  // system.attributes.ac: { calc: default, flat: null }; +2 viene del active effect
  // "Amateratsu ac" (no deshabilitado) sobre system.attributes.ac.bonus.
  armorClass: { calc: "default", flat: null, bonus: 2 },
  spellcastingAbility: "cha",
};

describe("dnd5e-derive: funciones puras", () => {
  it("abilityModifier redondea hacia abajo", () => {
    expect(abilityModifier(8)).toBe(-1);
    expect(abilityModifier(15)).toBe(2);
    expect(abilityModifier(13)).toBe(1);
    expect(abilityModifier(10)).toBe(0);
    expect(abilityModifier(12)).toBe(1);
    expect(abilityModifier(19)).toBe(4);
  });

  it("proficiencyBonus para nivel 4 es +2", () => {
    expect(proficiencyBonus(4)).toBe(2);
  });

  it("avgDieValue de un d6 es 4", () => {
    expect(avgDieValue(6)).toBe(4);
  });

  it("maxHitPoints: nivel1 = dado máx + CON; siguientes = promedio + CON", () => {
    // 6(max d6) + 1(con) + 3*(4+1) = 7 + 15 = 22
    expect(maxHitPoints(6, 1, 4)).toBe(22);
  });
});

describe("dnd5e-derive: deriveCharacterStats (fixture XxAlbertoPro01xX, nivel 4)", () => {
  const derived = deriveCharacterStats(albertoInput);

  it("bono de competencia", () => {
    expect(derived.proficiencyBonus).toBe(2);
  });

  it("modificadores de característica", () => {
    expect(derived.abilityModifiers).toEqual({ str: -1, dex: 2, con: 1, int: 0, wis: 1, cha: 4 });
  });

  it("tiradas de salvación (Constitución y Carisma son las competentes del Hechicero)", () => {
    expect(derived.savingThrows).toEqual({ str: -1, dex: 2, con: 3, int: 0, wis: 1, cha: 6 });
  });

  it("percepción pasiva", () => {
    expect(derived.passivePerception).toBe(11);
  });

  it("Engaño (Deception, competente)", () => {
    expect(derived.skills.dec?.bonus).toBe(6);
  });

  it("Conocimiento arcano (Arcana, competente)", () => {
    expect(derived.skills.arc?.bonus).toBe(2);
  });

  it("aptitud de conjuro: Carisma", () => {
    expect(derived.spellcastingAbility).toBe("cha");
  });

  it("clase de armadura (10 + DEX + bonus de efectos activos)", () => {
    expect(derived.armorClass).toEqual({ computed: 14, needsOverride: false });
  });

  it("puntos de golpe máximos", () => {
    expect(derived.hitPoints.max).toBe(22);
  });
});
