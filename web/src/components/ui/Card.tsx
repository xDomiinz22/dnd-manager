import type { ElementType, ComponentPropsWithoutRef } from "react";

type CardProps<C extends ElementType> = { as?: C } & Omit<ComponentPropsWithoutRef<C>, "as">;

export function Card<C extends ElementType = "div">({ as, className, ...rest }: CardProps<C>) {
  const Component = as ?? "div";
  const mergedClassName = `rounded-lg border border-slate-800 bg-slate-900 p-4 ${className ?? ""}`;
  const props = { className: mergedClassName, ...rest } as ComponentPropsWithoutRef<C>;
  return <Component {...props} />;
}
