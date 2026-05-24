'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

export interface AuthUser {
  did: string;
  handle: string;
  displayName: string;
  avatar?: string;
  followersCount: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /** Bluesky ハンドルを渡して OAuth フローを開始する（ページ遷移） */
  login: (handle: string) => void;
  /** ログアウトしてホームへ */
  logout: () => Promise<void>;
  /** プロフィールを再取得する */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data as AuthUser);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = useCallback((handle: string) => {
    const clean = handle.trim().replace(/^@/, '');
    window.location.href = `/api/auth/login?handle=${encodeURIComponent(clean)}`;
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // サーバーエラーでもクライアント側のステートはクリア
    }
    setUser(null);
    window.location.href = '/';
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
