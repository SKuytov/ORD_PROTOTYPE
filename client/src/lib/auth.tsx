import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, setAuthToken, setUnauthorizedHandler } from './api';
import { User } from '@shared/schema';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

// Pure in-memory session — no localStorage or sessionStorage (blocked in sandboxed iframes)
// State is kept alive as long as the app is mounted
let _inMemoryToken: string | null = null;
let _inMemoryUser: User | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(_inMemoryUser);
  const [token, setToken] = useState<string | null>(_inMemoryToken);
  const [loading, setLoading] = useState(false);

  const logout = () => {
    _inMemoryToken = null;
    _inMemoryUser = null;
    setToken(null);
    setUser(null);
    setAuthToken(null);
  };

  useEffect(() => {
    // Restore from in-memory globals (survives React re-renders but not page refresh)
    if (_inMemoryToken && _inMemoryUser) {
      setToken(_inMemoryToken);
      setUser(_inMemoryUser);
      setAuthToken(_inMemoryToken);
    }
    setLoading(false);

    // Only call logout on 401 (token expired / invalid), not on 403/404/500
    setUnauthorizedHandler(logout);

    return () => setUnauthorizedHandler(() => {});
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.post<{ success: boolean; token: string; user: User }>('/auth/login', {
      username,
      password,
    });

    if (!res.success) throw new Error('Login failed');

    _inMemoryToken = res.token;
    _inMemoryUser = res.user;

    setToken(res.token);
    setUser(res.user);
    setAuthToken(res.token);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
