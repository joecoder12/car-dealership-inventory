import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { AUTH_QUERY_KEY } from '../app/query-client';
import { ApiError } from '../services/api-client';
import { authApi } from '../services/api';
import type { User } from '../types/models';

interface AuthContextValue {
  user: User | null;
  /** 'loading' only until the first /auth/me answer arrives. */
  status: 'loading' | 'ready';
  isAdmin: boolean;
  login(credentials: { email: string; password: string }): Promise<User>;
  register(details: { name: string; email: string; password: string }): Promise<User>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchCurrentUser(): Promise<User | null> {
  try {
    return await authApi.me();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

/**
 * The session itself lives in an HttpOnly cookie the browser manages; this
 * provider only mirrors "who is signed in" by asking GET /api/auth/me.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const me = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60_000,
  });

  const login = useCallback<AuthContextValue['login']>(
    async (credentials) => {
      const { user } = await authApi.login(credentials);
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
      return user;
    },
    [queryClient],
  );

  const register = useCallback<AuthContextValue['register']>(
    async (details) => {
      const { user } = await authApi.register(details);
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
      return user;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.removeQueries({ queryKey: ['inventory'] });
    }
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => {
    const user = me.data ?? null;
    return {
      user,
      status: me.isPending ? 'loading' : 'ready',
      isAdmin: user?.role === 'ADMIN',
      login,
      register,
      logout,
    };
  }, [me.data, me.isPending, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
