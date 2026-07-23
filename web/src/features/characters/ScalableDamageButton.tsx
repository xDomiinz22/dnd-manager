import { useState, type ReactNode } from "react";
import { SPELL_SLOT_LEVELS } from "@dnd-manager/shared";

/** "1d8" o "1d6+1d4" → multiplica cada NdM por `times` (formato que nosotros mismos construimos, no texto libre). */
function multiplyDiceFormula(perLevelFormula: string, times: number): string {
  return perLevelFormula.replace(
    /(\d+)d(\d+)/g,
    (_match, n: string, m: string) => `${Number(n) * times}d${m}`,
  );
}

export interface ScalableDamageAction {
  damageFormula: string | null;
  damageScalingPerLevel: string | null;
  spellBaseLevel: number | null;
}

/**
 * Botón de "Daño" para una activity que puede escalar al lanzarse con un
 * hueco de conjuro de nivel superior (ver rollableActions.ts). Si la
 * activity no escala, es un botón normal; si escala, añade un desplegable
 * de nivel al lado (por defecto el nivel base del conjuro, igual que
 * tirarlo "tal cual") y recalcula la fórmula sumando los dados extra por
 * cada nivel por encima del base justo antes de tirar. El botón en sí lo
 * pinta el caller (`renderButton`) para respetar el estilo de cada sitio
 * (ficha, chat, combate) en vez de imponer uno propio.
 */
export function ScalableDamageButton({
  label,
  action,
  onRoll,
  renderButton,
}: {
  label: string;
  action: ScalableDamageAction;
  onRoll: (label: string, formula: string) => void;
  renderButton: (formula: string, onClick: () => void) => ReactNode;
}) {
  const baseLevel = action.spellBaseLevel ?? 1;
  const [level, setLevel] = useState(baseLevel);

  if (!action.damageFormula) return null;

  const scalable = !!action.damageScalingPerLevel && action.spellBaseLevel !== null;
  const extraSteps = level - baseLevel;
  const formula =
    scalable && extraSteps > 0
      ? `${action.damageFormula}+${multiplyDiceFormula(action.damageScalingPerLevel!, extraSteps)}`
      : action.damageFormula;

  return (
    <span className="inline-flex items-center gap-1">
      {renderButton(formula, () => onRoll(label, formula))}
      {scalable && (
        <select
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          aria-label="Nivel del hueco de conjuro"
          title="Tirar como si se lanzara con un hueco de este nivel"
          className="rounded-sm border border-rule-strong bg-parchment px-1 py-0.5 text-xs text-ink outline-none focus:border-oxblood"
        >
          {SPELL_SLOT_LEVELS.filter((l) => l >= baseLevel).map((l) => (
            <option key={l} value={l}>
              Nv {l}
            </option>
          ))}
        </select>
      )}
    </span>
  );
}
