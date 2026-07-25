import type { CombatEffectBonuses } from "@dnd-manager/shared";
import type { FoundryItem } from "./foundryDisplay";

export interface DetectedItemEffect {
  name: string;
  roundsRemaining: number;
  bonuses: CombatEffectBonuses;
  /** Nº de `changes` del efecto que NO se reconocieron (resistencias, flags de otros módulos, skills...) — nunca se inventan, solo se cuentan para avisar. */
  unrecognizedChangeCount: number;
}

// 1 ronda = 6s en 5e — mismas unidades observadas en `effect.duration.units`
// de los 4 `.md` de ejemplo (seconds/hour), más las variantes singulares/
// round-turn por si aparecen en otras fichas.
const DURATION_UNIT_TO_ROUNDS: Record<string, number> = {
  round: 1,
  rounds: 1,
  turn: 1,
  turns: 1,
  second: 1 / 6,
  seconds: 1 / 6,
  minute: 10,
  minutes: 10,
  hour: 600,
  hours: 600,
  day: 14400,
  days: 14400,
};

function roundsFromDuration(value: unknown, units: unknown): number | null {
  if (typeof value !== "number" || value <= 0) return null;
  if (typeof units !== "string") return null;
  const factor = DURATION_UNIT_TO_ROUNDS[units];
  if (!factor) return null;
  return Math.max(1, Math.round(value * factor));
}

const BONUS_KEY_PATTERN = /^system\.bonuses\.(mwak|rwak|msak|rsak)\.(attack|damage)$/;
const SPELL_DC_KEY = "system.bonuses.spell.dc";

interface EffectChange {
  key?: unknown;
  value?: unknown;
  type?: unknown;
}

/**
 * Extrae los bonos reconocibles de `effect.system.changes` (ojo: anidados
 * en `system`, no en la raíz del efecto — así vienen en los 4 `.md` de
 * ejemplo). Solo se aceptan `changes` con `type: "add"` — los demás modos
 * (override/upgrade/downgrade/multiply) son más difíciles de razonar de
 * forma segura y se cuentan como no reconocidos en vez de aplicarse.
 */
function extractBonuses(changes: unknown): {
  bonuses: CombatEffectBonuses;
  unrecognizedCount: number;
} {
  const bonuses: CombatEffectBonuses = {};
  let unrecognizedCount = 0;
  if (!Array.isArray(changes)) return { bonuses, unrecognizedCount };

  for (const raw of changes as EffectChange[]) {
    const key = raw?.key;
    const value = raw?.value;
    if (typeof key !== "string" || typeof value !== "string" || raw?.type !== "add") {
      unrecognizedCount++;
      continue;
    }
    if (key === SPELL_DC_KEY) {
      bonuses.spellDc = value;
      continue;
    }
    const match = key.match(BONUS_KEY_PATTERN);
    if (!match) {
      unrecognizedCount++;
      continue;
    }
    const actionType = match[1] as "mwak" | "rwak" | "msak" | "rsak";
    const field = match[2] as "attack" | "damage";
    bonuses[actionType] = { ...bonuses[actionType], [field]: value };
  }

  return { bonuses, unrecognizedCount };
}

function hasAnyBonus(bonuses: CombatEffectBonuses): boolean {
  return !!(bonuses.mwak || bonuses.rwak || bonuses.msak || bonuses.rsak || bonuses.spellDc);
}

/**
 * Busca en `item.effects` (Active Effects crudos de Foundry) el primero que
 * traiga una duración numérica válida Y al menos un bono reconocible — el
 * flag `disabled` se ignora a propósito: en los datos reales (Furia del
 * Bárbaro, Arma de Pacto) siempre viene `true` porque es Foundry quien lo
 * activa/desactiva en vivo, no es una señal fiable de si aplica ahora.
 */
export function detectItemEffect(item: FoundryItem): DetectedItemEffect | null {
  const effects = item.effects;
  if (!Array.isArray(effects)) return null;

  for (const effect of effects) {
    const roundsRemaining = roundsFromDuration(effect?.duration?.value, effect?.duration?.units);
    if (roundsRemaining === null) continue;

    const { bonuses, unrecognizedCount } = extractBonuses(effect?.system?.changes);
    if (!hasAnyBonus(bonuses)) continue;

    const name =
      typeof effect?.name === "string" && effect.name ? effect.name : (item.name ?? "Efecto");
    return { name, roundsRemaining, bonuses, unrecognizedChangeCount: unrecognizedCount };
  }

  return null;
}
