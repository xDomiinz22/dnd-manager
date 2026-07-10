import { forwardRef, type SelectHTMLAttributes } from "react";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hideLabel?: boolean;
  wrapperClassName?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  {
    label,
    error,
    hideLabel,
    wrapperClassName = "mb-3",
    id,
    name,
    className = "",
    children,
    ...rest
  },
  ref,
) {
  const fieldId = id ?? name;
  return (
    <div className={wrapperClassName}>
      <label
        className={hideLabel ? "sr-only" : "mb-1 block text-sm text-ink-muted"}
        htmlFor={fieldId}
      >
        {label}
      </label>
      <select
        ref={ref}
        id={fieldId}
        name={name}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={`w-full rounded-sm border bg-parchment px-3 py-2 text-sm text-ink outline-none focus:border-oxblood ${
          error ? "border-oxblood-dark" : "border-rule-strong"
        } ${className}`}
        {...rest}
      >
        {children}
      </select>
      {error && (
        <p id={`${fieldId}-error`} className="mt-1 text-sm text-oxblood-dark">
          {error}
        </p>
      )}
    </div>
  );
});
