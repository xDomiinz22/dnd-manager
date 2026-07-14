import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useCloseOnOutsideClick } from "../../lib/useCloseOnOutsideClick";

const DELETE_WIDTH = 72;
const RIGHT_HINT_WIDTH = 96;
const RIGHT_ACTION_THRESHOLD = 64;
const OPEN_THRESHOLD = DELETE_WIDTH * 0.6;
const GESTURE_TOLERANCE = 8;

interface SwipeableRowProps {
  /** Contenido normal de la fila (se desliza por encima de las acciones reveladas). */
  children: ReactNode;
  /** Clases para el contenedor que se desliza — debe tener fondo opaco para tapar lo revelado en reposo. */
  contentClassName?: string;
  /** Deslizar de izquierda a derecha (p.ej. "añadir a Reproducir después"). No es destructivo, no requiere confirmación. */
  onSwipeRight?: () => void;
  swipeRightLabel?: string;
  /** Deslizar de derecha a izquierda revela este botón; hay que pulsarlo para confirmar el borrado. */
  onDelete?: () => void;
  deleteLabel?: string;
  className?: string;
}

function TrashIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
    >
      <path
        d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m2 0-.7 9.1a1.5 1.5 0 0 1-1.5 1.4H8.2a1.5 1.5 0 0 1-1.5-1.4L6 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Fila con gestos de deslizar horizontal: a la derecha dispara una acción no
 * destructiva de inmediato (p.ej. añadir a una cola); a la izquierda revela
 * un botón de borrar (patrón Gmail/iOS Mail) que hay que pulsar de forma
 * explícita para confirmar — el propio gesto de revelar + pulsar ya hace de
 * confirmación, sin diálogo adicional. Funciona con ratón y con touch (son
 * Pointer Events). No interfiere con elementos marcados `data-no-swipe`
 * (p.ej. el asa de arrastre para reordenar).
 */
export function SwipeableRow({
  children,
  contentClassName = "",
  onSwipeRight,
  swipeRightLabel = "Añadir a Reproducir después",
  onDelete,
  deleteLabel = "Borrar",
  className = "",
}: SwipeableRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [openSide, setOpenSide] = useState<"left" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const gestureRef = useRef<{
    startX: number;
    startY: number;
    horizontal: boolean | null;
    pointerId: number;
  } | null>(null);

  useCloseOnOutsideClick(containerRef, () => {
    setOpenSide(null);
    setTranslateX(0);
  });

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-no-swipe]")) return;
    gestureRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      horizontal: null,
      pointerId: e.pointerId,
    };
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const g = gestureRef.current;
    if (!g) return;
    const deltaX = e.clientX - g.startX;
    const deltaY = e.clientY - g.startY;

    if (g.horizontal === null) {
      if (Math.abs(deltaX) < GESTURE_TOLERANCE && Math.abs(deltaY) < GESTURE_TOLERANCE) return;
      g.horizontal = Math.abs(deltaX) > Math.abs(deltaY);
      if (!g.horizontal) {
        gestureRef.current = null;
        return;
      }
      e.currentTarget.setPointerCapture(g.pointerId);
      setIsDragging(true);
    }

    const base = openSide === "left" ? -DELETE_WIDTH : 0;
    const maxRight = onSwipeRight ? RIGHT_HINT_WIDTH : 0;
    const maxLeft = onDelete ? -DELETE_WIDTH : 0;
    setTranslateX(Math.min(maxRight, Math.max(maxLeft, base + deltaX)));
  }

  function endGesture() {
    const g = gestureRef.current;
    gestureRef.current = null;
    setIsDragging(false);
    if (!g || !g.horizontal) return;

    setTranslateX((current) => {
      if (current > RIGHT_ACTION_THRESHOLD && onSwipeRight) {
        onSwipeRight();
        setOpenSide(null);
        return 0;
      }
      if (current < -OPEN_THRESHOLD && onDelete) {
        setOpenSide("left");
        return -DELETE_WIDTH;
      }
      setOpenSide(null);
      return 0;
    });
  }

  function handleConfirmDelete() {
    onDelete?.();
    setOpenSide(null);
    setTranslateX(0);
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {onDelete && (
        <div className="absolute inset-y-0 right-0 w-[72px]">
          <button
            type="button"
            onClick={handleConfirmDelete}
            aria-label={deleteLabel}
            className="flex h-full w-full items-center justify-center bg-oxblood-dark text-parchment transition-colors hover:bg-oxblood"
          >
            <TrashIcon />
          </button>
        </div>
      )}
      {onSwipeRight && (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 flex w-[96px] items-center bg-oxblood pl-3 text-xs font-medium text-parchment"
          style={{ opacity: Math.max(0, Math.min(1, translateX / RIGHT_ACTION_THRESHOLD)) }}
        >
          {swipeRightLabel}
        </div>
      )}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? "none" : "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
          touchAction: "pan-y",
        }}
        className={contentClassName}
      >
        {children}
      </div>
    </div>
  );
}
