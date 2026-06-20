import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthResponse, AuthUser } from '@goatphone/shared';
import { api, setToken, getToken } from '@/lib/api';

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      setLoading(false);
      return;
    }
    api
      .get<AuthUser>('/auth/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const handleAuth = (res: AuthResponse) => {
    setToken(res.token);
    setUser(res.user);
  };

  const login = async (email: string, password: string) => {
    handleAuth(await api.post<AuthResponse>('/auth/login', { email, password }));
  };
  const register = async (name: string, email: string, password: string) => {
    handleAuth(await api.post<AuthResponse>('/auth/register', { name, email, password }));
  };
  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
