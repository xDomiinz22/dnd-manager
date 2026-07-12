import { forwardRef, type InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hideLabel?: boolean;
  wrapperClassName?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hideLabel, wrapperClassName = "mb-4", id, name, className = "", ...rest },
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
      <input
        ref={ref}
        id={fieldId}
        name={name}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={`w-full rounded-sm border bg-parchment px-3 py-2 text-ink outline-none focus:border-oxblood ${
          error ? "border-oxblood-dark" : "border-rule-strong"
        } ${className}`}
        {...rest}
      />
      {error && (
        <p id={`${fieldId}-error`} className="mt-1 text-sm text-oxblood-dark">
          {error}
        </p>
      )}
    </div>
  );
});
