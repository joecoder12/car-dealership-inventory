import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import type { User } from '../types/models';
import { useToast } from './toast/ToastProvider';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

/** Avatar button with a small menu (account details + sign out). */
export function AccountMenu({ user }: { user: User }) {
  const { logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const signOut = async () => {
    setOpen(false);
    try {
      await logout();
      toast.success('You have been signed out.');
      navigate('/');
    } catch {
      toast.error('Could not sign out. Please try again.');
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user.name}`}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full py-1 pr-1 pl-3 text-sm text-ink-100 ring-1 ring-white/15 transition hover:bg-white/5"
      >
        <span className="hidden max-w-[10rem] truncate sm:block">{user.name}</span>
        <span className="grid size-8 place-items-center rounded-full bg-ember-500 text-xs font-bold text-white">
          {initials(user.name)}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 z-40 mt-2 w-64 origin-top-right animate-fade-up rounded-2xl bg-white p-2 text-ink-900 shadow-lift ring-1 ring-ink-900/5"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-ink-500">{user.email}</p>
            <span className="mt-2 inline-flex rounded-full bg-ink-100 px-2 py-0.5 text-[0.7rem] font-semibold tracking-wide text-ink-700 uppercase">
              {user.role === 'ADMIN' ? 'Administrator' : 'Customer'}
            </span>
          </div>
          <div className="my-1 h-px bg-ink-100" />
          <button
            ref={firstItemRef}
            type="button"
            role="menuitem"
            onClick={signOut}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-700 hover:bg-ink-50 focus:bg-ink-50 focus:outline-none"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
