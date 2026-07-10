interface PortraitCircleProps {
  url: string | null;
  name: string;
  size?: number;
  /** Clases Tailwind responsive de tamaño (p.ej. "h-36 w-36 sm:h-44 sm:w-44"); si se pasa, sustituye a `size`. */
  sizeClassName?: string;
}

export function PortraitCircle({ url, name, size = 96, sizeClassName }: PortraitCircleProps) {
  const style = sizeClassName ? undefined : { width: size, height: size };

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={style}
        className={`rounded-full border-2 border-gold object-cover ${sizeClassName ?? ""}`}
      />
    );
  }

  return (
    <div
      style={style}
      className={`flex items-center justify-center rounded-full border-2 border-rule-strong bg-parchment-deep font-display text-2xl text-ink-muted ${sizeClassName ?? ""}`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
