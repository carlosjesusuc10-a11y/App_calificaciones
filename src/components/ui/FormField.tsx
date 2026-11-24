import type { ReactNode } from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

export function FormField({
  id,
  label,
  error,
  hint,
  required = false,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
        {required ? (
          <span className="text-red-700 ml-1" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {children}

      {error ? (
        <p role="alert" className="text-xs font-medium text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
