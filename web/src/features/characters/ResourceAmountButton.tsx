import { useState, type ReactNode } from "react";
import { evaluateFormula, type RollData } from "./formulaEval";

export interface ResourceScalingAction {
  formula: string;
  rollData: RollData;
  min: number;
  max: number;
}

/**
 * Botón para rasgos "gasta N puntos de una reserva, recibe N" (A5, p.ej.
 * Imponer las Manos) — un campo numérico entre `min` y `max` sustituye al
 * `<select>` de nivel de `ScalableDamageButton` (aquí no hay huecos
 * discretos, el jugador elige libremente cuánto gastar). Por defecto se
 * propone el máximo disponible (gastar todo lo que quede de la reserva).
 */
export function ResourceAmountButton({
  label,
  action,
  onRoll,
  renderButton,
}: {
  label: string;
  action: ResourceScalingAction;
  onRoll: (label: string, formula: string) => void;
  renderButton: (formula: string, onClick: () => void) => ReactNode;
}) {
  const [amount, setAmount] = useState(action.max);
  const formula = String(evaluateFormula(action.formula, { ...action.rollData, scaling: amount }));

  return (
    <span className="inline-flex items-center gap-1">
      {renderButton(formula, () => onRoll(label, formula))}
      <input
        type="number"
        min={action.min}
        max={action.max}
        value={amount}
        onChange={(e) => {
          const next = Number(e.target.value);
          setAmount(
            Number.isFinite(next) ? Math.min(action.max, Math.max(action.min, next)) : action.min,
          );
        }}
        aria-label="Puntos a gastar"
        title={`Elige cuánto gastar (entre ${action.min} y ${action.max})`}
        className="w-14 rounded-sm border border-rule-strong bg-parchment px-1 py-0.5 text-xs text-ink outline-none focus:border-oxblood"
      />
    </span>
  );
}
