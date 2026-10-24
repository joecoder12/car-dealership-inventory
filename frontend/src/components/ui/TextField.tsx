import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { inputClasses } from './styles';

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  children: (ids: { inputId: string; describedBy: string | undefined }) => ReactNode;
  className?: string;
}

/** Label, hint and error wiring shared by every form control. */
export function FieldShell({ label, error, hint, children, className = '' }: FieldShellProps) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink-800">
        {label}
      </label>
      {children({ inputId, describedBy: describedBy || undefined })}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-ink-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string;
  hint?: ReactNode;
  containerClassName?: string;
}

export function TextField({ label, error, hint, containerClassName, ...props }: TextFieldProps) {
  return (
    <FieldShell label={label} error={error} hint={hint} className={containerClassName}>
      {({ inputId, describedBy }) => (
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={inputClasses(Boolean(error))}
          {...props}
        />
      )}
    </FieldShell>
  );
}
