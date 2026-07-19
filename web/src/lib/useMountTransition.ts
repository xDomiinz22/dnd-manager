import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Para paneles/modales que necesitan animar tanto la entrada COMO la salida:
 * React desmonta un nodo condicional (`{open && <div/>}`) en el acto en
 * cuanto `open` pasa a false, así que una transición de salida (fade/slide)
 * nunca llega a verse sin este hook — generaliza el patrón ya usado a mano
 * en DiceOverlay.tsx (el estado `fading` antes de limpiar el resultado).
 *
 * Devuelve `shouldRender` (sigue montado durante `durationMs` tras cerrar,
 * para poder terminar la transición de salida) y `visible` (arranca en
 * false, pasa a true dos frames después de montar para que el navegador
 * pinte primero el estado "cerrado" y sí anime la entrada, y vuelve a false
 * en cuanto `open` se apaga, disparando la transición de salida).
 *
 * Uso: `className={visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`
 * junto a `transition-[opacity,transform] duration-200` en el elemento, y
 * `if (!shouldRender) return null;` (o no renderizarlo) cuando no toque.
 */
export function useMountTransition(open: boolean, durationMs: number) {
  const [shouldRender, setShouldRender] = useState(open);
  const [visible, setVisible] = useState(false);
  const frameRef = useRef<{ raf1: number; raf2: number } | null>(null);

  // Ajusta shouldRender/visible al vuelo de open→cerrado o cerrado→open
  // durante el propio render (patrón de React para "sincronizar estado con
  // una prop que cambia", mismo que `prevMobileOpen` en ChatDockPanel) en
  // vez de en un efecto — un `setState` síncrono al principio de un efecto
  // solo fuerza un re-render extra evitable. Un ref no vale aquí: leer/
  // escribir `.current` durante el render está prohibido por esta regla.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) setShouldRender(true);
    else setVisible(false);
  }

  useEffect(() => {
    if (open) {
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => setVisible(true));
        frameRef.current = { raf1, raf2 };
      });
      frameRef.current = { raf1, raf2: -1 };
      return () => {
        if (frameRef.current) {
          cancelAnimationFrame(frameRef.current.raf1);
          if (frameRef.current.raf2 >= 0) cancelAnimationFrame(frameRef.current.raf2);
        }
      };
    }
    const timeoutId = window.setTimeout(() => setShouldRender(false), durationMs);
    return () => window.clearTimeout(timeoutId);
  }, [open, durationMs]);

  return { shouldRender, visible };
}

/**
 * Para modales/popups que el propio PADRE monta y desmonta condicionalmente
 * (`{selected && <Modal onClose={...} />}`) — a diferencia de un panel que
 * vive siempre montado y solo cambia de estado (ver `useMountTransition`),
 * aquí el componente no controla si sigue montado, así que anima su propia
 * entrada al montarse y expone `handleClose` para retrasar el `onClose` real
 * del padre justo lo que dura la transición de salida.
 */
export function useModalTransition(onClose: () => void, durationMs: number) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(raf1);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    window.setTimeout(onClose, durationMs);
  }, [onClose, durationMs]);

  return { visible, handleClose };
}
