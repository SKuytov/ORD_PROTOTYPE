import { apiClient } from './client';

export interface Approval {
  id: number;
  order_id: number;
  order_description?: string;
  order_building?: string;
  order_priority?: string;
  requester_name?: string;
  requested_by_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  created_at: string;
  order_quantity?: number;
  order_date_needed?: string;
}

export async function getApprovals(): Promise<Approval[]> {
  const res = await apiClient.get<{ success: boolean; approvals: Approval[] }>('/approvals');
  return res.approvals || [];
}

export async function getPendingCount(): Promise<number> {
  const res = await apiClient.get<{ success: boolean; count: number }>('/approvals/pending-count');
  return res.count || 0;
}

export async function approveOrder(id: number): Promise<void> {
  await apiClient.put(`/approvals/${id}/approve`, {});
}

export async function rejectOrder(id: number, reason: string): Promise<void> {
  await apiClient.put(`/approvals/${id}/reject`, { rejection_reason: reason });
}
