import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { setToken, setUnauthorizedHandler } from '../api/client';
import { login as apiLogin, logout as apiLogout, verifyToken, User } from '../api/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const TOKEN_KEY = 'partpulse_jwt_token';
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up unauthorized handler — only 401 triggers logout
    setUnauthorizedHandler(async () => {
      await clearSession();
    });

    // Try to restore session from secure storage
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      if (storedToken) {
        setToken(storedToken);
        setTokenState(storedToken);
        // Verify token is still valid
        const currentUser = await verifyToken();
        setUser(currentUser);
      }
    } catch (err) {
      // Token invalid or expired — clear it
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      setToken(null);
      setTokenState(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function clearSession() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setTokenState(null);
    setUser(null);
  }

  const login = async (username: string, password: string) => {
    const res = await apiLogin(username, password);
    await SecureStore.setItemAsync(TOKEN_KEY, res.token);
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  };

  const logout = async () => {
    await apiLogout();
    await clearSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
