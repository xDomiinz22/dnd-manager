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

/**
 * Panel de confirmación reutilizable para acciones destructivas (borrar,
 * expulsar...): aparece bajo el elemento afectado en vez de disparar la
 * acción al primer click. Mismo patrón visual en toda la app.
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
  return (
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
        <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
