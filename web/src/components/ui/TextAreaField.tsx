import { forwardRef, type TextareaHTMLAttributes } from "react";

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hideLabel?: boolean;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  function TextAreaField({ label, error, hideLabel, id, name, className = "", ...rest }, ref) {
    const fieldId = id ?? name;
    return (
      <div className="mb-3">
        <label
          className={hideLabel ? "sr-only" : "mb-1 block text-sm text-ink-muted"}
          htmlFor={fieldId}
        >
          {label}
        </label>
        <textarea
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
  },
);
