// Контекст аутентификации: хранит токен и текущего пользователя.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  authApi,
  patientsApi,
  setToken,
  getToken,
  setUnauthorizedHandler,
} from '../api/client';
import type { UserDTO } from '../../../shared/types';

interface AuthState {
  user: UserDTO | null;
  loading: boolean;
  sessionExpired: boolean;
  login: (email: string, password: string) => Promise<UserDTO>;
  register: (email: string, password: string, fullName: string) => Promise<UserDTO>;
  logout: () => void;
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  // Реакция на 401 от API — помечаем сессию истёкшей.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
      setSessionExpired(true);
    });
  }, []);

  // При старте — если есть токен, подтягиваем профиль.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    patientsApi
      .me()
      .then((u) => setUser(u))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setToken(res.token);
    setUser(res.user);
    setSessionExpired(false);
    return res.user;
  }, []);

  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      const res = await authApi.register({ email, password, fullName });
      setToken(res.token);
      setUser(res.user);
      setSessionExpired(false);
      return res.user;
    },
    []
  );

  const clearSessionExpired = useCallback(() => setSessionExpired(false), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sessionExpired,
        login,
        register,
        logout,
        clearSessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth должен использоваться внутри AuthProvider');
  return ctx;
}
