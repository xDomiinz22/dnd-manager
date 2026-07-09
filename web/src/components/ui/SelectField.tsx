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
        className={hideLabel ? "sr-only" : "mb-1 block text-sm text-slate-400"}
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
        className={`w-full rounded border bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400 ${
          error ? "border-red-500" : "border-slate-700"
        } ${className}`}
        {...rest}
      >
        {children}
      </select>
      {error && (
        <p id={`${fieldId}-error`} className="mt-1 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
});
