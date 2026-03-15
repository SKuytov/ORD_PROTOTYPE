import { OrderStatus, STATUS_COLORS } from '@shared/schema';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        colors,
        className
      )}
    >
      {status}
    </span>
  );
}
