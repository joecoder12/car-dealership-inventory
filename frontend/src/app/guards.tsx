import { Navigate, Outlet, useLocation } from 'react-router';
import { PageSpinner } from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import { AccessDeniedPage } from '../pages/StatusPages';

/**
 * UI-level route guards. They only decide what to render; every protected API
 * endpoint enforces authentication and roles on the server regardless.
 */
export function RequireAdmin() {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <PageSpinner label="Checking your session" />;
  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  if (user.role !== 'ADMIN') return <AccessDeniedPage />;
  return <Outlet />;
}

/** Sign-in and registration pages make no sense once signed in. */
export function GuestOnly() {
  const { user, status } = useAuth();
  if (status === 'loading') return <PageSpinner label="Checking your session" />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
