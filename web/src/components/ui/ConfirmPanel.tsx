import { useEffect, useState } from "react";
import { Button } from "./Button";

interface ConfirmPanelProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  confirmLabel?: string;
  loadingText?: string;
  className?: string;
}

const TRANSITION_MS = 200;

/**
 * Panel de confirmación reutilizable para acciones destructivas (borrar,
 * expulsar...): aparece bajo el elemento afectado en vez de disparar la
 * acción al primer click. Mismo patrón visual en toda la app.
 *
 * Anima su propia altura (técnica `grid-template-rows` 0fr→1fr, sin medir
 * nada por JS) tanto al aparecer como al cancelar — el padre solo monta y
 * desmonta este componente por su booleano de "confirmando", así que
 * `handleCancel` retrasa la llamada real a `onCancel` lo que dura el colapso
 * para que no se vea un corte seco. "Confirmar" sí dispara `onConfirm` al
 * instante (sin esperar ninguna animación): es la acción que el usuario
 * quiere que pase ya, no una que se está cancelando con calma.
 */
export function ConfirmPanel({
  message,
  onConfirm,
  onCancel,
  isLoading,
  confirmLabel = "Confirmar",
  loadingText = "...",
  className = "",
}: ConfirmPanelProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  function handleCancel() {
    setOpen(false);
    window.setTimeout(onCancel, TRANSITION_MS);
  }

  return (
    <div
      className={`grid transition-[grid-template-rows] duration-200 ease-out ${
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      }`}
    >
      <div className="overflow-hidden">
        <div className={`mt-3 border-t border-rule pt-3 ${className}`}>
          <p className="mb-3 text-sm text-oxblood">⚠ {message}</p>
          <div className="flex gap-2">
            <Button
              variant="danger"
              onClick={onConfirm}
              isLoading={isLoading}
              loadingText={loadingText}
            >
              {confirmLabel}
            </Button>
            <Button variant="ghost" onClick={handleCancel} disabled={isLoading}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
