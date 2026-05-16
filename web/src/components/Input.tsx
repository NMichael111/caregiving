import { forwardRef } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className = "", ...props },
  ref,
) {
  const field = (
    <input
      ref={ref}
      {...props}
      className={`block w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-500 ${error ? "border-red-400" : ""} ${className}`}
    />
  );
  return wrap(label, hint, error, field);
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className = "", ...props },
  ref,
) {
  const field = (
    <textarea
      ref={ref}
      {...props}
      className={`block w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${error ? "border-red-400" : ""} ${className}`}
    />
  );
  return wrap(label, hint, error, field);
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className = "", children, ...props },
  ref,
) {
  const field = (
    <select
      ref={ref}
      {...props}
      className={`block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${error ? "border-red-400" : ""} ${className}`}
    >
      {children}
    </select>
  );
  return wrap(label, hint, error, field);
});

function wrap(label: string | undefined, hint: string | undefined, error: string | undefined, field: ReactNode) {
  if (!label && !hint && !error) return field;
  return (
    <label className="block">
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
      <div className={label ? "mt-1" : ""}>{field}</div>
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </label>
  );
}
