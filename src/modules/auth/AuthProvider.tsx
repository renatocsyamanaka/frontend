import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';

export type Role = {
  id: number;
  name: string;
  level: number;
};

export type User = {
  id: number;
  name: string;
  email: string;
  role?: Role;
  managerId?: number | null;
  avatarUrl?: string | null;
};

type AuthCtx = {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
};

const Ctx = createContext<AuthCtx>({} as AuthCtx);

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

// suporta backend que retorna { ok: true, data: ... } ou retorno direto
function unwrap<T>(resData: any): T {
  return resData && typeof resData === 'object' && 'data' in resData
    ? (resData.data as T)
    : (resData as T);
}

function normalizeToken(rawToken?: string | null) {
  const value = String(rawToken || '').trim();
  if (!value) return null;
  return value.startsWith('Bearer ') ? value : `Bearer ${value}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as User;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    const raw = localStorage.getItem(TOKEN_KEY);
    return normalizeToken(raw);
  });

  const [loading, setLoading] = useState(true);

  function applyToken(nextToken: string | null) {
    if (nextToken) {
      localStorage.setItem(TOKEN_KEY, nextToken);
      api.defaults.headers.common.Authorization = nextToken;
      setToken(nextToken);
      return;
    }

    localStorage.removeItem(TOKEN_KEY);
    delete api.defaults.headers.common.Authorization;
    setToken(null);
  }

  function applyUser(nextUser: User | null) {
    if (nextUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
      return;
    }

    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  async function fetchMe() {
    const res = await api.get('/auth/me');
    const me = unwrap<User>(res.data);
    applyUser(me);
  }

  const logout = () => {
    applyToken(null);
    applyUser(null);
  };

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const payload = unwrap<{ token: string }>(res.data);

    const normalized = normalizeToken(payload?.token);

    if (!normalized) {
      throw new Error('Token não retornado pelo backend');
    }

    applyToken(normalized);
    await fetchMe();
  };

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const savedToken = normalizeToken(localStorage.getItem(TOKEN_KEY));

        if (!savedToken) {
          if (mounted) setLoading(false);
          return;
        }

        api.defaults.headers.common.Authorization = savedToken;

        if (mounted) {
          setToken(savedToken);
        }

        try {
          const res = await api.get('/auth/me');
          const me = unwrap<User>(res.data);

          if (!mounted) return;

          applyUser(me);
        } catch {
          if (!mounted) return;
          logout();
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: !!token,
      login,
      logout,
      refreshMe: fetchMe,
      setUser,
    }),
    [user, token, loading]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);