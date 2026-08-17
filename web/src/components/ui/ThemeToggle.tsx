import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { MorphIcon } from "morphicons/react";
import { Moon, Sun } from "lucide";
import { getEffectiveTheme, setStoredTheme, type Theme } from "../../lib/theme";

/**
 * ¿El navegador soporta la View Transitions API? Firefox y Safari <18 no la
 * traen — en esos casos `toggle()` cae directo al cambio instantáneo de
 * siempre, sin animación de barrido (ver más abajo).
 */
function supportsViewTransitions(): boolean {
  return typeof document !== "undefined" && "startViewTransition" in document;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * `circle(r at x y)` en porcentaje — NO en píxeles fijos, a propósito (así
 * lo hace la referencia que se siguió aquí, el componente equivalente de
 * magicui.design). Un porcentaje se reinterpreta contra el tamaño ACTUAL de
 * la caja en cada frame; un píxel congelado en el momento del click no —
 * en móvil eso importa de verdad: interactuar cerca del borde superior
 * (justo donde vive este botón) puede plegar/desplegar la barra de
 * direcciones del navegador EN MITAD de la transición, cambiando el alto
 * real del viewport. Con píxeles fijos, el radio final ya no alcanza a
 * cubrir el viewport nuevo y el barrido se ve "cortado" antes de llegar al
 * borde — exactamente el fallo reportado. Con porcentaje, el radio se
 * recalcula solo contra el tamaño que haya en cada instante.
 *
 * El punto de referencia para el porcentaje del RADIO no es el ancho/alto
 * sueltos, sino `hypot(w, h) / √2` (así lo define el spec de CSS Shapes
 * para `circle()`) — de ahí `toRadius`. El centro si se expresa en % del
 * ancho/alto normales.
 */
function circleClipPath(
  cx: number,
  cy: number,
  radiusPx: number,
  viewportWidth: number,
  viewportHeight: number,
): string {
  const toX = (x: number) => `${(x / viewportWidth) * 100}%`;
  const toY = (y: number) => `${(y / viewportHeight) * 100}%`;
  const toRadius = (r: number) =>
    `${(r / (Math.hypot(viewportWidth, viewportHeight) / Math.SQRT2)) * 100}%`;
  return `circle(${toRadius(radiusPx)} at ${toX(cx)} ${toY(cy)})`;
}

/** Interruptor claro/oscuro — el atributo data-theme ya se aplica antes del
 * primer pintado (ver el script inline en index.html), este componente solo
 * refleja/cambia esa elección desde el header.
 *
 * Dos animaciones DISTINTAS, con orígenes distintos, que resulta que
 * combinan bien porque comparten el mismo punto de partida (el botón):
 *
 * 1. El propio icono sol/luna hace un MORPH de verdad entre las dos formas
 *    (morphicons/react + los datos de icono de "lucide", ver imports) — ya
 *    no son dos SVG que se intercambian de golpe, es la misma silueta
 *    deformándose de una a otra. `<MorphIcon icon={...}>` anima solo con
 *    que cambie la prop `icon` (modo "uncontrolled" de la librería), así
 *    que no hace falta ningún ref ni disparo manual — a diferencia de los
 *    demás iconos de esta app (itshover.com), que si necesitan un
 *    `startAnimation()` explícito.
 *
 * 2. El cambio de tema en sí (la paleta de toda la página) tampoco es
 *    instantáneo: usa la View Transitions API para expandir un círculo
 *    desde el propio botón hasta cubrir toda la pantalla con la nueva
 *    paleta (mismo truco que el selector de tema de GitHub/Vercel/
 *    magicui.design — este trozo sigue de cerca la implementación de
 *    magicui, que ya lidió con varias de estas trampas).
 *    `document.startViewTransition` toma una foto del DOM antes y después
 *    del callback que le pasamos — el `flushSync` es imprescindible porque
 *    si no, React aplaza el cambio de estado a después de que la API ya
 *    haya hecho su captura "after", y la transición saldría vacía (foto
 *    "antes" y "después" idénticas). El propio recorte circular
 *    (`clipPath`) se anima aparte con la Web Animations API sobre
 *    `::view-transition-new(root)` — mientras tanto, el icono sigue
 *    morfando por su cuenta (rAF propio de morphicons, ver 1), visible a
 *    través del círculo según va creciendo.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => getEffectiveTheme());
  // Evita solapar dos barridos si el usuario pulsa dos veces seguidas antes
  // de que termine el primero — un segundo `startViewTransition` a mitad de
  // otro es justo el tipo de carrera que produce cortes/saltos raros.
  const isTransitioningRef = useRef(false);
  const activeAnimationRef = useRef<Animation | null>(null);

  const cleanupTransition = useCallback(() => {
    isTransitioningRef.current = false;
    activeAnimationRef.current = null;
    document.documentElement.style.removeProperty("--theme-vt-clip-from");
  }, []);

  // Si el componente se desmonta a media transición (navegación en medio),
  // no dejar el clip-path pineado a medio camino ni una animación viva.
  useEffect(() => {
    return () => {
      activeAnimationRef.current?.cancel();
      cleanupTransition();
    };
  }, [cleanupTransition]);

  function toggle(e: MouseEvent<HTMLButtonElement>) {
    if (isTransitioningRef.current) return;
    const next: Theme = theme === "dark" ? "light" : "dark";

    function commit() {
      setStoredTheme(next);
      setTheme(next);
    }

    if (!supportsViewTransitions() || prefersReducedMotion()) {
      commit();
      return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const x = e.clientX;
    const y = e.clientY;
    const endRadius = Math.hypot(Math.max(x, viewportWidth - x), Math.max(y, viewportHeight - y));
    const fromClip = circleClipPath(x, y, 0, viewportWidth, viewportHeight);
    const toClip = circleClipPath(x, y, endRadius, viewportWidth, viewportHeight);

    // Fija el recorte de partida por CSS antes de que exista ninguna
    // animación JS — sin esto, hay un hueco de uno o dos frames entre que
    // el navegador captura la foto "después" y que nuestro `.animate()` de
    // debajo llega a ejecutarse (más margen aún si el hilo principal está
    // ocupado, típico en un móvil de gama media), en el que
    // `::view-transition-new(root)` se vería sin recortar — un parpadeo del
    // tema nuevo a pantalla completa antes de que arranque el barrido. Ver
    // la regla en index.css que consume esta custom property.
    document.documentElement.style.setProperty("--theme-vt-clip-from", fromClip);
    isTransitioningRef.current = true;

    const transition = document.startViewTransition(() => {
      flushSync(commit);
    });

    transition.finished.finally(cleanupTransition).catch(() => {});

    transition.ready
      .then(() => {
        activeAnimationRef.current = document.documentElement.animate(
          { clipPath: [fromClip, toClip] },
          {
            duration: 500,
            easing: "ease-in-out",
            // Sin esto, el efecto deja de aplicarse en cuanto termina la
            // animación (comportamiento por defecto de la Web Animations
            // API) y el navegador puede dar por "acabada" la transición
            // antes de tiempo en vez de esperar a que sostengamos el estado
            // final — el mismo síntoma de "se corta antes de llegar al
            // borde" que el radio en píxeles fijos, por una razón distinta.
            fill: "forwards",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      })
      .catch(() => {
        // Un cambio de tema disparado justo antes de otro (doble click
        // rápido, o navegación en medio) puede rechazar `ready` — la
        // transición ya se descartó sola, no hay nada que arreglar aquí.
      });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
      className="flex h-9 w-9 items-center justify-center rounded-sm border border-rule text-ink-muted transition-colors hover:border-rule-strong hover:bg-parchment-deep hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxblood"
    >
      <MorphIcon icon={theme === "dark" ? Sun : Moon} size={20} spring="smooth" />
    </button>
  );
}
