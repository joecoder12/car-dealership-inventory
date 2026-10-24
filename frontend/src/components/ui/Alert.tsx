import type { ReactNode } from 'react';

/** Inline, assertive message for errors that block the current task. */
export function Alert({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="alert"
      className={`flex gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-inset ring-rose-200 ${className}`}
    >
      <span aria-hidden="true" className="font-bold">
        !
      </span>
      <div>{children}</div>
    </div>
  );
}
