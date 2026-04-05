import { apiClient } from './client';

export interface Supplier {
  id: number;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  is_eu: number;
  website: string | null;
  notes: string | null;
  active: number;
  specialization: string | null;
  keywords: string | null;
  category_tags: string | null;
  performance_score: number;
  total_orders: number;
  last_order_date: string | null;
}

export async function getSuppliers(): Promise<Supplier[]> {
  const res = await apiClient.get<{ success: boolean; suppliers: Supplier[] }>('/suppliers');
  return res.suppliers || [];
}

export async function createSupplier(data: Partial<Supplier>): Promise<void> {
  await apiClient.post('/suppliers', data);
}

export async function updateSupplier(id: number, data: Partial<Supplier>): Promise<void> {
  await apiClient.put(`/suppliers/${id}`, data);
}

export async function getAISuggestions(orderId: number): Promise<Supplier[]> {
  const res = await apiClient.get<{ success: boolean; suggestions: Supplier[] }>(
    `/suppliers/suggestions/${orderId}`
  );
  return res.suggestions || [];
}
