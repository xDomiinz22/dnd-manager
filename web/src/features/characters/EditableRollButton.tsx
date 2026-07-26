import { useState, type ReactNode } from "react";

/**
 * Envuelve cualquier botón de tirada (ataque/daño/curación, ya sea fijo o
 * calculado por `ScalableDamageButton`/`ResourceAmountButton`) con un lápiz
 * para escribir la fórmula a mano antes de tirar. El motor de escalado
 * (rollableActions.ts) cubre lo verificable contra datos reales, pero no
 * todo hechizo/rasgo homebrew o mal etiquetado en el `.md` calcula bien —
 * en vez de perseguir cada caso, se deja que el jugador lea la descripción
 * y corrija la fórmula él mismo, partiendo siempre del cálculo automático
 * como valor de arranque (no en blanco).
 */
export function EditableRollButton({
  formula,
  onRoll,
  renderButton,
}: {
  formula: string;
  onRoll: (formula: string) => void;
  renderButton: (formula: string, onClick: () => void) => ReactNode;
}) {
  // `override` es `null` mientras no se haya tocado nada — en ese estado se
  // sigue el cálculo automático (`formula`) aunque cambie por debajo (p.ej.
  // al subir el nivel de hueco en ScalableDamageButton). En cuanto el
  // usuario edita y confirma, el valor escrito "gana" y ya no se sincroniza
  // solo — hasta que pulse el botón de reset, que lo vuelve a poner en `null`.
  const [override, setOverride] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const effectiveFormula = override ?? formula;

  if (isEditing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          type="text"
          defaultValue={effectiveFormula}
          onChange={(e) => setOverride(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setIsEditing(false)}
          autoFocus
          aria-label="Fórmula de la tirada"
          className="w-28 rounded-sm border border-rule-strong bg-parchment px-1 py-0.5 text-xs text-ink outline-none focus:border-oxblood"
        />
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="text-xs text-oxblood hover:underline"
        >
          OK
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5">
      {renderButton(effectiveFormula, () => onRoll(effectiveFormula))}
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="px-0.5 text-[0.7rem] text-ink-muted hover:text-oxblood"
        aria-label="Editar fórmula a mano"
        title="Editar la fórmula a mano (p.ej. si la descripción dice algo distinto)"
      >
        ✏️
      </button>
      {override !== null && (
        <button
          type="button"
          onClick={() => setOverride(null)}
          className="px-0.5 text-[0.7rem] text-ink-muted hover:text-oxblood"
          aria-label="Volver al cálculo automático"
          title="Descartar la fórmula manual y volver al cálculo automático"
        >
          ↺
        </button>
      )}
    </span>
  );
}
