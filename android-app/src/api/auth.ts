import { apiClient } from './client';

export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'procurement' | 'manager' | 'accounting' | 'requester';
  building?: string;
  department?: string;
  notification_email?: string;
}

export async function login(username: string, password: string): Promise<{ token: string; user: User }> {
  const res = await apiClient.post<{ success: boolean; token: string; user: User }>(
    '/auth/login',
    { username, password }
  );
  if (!res.success) throw new Error('Login failed');
  return { token: res.token, user: res.user };
}

export async function verifyToken(): Promise<User> {
  const res = await apiClient.get<{ success: boolean; user: User }>('/auth/verify');
  return res.user;
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout', {});
  } catch {}
}
