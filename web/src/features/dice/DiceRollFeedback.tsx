import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import type { DiceRollDto } from "@dnd-manager/shared";
import { AnimatedRollValue } from "./AnimatedRollValue";

interface FeedbackItem {
  id: number;
  roll: DiceRollDto;
}

interface DiceRollFeedbackContextValue {
  show: (roll: DiceRollDto) => void;
}

const DiceRollFeedbackContext = createContext<DiceRollFeedbackContextValue | null>(null);

const DISMISS_MS = 4500;

/**
 * Igual que ToastProvider (misma esquina, mismo patrón de stack + auto-dismiss)
 * pero para resultados de tiradas: en vez de un mensaje de texto plano, anima
 * el número hasta revelar el total. Se mantiene separado de Toast a propósito
 * — el resto de la app sigue usando toasts de texto para todo lo demás.
 */
export function DiceRollFeedbackProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (roll: DiceRollDto) => {
      const id = nextId.current++;
      setItems((prev) => [...prev, { id, roll }]);
      setTimeout(() => dismiss(id), DISMISS_MS);
    },
    [dismiss],
  );

  return (
    <DiceRollFeedbackContext.Provider value={{ show }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 left-4 z-50 flex w-full max-w-xs flex-col gap-2 px-4 sm:px-0"
      >
        {items.map(({ id, roll }) => (
          <div
            key={id}
            role="status"
            className="pointer-events-auto rounded-sm border border-oxblood/60 bg-parchment-panel px-4 py-3 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">{roll.label}</p>
                <p className="text-xs text-ink-muted">{roll.formula}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <AnimatedRollValue
                  value={roll.total}
                  className="font-display text-2xl font-semibold text-oxblood"
                />
                <button
                  type="button"
                  onClick={() => dismiss(id)}
                  aria-label="Cerrar"
                  className="text-ink-muted opacity-70 hover:opacity-100"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DiceRollFeedbackContext.Provider>
  );
}

export function useDiceRollFeedback() {
  const ctx = useContext(DiceRollFeedbackContext);
  if (!ctx) throw new Error("useDiceRollFeedback debe usarse dentro de DiceRollFeedbackProvider");
  return ctx;
}
