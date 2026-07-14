import { useEffect, type RefObject } from "react";

/**
 * Cierra un popover/menú flotante al pulsar fuera de `ref` o al pulsar
 * Escape. El `addEventListener("click", ...)` se difiere con
 * `setTimeout(fn, 0)` a propósito: para clicks "de confianza" (ratón/touch
 * reales) React fuerza un flush síncrono de los efectos pendientes antes de
 * que el propio evento termine de burbujear hasta `document` — si el
 * listener se añadiera sin más en el `useEffect`, quedaría registrado a
 * tiempo de capturar el mismo click que ABRIÓ el elemento, cerrándolo al
 * instante. Un `.click()` sintético (`isTrusted: false`) no dispara ese
 * flush síncrono, así que probar con JS no habría revelado este bug.
 */
export function useCloseOnOutsideClick(ref: RefObject<HTMLElement>, onClose: () => void) {
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    const timeoutId = window.setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 0);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [ref, onClose]);
}
