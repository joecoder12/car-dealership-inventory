import { useEffect, useEffectEvent, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE =
  'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Prevents closing (Escape / backdrop) while a request is in flight. */
  dismissible?: boolean;
}

/**
 * Accessible modal dialog: focus moves inside on open and is trapped there,
 * Escape or a backdrop click closes it, page scroll is locked, and focus is
 * returned to whatever opened it. Rendered in a portal above the layout.
 */
export function Modal({ title, description, onClose, children, dismissible = true }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  const requestClose = useEffectEvent(() => {
    if (dismissible) onClose();
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement as HTMLElement | null;
    const focusables = () => [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)];
    (focusables()[0] ?? dialog).focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 animate-[fade-up_0.2s_ease-out_both] bg-ink-950/60 backdrop-blur-sm"
        onClick={() => {
          if (dismissible) onClose();
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className="relative w-full max-w-lg animate-fade-up rounded-t-3xl bg-white p-6 shadow-lift sm:rounded-3xl sm:p-8"
      >
        <h2 id={titleId} className="text-xl font-semibold text-ink-950">
          {title}
        </h2>
        {description && (
          <div id={descriptionId} className="mt-1.5 text-sm text-ink-500">
            {description}
          </div>
        )}
        <div className="mt-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
