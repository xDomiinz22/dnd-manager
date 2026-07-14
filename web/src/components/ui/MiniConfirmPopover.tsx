import { useEffect, useRef } from "react";

interface MiniConfirmPopoverProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Confirmación flotante y compacta, anclada al elemento que la abre (debe
 * vivir dentro de un contenedor `relative`). Pensada para acciones puntuales
 * de una sola fila (p.ej. borrar un track) donde el `ConfirmPanel` a todo lo
 * ancho resulta desproporcionado. Se cierra al pulsar fuera o con Escape.
 */
export function MiniConfirmPopover({
  message,
  onConfirm,
  onCancel,
  isLoading,
  className = "",
}: MiniConfirmPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onCancel();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    // Para eventos "de confianza" (click real de ratón/touch), React fuerza
    // un flush síncrono de los efectos pendientes antes de que el propio
    // evento termine de burbujear hasta `document` — si el listener se
    // añadiera aquí sin más, este mismo `useEffect` quedaría registrado a
    // tiempo de capturar el click que ABRIÓ el popup, cerrándolo al
    // instante. Un `.click()` sintético (isTrusted: false) no dispara ese
    // flush síncrono, así que el bug no aparecía probando con JS — solo con
    // clicks reales. Registrar el listener en un macrotask aparte garantiza
    // que el evento que abrió el popup ya ha terminado de propagarse.
    const timeoutId = window.setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 0);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      className={`absolute right-0 top-full z-40 mt-1 w-max max-w-[220px] rounded-sm border border-rule bg-parchment-panel p-2 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.3)] ${className}`}
    >
      <p className="mb-2 text-xs text-oxblood">{message}</p>
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          aria-label="Cancelar"
          className="flex h-6 w-6 items-center justify-center rounded-sm text-ink-muted transition-colors hover:bg-parchment-deep/60 hover:text-ink disabled:opacity-50"
        >
          ✕
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          aria-label="Confirmar borrado"
          className="flex h-6 w-6 items-center justify-center rounded-sm bg-oxblood-dark text-xs text-parchment transition-colors hover:bg-oxblood disabled:opacity-50"
        >
          {isLoading ? "…" : "✓"}
        </button>
      </div>
    </div>
  );
}
