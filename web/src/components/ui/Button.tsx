import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
  loadingText?: string;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "rounded-sm border border-gold/60 bg-oxblood px-3 py-2 text-sm font-semibold uppercase tracking-wide text-parchment hover:bg-oxblood-dark disabled:opacity-50",
  secondary:
    "rounded-sm border border-oxblood px-3 py-2 text-sm font-semibold uppercase tracking-wide text-oxblood hover:bg-oxblood hover:text-parchment disabled:opacity-50",
  danger: "text-sm font-semibold text-oxblood-dark hover:underline disabled:opacity-50",
  ghost: "text-sm font-semibold text-ink hover:text-oxblood disabled:opacity-50",
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
