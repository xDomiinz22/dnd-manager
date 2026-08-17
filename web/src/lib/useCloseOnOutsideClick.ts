import { useEffect, useRef, type RefObject } from "react";

/**
 * Cierra un popover/menú flotante al pulsar fuera de `ref` o al pulsar
 * Escape.
 *
 * Escucha "pointerdown", NO "click", y esto es lo que de verdad importa: un
 * botón DENTRO de `ref` que, al pulsarlo, hace que React reemplace ese mismo
 * trozo del DOM (p.ej. el menú "Ataques" cambia de la lista de personajes a
 * la lista de tiradas, o al revés) puede dejar `e.target` como un nodo YA
 * DESMONTADO para cuando el evento "click" termina de burbujear hasta
 * `document` — y un nodo desmontado no está "contenido" en nada, así que
 * `ref.current.contains(e.target)` da `false` aunque el click fuera
 * legítimamente DENTRO del panel en el momento de pulsar. Resultado: el
 * panel se cerraba solo con cualquier botón cuyo click cambiara lo que hay
 * debajo del propio dedo/cursor (elegir categoría, elegir personaje...).
 * "pointerdown" dispara ANTES de que el navegador entregue el "click" (y por
 * tanto antes de que el propio `onClick` de React pueda desmontar nada), así
 * que `e.target` sigue attached — el mismo patrón que usan Radix/Headless UI
 * para esto exactamente.
 *
 * El registro se difiere con `setTimeout(fn, 0)` para no capturar el mismo
 * pointerdown que ABRIÓ el elemento (p.ej. la pestaña plegada del chat,
 * aunque esa además lleva su propio `stopPropagation`).
 *
 * `onClose` se guarda en un ref en vez de ir en las dependencias del
 * `useEffect`: si el caller pasa una función inline (lo normal — un
 * `() => setX(...)` nuevo en cada render), cualquier render ajeno al propio
 * popover (p.ej. el polling de sesión/mensajes cada 3s en ChatDockPanel)
 * recreaba la función y reenganchaba el listener entero de golpe. Con el
 * ref, el listener se registra UNA vez por `ref` y ya no depende de la
 * identidad de `onClose`.
 */
export function useCloseOnOutsideClick(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onCloseRef.current();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    const timeoutId = window.setTimeout(() => {
      document.addEventListener("pointerdown", handlePointerDown);
    }, 0);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [ref]);
}
