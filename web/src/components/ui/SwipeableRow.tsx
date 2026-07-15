import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useCloseOnOutsideClick } from "../../lib/useCloseOnOutsideClick";

const DELETE_WIDTH = 72;
const RIGHT_HINT_WIDTH = 112;
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
  swipeRightLabel = "A la cola",
  onDelete,
  deleteLabel = "Borrar",
  className = "",
}: SwipeableRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateXState] = useState(0);
  // Espejo síncrono del estado: `endGesture` necesita el valor final exacto
  // al soltar. Leerlo desde la forma funcional de `setState` (como se hacía
  // antes) permitía que StrictMode invocara el efecto secundario
  // (onSwipeRight/onDelete) más de una vez al comprobar la pureza del
  // updater — de ahí los toasts duplicados. Con el ref, la decisión se toma
  // una sola vez, fuera de cualquier updater de setState.
  const translateXRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const gestureRef = useRef<{
    startX: number;
    startY: number;
    // Posición de reposo de la que partía la fila al empezar este gesto —
    // única fuente de verdad para "qué lado estaba revelado" (antes había un
    // `openSideRef` aparte que podía desincronizarse del `translateX` real
    // en algún caso límite, dejando el cubo de basura revelado de forma
    // permanente pese a que la fila "parecía" cerrada).
    startTranslateX: number;
    horizontal: boolean | null;
  } | null>(null);

  function setTranslateX(value: number) {
    translateXRef.current = value;
    setTranslateXState(value);
  }

  useCloseOnOutsideClick(containerRef, () => {
    setTranslateX(0);
  });

  // `endGesture` (definido más abajo) se redefine en cada render (cierra
  // sobre las props/estado de ese render), pero los listeners de `window`
  // necesitan una referencia de función ESTABLE para poder añadirse/quitarse
  // de forma fiable entre renders — si no, `removeEventListener` apunta a
  // una copia distinta a la que se añadió y el listener se queda pegado
  // para siempre (la fila quedaba "atascada" a medio deslizar). Declarado
  // ANTES de `endGesture` (con un no-op de inicio) para que la propia
  // `endGesture` pueda referenciar `stableEndGesture` sin "usar antes de
  // declarar".
  const endGestureRef = useRef<() => void>(() => {});
  const stableEndGesture = useCallback(() => endGestureRef.current(), []);

  function endGesture() {
    window.removeEventListener("pointerup", stableEndGesture);
    window.removeEventListener("pointercancel", stableEndGesture);
    const g = gestureRef.current;
    gestureRef.current = null;
    setIsDragging(false);
    if (!g || !g.horizontal) return;

    const current = translateXRef.current;
    if (current > RIGHT_ACTION_THRESHOLD && onSwipeRight) {
      setTranslateX(0);
      onSwipeRight();
      return;
    }
    if (current < -OPEN_THRESHOLD && onDelete) {
      setTranslateX(-DELETE_WIDTH);
      return;
    }
    // No cruzó ningún umbral: vuelve a la posición de reposo previa al
    // gesto (abierta o cerrada), no siempre a 0.
    setTranslateX(g.startTranslateX);
  }

  useEffect(() => {
    endGestureRef.current = endGesture;
  });

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-no-swipe]")) return;
    gestureRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTranslateX: translateXRef.current,
      horizontal: null,
    };
    // Red de seguridad: si el pointerup/cancel no llega al propio elemento
    // (p.ej. pérdida de captura del puntero durante un re-render a mitad de
    // gesto), esto garantiza que el gesto siempre termine. Idempotente.
    window.addEventListener("pointerup", stableEndGesture);
    window.addEventListener("pointercancel", stableEndGesture);
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
        window.removeEventListener("pointerup", stableEndGesture);
        window.removeEventListener("pointercancel", stableEndGesture);
        return;
      }
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDragging(true);
    }

    const maxRight = onSwipeRight ? RIGHT_HINT_WIDTH : 0;
    const maxLeft = onDelete ? -DELETE_WIDTH : 0;
    setTranslateX(Math.min(maxRight, Math.max(maxLeft, g.startTranslateX + deltaX)));
  }

  function handleConfirmDelete() {
    onDelete?.();
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
        // Verde "moss" (mismo tono que los toasts de éxito) a propósito, NO
        // oxblood: si esta pista usara el mismo rojo que el botón de borrar,
        // se leería como "modo borrar" activándose al deslizar para AÑADIR,
        // justo lo contrario de lo que hace (acción positiva, sin peligro).
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 flex w-[112px] items-center bg-moss px-3 text-center text-[0.7rem] font-medium leading-tight text-parchment"
          style={{ opacity: Math.max(0, Math.min(1, translateX / RIGHT_ACTION_THRESHOLD)) }}
        >
          {swipeRightLabel}
        </div>
      )}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stableEndGesture}
        onPointerCancel={stableEndGesture}
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
