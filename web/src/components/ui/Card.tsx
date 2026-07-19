import type { ElementType, ComponentPropsWithoutRef } from "react";

type CardProps<C extends ElementType> = { as?: C } & Omit<ComponentPropsWithoutRef<C>, "as">;

export function Card<C extends ElementType = "div">({ as, className, ...rest }: CardProps<C>) {
  const Component = as ?? "div";
  // Vignette sutil hacia los bordes (sombra interior tintada de oxblood) en vez
  // de una sombra dura: sugiere el borde gastado de una página, no una tarjeta SaaS.
  const mergedClassName = `rounded-sm border border-rule bg-parchment-panel p-4 shadow-[inset_0_0_28px_-6px_rgb(from_var(--color-oxblood)_r_g_b/0.22)] ${className ?? ""}`;
  const props = { className: mergedClassName, ...rest } as ComponentPropsWithoutRef<C>;
  return <Component {...props} />;
}
