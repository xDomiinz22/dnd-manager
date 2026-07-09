import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
  loadingText?: string;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "rounded bg-amber-400 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-amber-300 disabled:opacity-50",
  secondary:
    "rounded border border-slate-700 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800 disabled:opacity-50",
  danger: "text-sm font-medium text-red-400 hover:underline disabled:opacity-50",
  ghost: "text-sm font-medium text-slate-300 hover:text-amber-400 disabled:opacity-50",
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
      className={`focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {isLoading ? (loadingText ?? "...") : children}
    </button>
  );
});
