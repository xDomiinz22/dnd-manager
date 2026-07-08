import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseFoundryMd } from "./foundryParser";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(__dirname, "../../fixtures/XxAlbertoPro01xX.md");
const fixtureMd = readFileSync(fixturePath, "utf-8");

describe("parseFoundryMd (fixture real XxAlbertoPro01xX.md)", () => {
  const parsed = parseFoundryMd(fixtureMd);

  it("nombre", () => {
    expect(parsed.name).toBe("XxAlbertoPro01xX");
  });

  it("nivel total (suma de items type: class)", () => {
    expect(parsed.level).toBe(4);
  });

  it("clase resuelta por details.originalClass", () => {
    expect(parsed.className).toBe("Hechicero");
  });

  it("subclase resuelta por classIdentifier", () => {
    expect(parsed.subclassName).toBe("Wild Magic Sorcery");
  });

  it("especie resuelta por details.race", () => {
    expect(parsed.species).toBe("Dragonborn (Draconblood; Red) (EGW)");
  });

  it("background ausente se tolera como null", () => {
    expect(parsed.background).toBeNull();
  });

  it("sourceMdHash es determinista", () => {
    const again = parseFoundryMd(fixtureMd);
    expect(again.sourceMdHash).toBe(parsed.sourceMdHash);
    expect(parsed.sourceMdHash).toHaveLength(64);
  });

  it("guarda rawSystem e items completos", () => {
    expect(parsed.rawSystem.abilities.cha.value).toBe(19);
    expect(Array.isArray(parsed.items)).toBe(true);
    expect(parsed.items.length).toBeGreaterThan(0);
  });

  it("derived: toda la tabla de aceptación", () => {
    expect(parsed.derived.proficiencyBonus).toBe(2);
    expect(parsed.derived.abilityModifiers).toEqual({ str: -1, dex: 2, con: 1, int: 0, wis: 1, cha: 4 });
    expect(parsed.derived.savingThrows).toEqual({ str: -1, dex: 2, con: 3, int: 0, wis: 1, cha: 6 });
    expect(parsed.derived.passivePerception).toBe(11);
    expect(parsed.derived.skills.dec?.bonus).toBe(6);
    expect(parsed.derived.skills.arc?.bonus).toBe(2);
    expect(parsed.derived.spellcastingAbility).toBe("cha");
    expect(parsed.derived.armorClass.computed).toBe(14);
    expect(parsed.derived.hitPoints.max).toBe(22);
  });
});
