import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
  loadingText?: string;
}

// danger/ghost llevan borde visible a propósito (igual que primary/secondary):
// una acción sin borde se lee como un link de texto y pasa desapercibida
// como funcionalidad — ver el resto de variantes, que ya eran botones de verdad.
//
// El granate (oxblood) queda reservado como color de identidad para lo que ya
// lo llevaba de base (primary, danger) — nunca aparece SOLO al pasar el ratón
// o hacer click en un botón que no lo tenía de por sí, para que un usuario no
// lea "rojo = destructivo" en una acción que no lo es. secondary/ghost, cuyo
// reposo es neutro, usan un beige oscuro (parchment-deep, ya en la paleta)
// para el hover y el estado pulsado (:active).
const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "rounded-sm border border-gold/60 bg-oxblood px-3 py-2 text-sm font-semibold uppercase tracking-wide text-parchment hover:bg-oxblood-dark active:bg-oxblood-dark disabled:opacity-50",
  secondary:
    "rounded-sm border border-oxblood px-3 py-2 text-sm font-semibold uppercase tracking-wide text-oxblood hover:border-rule-strong hover:bg-parchment-deep hover:text-ink active:border-rule-strong active:bg-parchment-deep active:text-ink disabled:opacity-50",
  danger:
    "rounded-sm border border-oxblood-dark px-3 py-2 text-sm font-semibold text-oxblood-dark hover:bg-oxblood-dark hover:text-parchment active:bg-oxblood-dark active:text-parchment disabled:opacity-50",
  ghost:
    "rounded-sm border border-rule px-3 py-2 text-sm font-semibold text-ink hover:border-rule-strong hover:bg-parchment-deep active:border-rule-strong active:bg-parchment-deep disabled:opacity-50",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    isLoading,
    loadingText,
    disabled,
    className = "",
    children,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={`focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxblood ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {isLoading ? (loadingText ?? "...") : children}
    </button>
  );
});
