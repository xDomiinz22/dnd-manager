/**
 * Sello del tomo: silueta de d20 (el dado más reconocible de D&D) en oxblood
 * con borde dorado, con un tomo abierto en pergamino en el centro — combina
 * el dado (D&D) con el tomo (Manager). Mismo dibujo que `public/favicon.svg`.
 */
export function BrandMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <polygon
        points="32,3 57.2,17.5 57.2,46.5 32,61 6.8,46.5 6.8,17.5"
        fill="#6B1620"
        stroke="#A8792B"
        strokeWidth="2.5"
      />
      <g stroke="#8B2430" strokeWidth="1" opacity="0.55">
        <line x1="32" y1="32" x2="32" y2="3" />
        <line x1="32" y1="32" x2="57.2" y2="17.5" />
        <line x1="32" y1="32" x2="57.2" y2="46.5" />
        <line x1="32" y1="32" x2="32" y2="61" />
        <line x1="32" y1="32" x2="6.8" y2="46.5" />
        <line x1="32" y1="32" x2="6.8" y2="17.5" />
      </g>
      <g fill="#F0E4C8">
        <path d="M32 23 C 27 20, 19 19, 15.5 21.5 L 15.5 40 C 19 37.5, 27 38.5, 32 42 Z" />
        <path d="M32 23 C 37 20, 45 19, 48.5 21.5 L 48.5 40 C 45 37.5, 37 38.5, 32 42 Z" />
      </g>
      <line x1="32" y1="23" x2="32" y2="42" stroke="#A8792B" strokeWidth="1.3" />
    </svg>
  );
}
