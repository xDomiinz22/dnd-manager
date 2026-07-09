import { forwardRef, type InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hideLabel?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hideLabel, id, name, className = "", ...rest },
  ref,
) {
  const fieldId = id ?? name;
  return (
    <div className="mb-4">
      <label
        className={hideLabel ? "sr-only" : "mb-1 block text-sm text-slate-400"}
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
});
