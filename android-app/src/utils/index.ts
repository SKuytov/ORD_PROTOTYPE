import { format, formatDistanceToNow, isAfter, isBefore, addDays } from 'date-fns';

export function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

export function fmtDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy, HH:mm');
  } catch {
    return '—';
  }
}

export function fmtRelative(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return '—';
  }
}

export function fmtPrice(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  try {
    return isBefore(new Date(dateStr), new Date());
  } catch {
    return false;
  }
}

export function isDueSoon(dateStr: string | null | undefined, days = 3): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    return isAfter(d, new Date()) && isBefore(d, addDays(new Date(), days));
  } catch {
    return false;
  }
}

export function truncate(str: string | null | undefined, len = 60): string {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}
