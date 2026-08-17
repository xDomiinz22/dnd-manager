import { useRef, useState, type ReactNode } from "react";
import type { AnimatedIconHandle } from "../../components/icons/types";
import PenIcon from "../../components/icons/pen-icon";
import SaveIcon from "../../components/icons/save-icon";
import ArrowBackUpIcon from "../../components/icons/arrow-back-up-icon";

/**
 * Envuelve cualquier botón de tirada (ataque/daño/curación, ya sea fijo o
 * calculado por `ScalableDamageButton`/`ResourceAmountButton`) con un lápiz
 * para escribir la fórmula a mano antes de tirar. El motor de escalado
 * (rollableActions.ts) cubre lo verificable contra datos reales, pero no
 * todo hechizo/rasgo homebrew o mal etiquetado en el `.md` calcula bien —
 * en vez de perseguir cada caso, se deja que el jugador lea la descripción
 * y corrija la fórmula él mismo, partiendo siempre del cálculo automático
 * como valor de arranque (no en blanco).
 *
 * `onSave`/`onClearSaved` son opcionales: cuando el caller los pasa (solo
 * tiene sentido para personajes reales del jugador, no para enemigos ni
 * quickAttacks — ver `canPersistOverrides` en CharacterActionsPanel), la
 * edición deja de ser "solo esta sesión" y se puede guardar de verdad en el
 * personaje (`rollOverrides`, ver rollableActions.ts).
 */
export function EditableRollButton({
  formula,
  onRoll,
  renderButton,
  onSave,
  onClearSaved,
}: {
  formula: string;
  onRoll: (formula: string) => void;
  renderButton: (formula: string, onClick: () => void) => ReactNode;
  /** Persiste `formula` en el servidor — pinta el icono de guardar (SaveIcon) durante la edición. */
  onSave?: (formula: string) => void;
  /** Borra cualquier override guardado y vuelve al cálculo automático — el
   * icono de deshacer (ArrowBackUpIcon) está siempre visible cuando esta prop
   * está presente (idempotente, no hace falta saber si hay algo guardado
   * ahora mismo). */
  onClearSaved?: () => void;
}) {
  // `override` es `null` mientras no se haya tocado nada — en ese estado se
  // sigue el cálculo automático (`formula`) aunque cambie por debajo (p.ej.
  // al subir el nivel de hueco en ScalableDamageButton). En cuanto el
  // usuario edita/aplica dados extra, el valor escrito "gana" y ya no se
  // sincroniza solo — hasta que pulse el botón de reset.
  const [override, setOverride] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showExtraDice, setShowExtraDice] = useState(false);
  const [extraDiceValue, setExtraDiceValue] = useState("");
  const effectiveFormula = override ?? formula;
  const editIconRef = useRef<AnimatedIconHandle>(null);
  const saveIconRef = useRef<AnimatedIconHandle>(null);
  const resetIconRef = useRef<AnimatedIconHandle>(null);

  function handleReset() {
    setOverride(null);
    onClearSaved?.();
  }

  function handleApplyExtraDice() {
    const trimmed = extraDiceValue.trim();
    if (!trimmed) return;
    // Signo explícito si lo escribieron ("-1d4"); si no, se asume mejora ("+").
    const withSign = /^[+-]/.test(trimmed) ? trimmed : `+${trimmed}`;
    const sign = withSign.startsWith("-") ? "-" : "+";
    const magnitude = withSign.slice(1).trim();
    setOverride(`${effectiveFormula} ${sign} ${magnitude}`);
    setExtraDiceValue("");
    setShowExtraDice(false);
  }

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
        {onSave && (
          <button
            type="button"
            onClick={() => {
              saveIconRef.current?.startAnimation();
              onSave(effectiveFormula);
              setIsEditing(false);
            }}
            className="text-ink-muted hover:text-oxblood"
            aria-label="Guardar esta fórmula"
            title="Guardar esta fórmula — se usará siempre a partir de ahora"
          >
            <SaveIcon ref={saveIconRef} size={13} />
          </button>
        )}
      </span>
    );
  }

  return (
    <span className="relative inline-flex items-center gap-0.5">
      {renderButton(effectiveFormula, () => onRoll(effectiveFormula))}
      <button
        type="button"
        onClick={() => {
          editIconRef.current?.startAnimation();
          setIsEditing(true);
        }}
        className="px-0.5 text-ink-muted hover:text-oxblood"
        aria-label="Editar fórmula a mano"
        title="Editar la fórmula a mano (p.ej. si la descripción dice algo distinto)"
      >
        <PenIcon ref={editIconRef} size={13} />
      </button>
      <button
        type="button"
        onClick={() => setShowExtraDice(true)}
        className="px-0.5 text-[0.7rem] text-ink-muted hover:text-oxblood"
        aria-label="Aplicar dados extra"
        title="Aplicar dados extra (mejora o desmejora)"
      >
        🎲±
      </button>
      {(override !== null || onClearSaved) && (
        <button
          type="button"
          onClick={() => {
            resetIconRef.current?.startAnimation();
            handleReset();
          }}
          className="px-0.5 text-ink-muted hover:text-oxblood"
          aria-label="Volver al cálculo automático"
          title="Descartar la fórmula manual y volver al cálculo automático"
        >
          <ArrowBackUpIcon ref={resetIconRef} size={13} />
        </button>
      )}

      {showExtraDice && (
        <div
          role="presentation"
          onClick={() => setShowExtraDice(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-abyss/40 backdrop-blur-sm"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Aplicar dados extra"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === "Escape" && setShowExtraDice(false)}
            className="mx-4 w-full max-w-xs rounded-sm border border-rule bg-parchment-panel p-4 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.4)]"
          >
            <p className="mb-2 text-xs font-semibold text-oxblood">Dados extra</p>
            <p className="mb-2 text-[0.7rem] text-ink-muted">
              Mejora o desmejora a sumar a «{effectiveFormula}» — p.ej. <code>1d4</code> o{" "}
              <code>-1d4</code>.
            </p>
            <input
              type="text"
              value={extraDiceValue}
              onChange={(e) => setExtraDiceValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApplyExtraDice()}
              autoFocus
              placeholder="p.ej. 1d4 o -1d4"
              aria-label="Dados extra a aplicar"
              className="mb-3 w-full rounded-sm border border-rule-strong bg-parchment px-2 py-1 text-xs text-ink outline-none focus:border-oxblood"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowExtraDice(false)}
                className="text-xs text-ink-muted hover:text-ink"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyExtraDice}
                className="text-xs font-semibold text-oxblood hover:underline"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
