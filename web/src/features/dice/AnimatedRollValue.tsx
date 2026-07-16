import { useEffect, useState } from "react";

// Tics cada vez más lentos, como una tragaperras deteniéndose: rápido al
// principio, se frena hacia el final antes de fijar el valor real.
const TICK_DELAYS_MS = [55, 55, 65, 75, 95, 120, 160, 210];

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/** Valor "creíble" al azar cerca del real, para que el parpadeo no muestre saltos absurdos. */
function randomNear(value: number): number {
  const spread = Math.max(6, Math.abs(value) * 1.5);
  return Math.round(value + (Math.random() - 0.5) * spread * 2);
}

interface AnimatedRollValueProps {
  value: number;
  className?: string;
  /** false = mostrar el valor final directamente, sin parpadeo (p.ej. tiradas ya antiguas en el log). */
  animate?: boolean;
}

/**
 * Anima la revelación de un resultado ya calculado (el servidor ya tiró los
 * dados de verdad — esto es puramente cosmético, la suspense de ver el
 * número "asentarse"). Respeta prefers-reduced-motion mostrando el valor
 * final sin parpadeo.
 */
export function AnimatedRollValue({
  value,
  className = "",
  animate = true,
}: AnimatedRollValueProps) {
  const shouldAnimate = animate && !prefersReducedMotion();
  const [display, setDisplay] = useState(() => (shouldAnimate ? randomNear(value) : value));
  const [settled, setSettled] = useState(() => !shouldAnimate);

  useEffect(() => {
    // Sin animación: el estado inicial ya es el valor final, no hay nada que
    // sincronizar (el `value` de una tirada ya creada no vuelve a cambiar).
    if (!shouldAnimate) return;

    let cancelled = false;
    let step = 0;

    function tick() {
      if (cancelled) return;
      if (step === 0) setSettled(false);
      if (step >= TICK_DELAYS_MS.length) {
        setDisplay(value);
        setSettled(true);
        return;
      }
      setDisplay(randomNear(value));
      const delay = TICK_DELAYS_MS[step]!;
      step++;
      timeoutId = window.setTimeout(tick, delay);
    }

    let timeoutId = window.setTimeout(tick, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [value, shouldAnimate]);

  return (
    <span
      className={`inline-block tabular-nums ${settled ? "dice-settle" : ""} ${className}`}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {display}
    </span>
  );
}
