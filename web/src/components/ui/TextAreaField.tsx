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
          className={hideLabel ? "sr-only" : "mb-1 block text-sm text-slate-400"}
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
          className={`w-full rounded border bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-amber-400 ${
            error ? "border-red-500" : "border-slate-700"
          } ${className}`}
          {...rest}
        />
        {error && (
          <p id={`${fieldId}-error`} className="mt-1 text-sm text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  },
);
