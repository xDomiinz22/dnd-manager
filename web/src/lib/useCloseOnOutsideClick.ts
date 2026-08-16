import { useEffect, useRef, type RefObject } from "react";

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
 *
 * `onClose` se guarda en un ref en vez de ir en las dependencias del
 * `useEffect`: si el caller pasa una función inline (lo normal — un
 * `() => setX(...)` nuevo en cada render), cualquier render ajeno al propio
 * popover (p.ej. el polling de sesión/mensajes cada 3s en ChatDockPanel)
 * recreaba la función y reenganchaba el listener entero de golpe. Con el
 * listener quitándose y reponiéndose así de a menudo, un click real que
 * cayera justo en ese hueco podía perderse o, peor, un click DENTRO de
 * `ref` podía acabar leyéndose con el `ref.current` de una versión anterior
 * del DOM ya reemplazada — cerrando el panel aunque el click fuera legítimo
 * (p.ej. al elegir un personaje en el menú de tiradas). Con el ref, el
 * listener se registra UNA vez por `ref` y ya no depende de la identidad de
 * `onClose`.
 */
export function useCloseOnOutsideClick(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onCloseRef.current();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
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
  }, [ref]);
}
