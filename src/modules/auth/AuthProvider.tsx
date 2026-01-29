import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';

export type Role = { id: number; name: string; level: number };
export type User = {
  id: number;
  name: string;
  email: string;
  role?: Role;
  managerId?: number | null;
};

type AuthCtx = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({} as any);

// helper: suporta backend que retorna {ok:true, data:...} ou retorno direto
function unwrap<T>(resData: any): T {
  return (resData && typeof resData === 'object' && 'data' in resData) ? (resData.data as T) : (resData as T);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  async function fetchMe() {
    try {
      const res = await api.get('/auth/me');
      const me = unwrap<User>(res.data);
      setUser(me);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      fetchMe();
    } else {
      delete api.defaults.headers.common.Authorization;
      setUser(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const payload = unwrap<{ token: string }>(res.data);
    const t = payload?.token;

    if (!t) throw new Error('Token não retornado pelo backend');

    localStorage.setItem('token', t);
    setToken(t);
    await fetchMe();
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, token, login, logout, refreshMe: fetchMe }),
    [user, token]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
