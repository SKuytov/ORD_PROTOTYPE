import { apiClient } from './client';

export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  building?: string;
  active?: number;
  created_at?: string;
}

export interface AdminBuilding {
  id: number;
  code: string;
  name: string;
  description?: string;
  active: number;
}

export interface AdminCostCenter {
  id: number;
  code: string;
  name: string;
  description?: string;
}

export async function getUsers(): Promise<User[]> {
  const res = await apiClient.get<{ success: boolean; users: User[] }>('/users');
  return res.users || [];
}

export async function createUser(data: {
  username: string; name: string; email: string;
  password: string; role: string; building?: string;
}): Promise<void> {
  await apiClient.post('/users', data);
}

export async function updateUser(id: number, data: Partial<User & { password?: string }>): Promise<void> {
  await apiClient.put(`/users/${id}`, data);
}

export async function getAdminBuildings(): Promise<AdminBuilding[]> {
  const res = await apiClient.get<{ success: boolean; buildings: AdminBuilding[] }>('/buildings');
  return res.buildings || [];
}

export async function createBuilding(data: { code: string; name: string; description?: string }): Promise<void> {
  await apiClient.post('/buildings', data);
}

export async function updateBuilding(id: number, data: Partial<AdminBuilding>): Promise<void> {
  await apiClient.put(`/buildings/${id}`, data);
}

export async function getAdminCostCenters(): Promise<AdminCostCenter[]> {
  const res = await apiClient.get<{ success: boolean; cost_centers: AdminCostCenter[] }>('/cost-centers');
  return res.cost_centers || [];
}

export async function createCostCenter(data: { code: string; name: string; description?: string }): Promise<void> {
  await apiClient.post('/cost-centers', data);
}
