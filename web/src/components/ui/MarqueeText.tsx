import { useEffect, useRef, useState, type CSSProperties } from "react";

interface MarqueeTextProps {
  text: string;
  className?: string;
}

/**
 * Texto que se desliza de izquierda a derecha (y vuelta) solo cuando no cabe
 * en su contenedor — como el ticker de título de un reproductor real. Si
 * cabe entero, se queda quieto, sin animación de por medio.
 */
export function MarqueeText({ text, className = "" }: MarqueeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [style, setStyle] = useState<{ distance: number; duration: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    const overflow = textEl.scrollWidth - container.clientWidth;
    if (overflow > 4) {
      setStyle({ distance: -(overflow + 8), duration: Math.max(6, overflow / 20) });
    } else {
      setStyle(null);
    }
  }, [text]);

  return (
    <div ref={containerRef} className={`overflow-hidden whitespace-nowrap ${className}`}>
      <span
        ref={textRef}
        className={`inline-block ${style ? "marquee-track" : ""}`}
        style={
          style
            ? ({
                "--marquee-distance": `${style.distance}px`,
                "--marquee-duration": `${style.duration}s`,
              } as CSSProperties)
            : undefined
        }
      >
        {text}
      </span>
    </div>
  );
}
