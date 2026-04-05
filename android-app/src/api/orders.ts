import { apiClient } from './client';

export interface OrderFile {
  id: number;
  name: string;
  path: string;
  type: string;
  size: number;
}

export interface Order {
  id: number;
  building: string;
  item_description: string;
  part_number?: string;
  category?: string;
  quantity: number;
  date_needed: string;
  submission_date: string;
  priority: string;
  status: string;
  notes?: string;
  requester_id: number;
  requester_name: string;
  requester_email?: string;
  supplier_id?: number;
  supplier_name?: string;
  assigned_to_user_id?: number;
  assigned_to_name?: string;
  cost_center_code?: string;
  cost_center_name?: string;
  quote_number?: string;
  unit_price?: number;
  total_price?: number;
  expected_delivery_date?: string;
  delivery_confirmed_at?: string;
  approval_status?: string;
  files: OrderFile[];
  minutes_since_activity?: number;
}

export interface Building {
  id: number;
  code: string;
  name: string;
  active: number;
}

export interface CostCenter {
  id: number;
  code: string;
  name: string;
}

export interface OrderFilters {
  status?: string;
  building?: string;
  priority?: string;
  search?: string;
  assigned_filter?: 'mine' | 'unassigned';
  date_from?: string;
  date_to?: string;
  sort?: 'id_asc' | 'id_desc' | 'date_asc' | 'date_desc' | 'priority' | 'due_date';
}

export async function getBuildings(): Promise<Building[]> {
  const res = await apiClient.get<{ success: boolean; buildings: Building[] }>('/buildings?active=1');
  return res.buildings || [];
}

export async function getCostCenters(): Promise<CostCenter[]> {
  const res = await apiClient.get<{ success: boolean; cost_centers: CostCenter[] }>('/cost-centers');
  return res.cost_centers || [];
}

export async function getOrders(filters: OrderFilters = {}): Promise<Order[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.building) params.set('building', filters.building);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.search) params.set('search', filters.search);
  if (filters.assigned_filter) params.set('assigned_filter', filters.assigned_filter);

  const qs = params.toString();
  const res = await apiClient.get<{ success: boolean; orders: Order[] }>(
    `/orders${qs ? `?${qs}` : ''}`
  );

  let orders = res.orders || [];

  // Client-side date range filter
  if (filters.date_from) {
    const from = new Date(filters.date_from);
    orders = orders.filter(o => new Date(o.submission_date) >= from);
  }
  if (filters.date_to) {
    const to = new Date(filters.date_to);
    to.setHours(23, 59, 59, 999);
    orders = orders.filter(o => new Date(o.submission_date) <= to);
  }

  // Client-side sorting
  switch (filters.sort) {
    case 'id_asc':
      orders.sort((a, b) => a.id - b.id); break;
    case 'id_desc':
      orders.sort((a, b) => b.id - a.id); break;
    case 'date_asc':
      orders.sort((a, b) => new Date(a.submission_date).getTime() - new Date(b.submission_date).getTime()); break;
    case 'date_desc':
      orders.sort((a, b) => new Date(b.submission_date).getTime() - new Date(a.submission_date).getTime()); break;
    case 'priority': {
      const p: Record<string, number> = { Critical: 0, High: 1, Normal: 2, Low: 3 };
      orders.sort((a, b) => (p[a.priority] ?? 2) - (p[b.priority] ?? 2)); break;
    }
    case 'due_date':
      orders.sort((a, b) => {
        if (!a.date_needed) return 1;
        if (!b.date_needed) return -1;
        return new Date(a.date_needed).getTime() - new Date(b.date_needed).getTime();
      }); break;
    default:
      // Default: newest first (backend already returns this)
      break;
  }

  return orders;
}

export async function getOrderById(id: number): Promise<Order> {
  const res = await apiClient.get<{ success: boolean; order: Order }>(`/orders/${id}`);
  return res.order;
}

export interface CreateOrderData {
  building: string;
  itemDescription: string;
  partNumber?: string;
  category?: string;
  quantity: number;
  dateNeeded: string;
  priority: string;
  notes?: string;
  requester: string;
  requesterEmail?: string;
  costCenterId?: number;
  files?: Array<{ uri: string; name: string; type: string }>;
}

export async function createOrder(data: CreateOrderData): Promise<{ orderId: number }> {
  // Backend uses multer for file uploads — must send as multipart/form-data
  const formData = new FormData();
  formData.append('building', data.building);
  formData.append('itemDescription', data.itemDescription);
  formData.append('quantity', String(data.quantity));
  formData.append('dateNeeded', data.dateNeeded);
  formData.append('priority', data.priority);
  formData.append('requester', data.requester);
  if (data.partNumber) formData.append('partNumber', data.partNumber);
  if (data.category) formData.append('category', data.category);
  if (data.notes) formData.append('notes', data.notes);
  if (data.requesterEmail) formData.append('requesterEmail', data.requesterEmail);
  if (data.costCenterId) formData.append('costCenterId', String(data.costCenterId));

  // Attach files if any
  if (data.files && data.files.length > 0) {
    data.files.forEach((file) => {
      formData.append('files', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);
    });
  }

  const res = await apiClient.postForm<{ success: boolean; orderId: number }>('/orders', formData);
  return { orderId: res.orderId };
}

export async function updateOrderStatus(id: number, status: string, notes?: string): Promise<void> {
  await apiClient.put(`/orders/${id}`, { status, notes });
}

export async function getOrderStats(): Promise<any> {
  const res = await apiClient.get<{ success: boolean; stats: any }>('/orders/stats/overview');
  return res.stats;
}

export async function getAutocomplete(q: string): Promise<string[]> {
  if (q.length < 2) return [];
  const res = await apiClient.get<{ success: boolean; suggestions: string[] }>(
    `/autocomplete/item-description?q=${encodeURIComponent(q)}`
  );
  return res.suggestions?.slice(0, 6) ?? [];
}
