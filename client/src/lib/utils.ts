import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, differenceInDays, parseISO } from 'date-fns';
import { bg } from 'date-fns/locale';
import { OrderPriority, OrderStatus } from '@shared/schema';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return format(parseISO(d), 'dd.MM.yyyy');
  } catch {
    return d;
  }
}

export function fmtDateTime(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return format(parseISO(d), 'dd.MM.yyyy HH:mm');
  } catch {
    return d;
  }
}

export function fmtRelative(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return formatDistanceToNow(parseISO(d), { addSuffix: true });
  } catch {
    return d;
  }
}

export function fmtPrice(v: number | null | undefined, currency = 'EUR'): string {
  if (v == null || isNaN(Number(v)) || Number(v) === 0) return '—';
  return `${Number(v).toFixed(2)} ${currency}`;
}

export function daysUntil(d: string | null | undefined): number | null {
  if (!d) return null;
  try {
    return differenceInDays(parseISO(d), new Date());
  } catch {
    return null;
  }
}

export function isOverdue(d: string | null | undefined): boolean {
  const days = daysUntil(d);
  return days !== null && days < 0;
}

export function isUrgentDeadline(d: string | null | undefined): boolean {
  const days = daysUntil(d);
  return days !== null && days >= 0 && days <= 3;
}

export function prioritySort(p: OrderPriority): number {
  const map: Record<OrderPriority, number> = { Urgent: 1, High: 2, Normal: 3, Low: 4 };
  return map[p] ?? 3;
}

export function statusIndex(s: OrderStatus): number {
  const statuses: OrderStatus[] = [
    'New', 'Pending', 'Quote Requested', 'Quote Received',
    'Quote Under Approval', 'Approved', 'Ordered',
    'In Transit', 'Partially Delivered', 'Delivered',
    'Cancelled', 'On Hold'
  ];
  return statuses.indexOf(s);
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}
