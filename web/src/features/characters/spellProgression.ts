import { asFoundryItems } from "./foundryDisplay";

/**
 * Tabla de huecos de conjuro por nivel de lanzador (A13 de la guía de
 * escalados) — `SPELL_SLOT_TABLE[casterLevel-1][i]` = huecos de nivel `i+1`.
 * Nada de esto viene en el `.md` (`spells.spellN` solo trae `value` =
 * restantes, nunca el máximo real), hay que calcularlo.
 */
const SPELL_SLOT_TABLE: readonly (readonly number[])[] = [
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

/** Magia de Pacto (Brujo) — tabla INDEPENDIENTE, no se mezcla con el nivel de lanzador normal. */
const PACT_TABLE: Record<number, { slots: number; level: number }> = {
  1: { slots: 1, level: 1 },
  2: { slots: 2, level: 1 },
  3: { slots: 2, level: 2 },
  5: { slots: 2, level: 3 },
  7: { slots: 2, level: 4 },
  9: { slots: 2, level: 5 },
  11: { slots: 3, level: 5 },
  17: { slots: 4, level: 5 },
};

interface Progression {
  divisor: number;
  /** Reglas 2024 (única política que aplicamos, ver §14 de la guía): half/artificer redondean arriba. */
  roundUp: boolean;
}

const PROGRESSIONS: Record<string, Progression> = {
  full: { divisor: 1, roundUp: false },
  half: { divisor: 2, roundUp: true },
  third: { divisor: 3, roundUp: false },
  artificer: { divisor: 2, roundUp: true },
};

export interface SpellSlotsResult {
  /** `slots[i]` = huecos de nivel `i+1`. Vacío si el personaje no lanza conjuros con hueco. */
  slots: number[];
  pact: { slots: number; level: number } | null;
}

/**
 * Nivel de lanzador + huecos (A13). Suma por clase `redondeo(levels / divisor)`;
 * excepción: con una única clase lanzadora de progresión no-completa, el
 * redondeo es SIEMPRE hacia arriba (no solo para half/artificer).
 */
export function computeSpellSlots(items: unknown): SpellSlotsResult {
  const classItems = asFoundryItems(items).filter((item) => item.type === "class");
  const spellCasters = classItems.filter((item) => {
    const progression = item.system?.spellcasting?.progression;
    return typeof progression === "string" && progression in PROGRESSIONS;
  });
  const pactCaster = classItems.find((item) => item.system?.spellcasting?.progression === "pact");

  let casterLevel = 0;
  if (spellCasters.length === 1) {
    const item = spellCasters[0]!;
    const progression = PROGRESSIONS[item.system?.spellcasting?.progression as string]!;
    const levels = Number(item.system?.levels) || 0;
    casterLevel = progression.divisor > 1 ? Math.ceil(levels / progression.divisor) : levels;
  } else {
    for (const item of spellCasters) {
      const progression = PROGRESSIONS[item.system?.spellcasting?.progression as string]!;
      const levels = Number(item.system?.levels) || 0;
      const value = levels / progression.divisor;
      casterLevel += progression.roundUp ? Math.ceil(value) : Math.floor(value);
    }
  }

  const slots = casterLevel > 0 ? [...(SPELL_SLOT_TABLE[Math.min(casterLevel, 20) - 1] ?? [])] : [];

  let pact: SpellSlotsResult["pact"] = null;
  if (pactCaster) {
    const warlockLevel = Number(pactCaster.system?.levels) || 0;
    const keys = Object.keys(PACT_TABLE)
      .map(Number)
      .filter((key) => key <= warlockLevel)
      .sort((a, b) => a - b);
    if (keys.length > 0) pact = PACT_TABLE[keys[keys.length - 1]!]!;
  }

  return { slots, pact };
}

/** Nivel de hueco más alto al que el personaje puede realmente lanzar (huecos normales o de pacto). */
export function maxCastableSpellLevel(result: SpellSlotsResult): number {
  let max = 0;
  result.slots.forEach((count, index) => {
    if (count > 0) max = Math.max(max, index + 1);
  });
  if (result.pact && result.pact.slots > 0) max = Math.max(max, result.pact.level);
  return max;
}

/**
 * `SpellData#canScale` (§5.0.b de la guía): solo se puede subir de nivel un
 * conjuro lanzado con un hueco real. `atwill`/`innate`/`ritual` se lanzan
 * sin gastar hueco — no hay nada que subir, aunque el conjuro sea de nivel
 * 1+. Afecta a 5 conjuros reales de las fichas de ejemplo (Ray of Sickness
 * entre ellos, en Lilith).
 */
export function canUpcastSpell(method: string | undefined): boolean {
  return method === "spell" || method === "pact";
}
