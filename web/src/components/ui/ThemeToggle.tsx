import { useRef, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { getEffectiveTheme, setStoredTheme, type Theme } from "../../lib/theme";
import type { AnimatedIconHandle } from "../icons/types";
import MoonIcon from "../icons/moon-icon";
import BrightnessDownIcon from "../icons/brightness-down-icon";

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

/** Interruptor claro/oscuro — el atributo data-theme ya se aplica antes del
 * primer pintado (ver el script inline en index.html), este componente solo
 * refleja/cambia esa elección desde el header.
 *
 * El cambio de tema en sí ya no es instantáneo: usa la View Transitions API
 * para expandir un círculo desde el propio botón hasta cubrir toda la
 * pantalla con la nueva paleta (mismo truco que el selector de tema de
 * GitHub/Vercel). `document.startViewTransition` toma una foto del DOM
 * antes y después del callback que le pasamos — el `flushSync` es
 * imprescindible porque si no, React aplaza el cambio de estado a después
 * de que la API ya haya hecho su captura "after", y la transición saldría
 * vacía (foto "antes" y "después" idénticas). El propio recorte circular
 * (`clipPath`) se anima aparte con la Web Animations API sobre el
 * pseudo-elemento `::view-transition-new(root)` — ver el `animate` en
 * `../../index.css` que apaga el crossfade por defecto para dejar sitio a
 * este barrido.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => getEffectiveTheme());
  const iconRef = useRef<AnimatedIconHandle>(null);

  function toggle(e: MouseEvent<HTMLButtonElement>) {
    const next: Theme = theme === "dark" ? "light" : "dark";

    // Feedback táctil del propio icono al pulsar — no solo al pasar el
    // ratón por encima, para que también se vea en touch/teclado.
    iconRef.current?.startAnimation();

    function commit() {
      setStoredTheme(next);
      setTheme(next);
    }

    if (!supportsViewTransitions() || prefersReducedMotion()) {
      commit();
      return;
    }

    const x = e.clientX;
    const y = e.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const transition = document.startViewTransition(() => {
      flushSync(commit);
    });

    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
          },
          {
            duration: 500,
            easing: "ease-in-out",
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
      {theme === "dark" ? (
        <BrightnessDownIcon ref={iconRef} size={20} />
      ) : (
        <MoonIcon ref={iconRef} size={20} />
      )}
    </button>
  );
}
