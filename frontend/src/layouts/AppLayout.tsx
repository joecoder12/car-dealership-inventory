import { Link, NavLink, Outlet } from 'react-router';
import { AccountMenu } from '../components/AccountMenu';
import { Wordmark } from '../components/Logo';
import { buttonClasses } from '../components/ui/styles';
import { useAuth } from '../hooks/useAuth';

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-white/10 text-white' : 'text-ink-300 hover:text-white'
  }`;

export function AppLayout() {
  const { user, isAdmin, status } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-white px-4 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/95 text-white backdrop-blur supports-[backdrop-filter]:bg-ink-950/85">
        <nav
          aria-label="Main"
          className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-6 sm:px-6 lg:px-8"
        >
          <Link to="/" className="mr-2 shrink-0 rounded-lg" aria-label="Northlane Motors home">
            <Wordmark />
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <NavLink to="/" end className={navLinkClasses}>
              Showroom
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={navLinkClasses}>
                Manage inventory
              </NavLink>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {isAdmin && (
              <NavLink to="/admin" className={`${navLinkClasses({ isActive: false })} md:hidden`}>
                Inventory
              </NavLink>
            )}
            {status === 'loading' ? (
              <span
                className="h-9 w-24 animate-pulse rounded-full bg-white/10"
                aria-hidden="true"
              />
            ) : user ? (
              <AccountMenu user={user} />
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-ink-200 hover:text-white"
                >
                  Sign in
                </Link>
                <Link to="/register" className={buttonClasses('primary', 'sm')}>
                  Create account
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-ink-200/70 bg-paper">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} Northlane Motors · A demo dealership built for the Incubyte
            TDD kata.
          </p>
          <p>Prices shown in USD. Live inventory, updated on every sale.</p>
        </div>
      </footer>
    </div>
  );
}
