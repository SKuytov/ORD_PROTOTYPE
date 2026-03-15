// PartPulse Orders — Shared Types (frontend ↔ backend)
// No Drizzle/PostgreSQL — we proxy to the existing MySQL backend

export type UserRole = 'admin' | 'procurement' | 'manager' | 'requester';

export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  building: string | null;
}

export type OrderStatus =
  | 'New'
  | 'Pending'
  | 'Quote Requested'
  | 'Quote Received'
  | 'Quote Under Approval'
  | 'Approved'
  | 'Ordered'
  | 'In Transit'
  | 'Partially Delivered'
  | 'Delivered'
  | 'Cancelled'
  | 'On Hold';

export type OrderPriority = 'Low' | 'Normal' | 'High' | 'Urgent';

export interface Order {
  id: number;
  building: string;
  cost_center_id: number | null;
  cost_center_code: string | null;
  cost_center_name: string | null;
  item_description: string;
  part_number: string | null;
  category: string | null;
  quantity: number;
  date_needed: string;
  expected_delivery_date: string | null;
  notes: string | null;
  supplier_notes: string | null;
  alternative_product_name: string | null;
  priority: OrderPriority;
  requester_id: number;
  requester_name: string;
  requester_email: string;
  status: OrderStatus;
  supplier: string | null;
  supplier_id: number | null;
  supplier_name: string | null;
  quote_id: string | null;
  quote_ref: number | null;
  quote_number: string | null;
  price: number;
  unit_price: number;
  total_price: number;
  assigned_to: string | null;
  assigned_to_user_id: number | null;
  assigned_to_name: string | null;
  assigned_at: string | null;
  last_activity_at: string | null;
  minutes_since_activity: number | null;
  submission_date: string;
  updated_at: string;
  po_id: number | null;
  po_number: string | null;
  invoice_id: number | null;
  delivery_confirmed_at: string | null;
  approval_status: 'not_required' | 'pending' | 'approved' | 'rejected';
  files?: OrderFile[];
}

export interface OrderFile {
  id: number;
  name: string;
  path: string;
  type: string;
  size: number;
}

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

export interface Quote {
  id: number;
  quote_number: string;
  supplier_id: number | null;
  supplier_name: string | null;
  status: 'Draft' | 'Sent to Supplier' | 'Received' | 'Under Approval' | 'Approved' | 'Rejected';
  total_amount: number;
  currency: string;
  valid_until: string | null;
  notes: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  items?: QuoteItem[];
}

export interface QuoteItem {
  id: number;
  quote_id: number;
  order_id: number;
  unit_price: number;
  quantity: number;
  total_price: number;
  notes: string | null;
  item_description?: string;
  part_number?: string;
}

export interface Approval {
  id: number;
  order_id: number;
  quote_document_id: number | null;
  requested_by: number;
  requested_by_name?: string;
  requested_at: string;
  assigned_to: number | null;
  assigned_to_name?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by: number | null;
  approved_at: string | null;
  comments: string | null;
  rejection_reason: string | null;
  estimated_cost: number | null;
  supplier_id: number | null;
  supplier_name?: string;
  priority: OrderPriority;
  order?: Order;
}

export interface Building {
  id: number;
  code: string;
  name: string;
  description: string | null;
  active: number;
}

export interface CostCenter {
  id: number;
  building_code: string;
  code: string;
  name: string;
  description: string | null;
  active: number;
}

export interface Document {
  id: number;
  order_id: number | null;
  document_type: string;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
  uploaded_by: number;
  uploaded_at: string;
  status: 'pending' | 'processed' | 'sent_to_accounting' | 'archived';
  requires_action: number;
  action_deadline: string | null;
  action_notes: string | null;
  notes: string | null;
  description: string | null;
}

export interface ProcurementKPIs {
  totalOrders: number;
  openOrders: number;
  pendingQuotes: number;
  orderedThisMonth: number;
  totalSpendThisMonth: number;
  overdueOrders: number;
  inTransit: number;
  pendingApprovals: number;
  unassignedOrders: number;
}

export interface SupplierSuggestion {
  id: number;
  name: string;
  email: string | null;
  contact_person: string | null;
  score: number;
  match_reasons: string[];
  performance_score: number;
  total_orders: number;
}

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'New', 'Pending', 'Quote Requested', 'Quote Received',
  'Quote Under Approval', 'Approved', 'Ordered',
  'In Transit', 'Partially Delivered', 'Delivered'
];

export const STATUS_COLORS: Record<OrderStatus, string> = {
  'New': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Pending': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'Quote Requested': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'Quote Received': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  'Quote Under Approval': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'Approved': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'Ordered': 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  'In Transit': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'Partially Delivered': 'bg-lime-500/20 text-lime-300 border-lime-500/30',
  'Delivered': 'bg-green-500/20 text-green-300 border-green-500/30',
  'Cancelled': 'bg-red-500/20 text-red-300 border-red-500/30',
  'On Hold': 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

export const PRIORITY_COLORS: Record<OrderPriority, string> = {
  'Urgent': 'bg-red-500/20 text-red-300 border-red-500/30',
  'High': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'Normal': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Low': 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};
