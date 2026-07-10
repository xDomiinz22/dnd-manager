interface PortraitCircleProps {
  url: string | null;
  name: string;
  size?: number;
}

export function PortraitCircle({ url, name, size = 96 }: PortraitCircleProps) {
  const style = { width: size, height: size };

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={style}
        className="rounded-full border-2 border-gold object-cover"
      />
    );
  }

  return (
    <div
      style={style}
      className="flex items-center justify-center rounded-full border-2 border-rule-strong bg-parchment-deep font-display text-2xl text-ink-muted"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
