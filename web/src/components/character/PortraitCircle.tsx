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
        className="rounded-full border-2 border-amber-400/60 object-cover"
      />
    );
  }

  return (
    <div
      style={style}
      className="flex items-center justify-center rounded-full border-2 border-slate-700 bg-slate-800 text-2xl font-semibold text-slate-500"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
