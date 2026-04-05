export const API_BASE_URL = 'https://partpulse-orders.tail675c8b.ts.net/api';

// Brand colors matching PartPulse web app
export const COLORS = {
  primary: '#e8682a',        // PartPulse orange
  primaryDark: '#c55520',
  primaryLight: '#f0894d',
  navy: '#2d3f5e',           // PartPulse navy
  navyDark: '#1e2e47',
  navyLight: '#3d5070',
  background: '#0f172a',     // Dark background
  surface: '#1e293b',        // Card surface
  surfaceHigh: '#283548',    // Elevated surface
  border: '#334155',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  purple: '#a855f7',
  cyan: '#06b6d4',
  emerald: '#10b981',
};

export const STATUS_COLORS: Record<string, string> = {
  'New': '#3b82f6',
  'Pending Review': '#a855f7',
  'Approved': '#22c55e',
  'In Progress': '#e8682a',
  'Quote Requested': '#f59e0b',
  'Quote Received': '#06b6d4',
  'Ordered': '#10b981',
  'In Transit': '#0ea5e9',
  'Delivered': '#22c55e',
  'Cancelled': '#ef4444',
  'On Hold': '#94a3b8',
};

export const PRIORITY_COLORS: Record<string, string> = {
  'Critical': '#ef4444',
  'High': '#f59e0b',
  'Normal': '#3b82f6',
  'Low': '#94a3b8',
};

export const ORDER_STATUSES = [
  'New', 'Pending Review', 'Approved', 'In Progress',
  'Quote Requested', 'Quote Received', 'Ordered',
  'In Transit', 'Delivered', 'Cancelled', 'On Hold',
];

export const PRIORITIES = ['Critical', 'High', 'Normal', 'Low'];

export const BUILDINGS = [
  'Cotton Tape / Sliver', 'Cotton Yarn', 'Viscose Yarn',
  'Textile Laboratory', 'Maintenance', 'Warehouse', 'Administration', 'IT',
];
