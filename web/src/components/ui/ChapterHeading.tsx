import type { ReactNode } from "react";

interface ChapterHeadingProps {
  children: ReactNode;
  /** Acción o metadato secundario a la derecha del título (ej. un link de "Diario →"). */
  action?: ReactNode;
  as?: "h1" | "h2";
  className?: string;
}

/**
 * Encabezado de "capítulo del tomo": título en Cinzel + filete doble dorado
 * debajo. Patrón repetido en cada página (ver DESIGN.md) para que la app se
 * lea como un libro, no como un dashboard.
 */
export function ChapterHeading({
  children,
  action,
  as: Tag = "h1",
  className = "",
}: ChapterHeadingProps) {
  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <Tag
          className={`font-display text-oxblood ${Tag === "h1" ? "text-3xl" : "text-xl"} tracking-wide text-balance`}
        >
          {children}
        </Tag>
        {action && <div className="pb-1 text-sm">{action}</div>}
      </div>
      <div className="chapter-rule mt-2" />
    </div>
  );
}
