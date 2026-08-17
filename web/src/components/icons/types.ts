import type { SVGProps } from "react";

/** Grosor de trazo estándar para iconos outline de 24×24. */
export const DEFAULT_STROKE_WIDTH = 2;

/** Escala el grosor de trazo para que combine con DEFAULT_STROKE_WIDTH en viewBox distintos de 24. */
export function scaledStrokeWidth(strokeWidth: number, viewBoxSize: number): number {
  return strokeWidth * (viewBoxSize / 24);
}

export type IconEasing =
  | "linear"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "circIn"
  | "circOut"
  | "circInOut"
  | "backIn"
  | "backOut"
  | "backInOut"
  | "anticipate";

export interface AnimatedIconProps extends Omit<
  SVGProps<SVGSVGElement>,
  | "ref"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
  | "onDrag"
  | "onDragEnd"
  | "onDragEnter"
  | "onDragExit"
  | "onDragLeave"
  | "onDragOver"
  | "onDragStart"
  | "onDrop"
  | "values"
> {
  /** Tamaño del icono en píxeles o string CSS. */
  size?: number | string;
  /** Color del icono (por defecto currentColor). */
  color?: string;
  /** Grosor de trazo del SVG. */
  strokeWidth?: number;
  /** Clases CSS adicionales. */
  className?: string;
}

export interface AnimatedIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}
