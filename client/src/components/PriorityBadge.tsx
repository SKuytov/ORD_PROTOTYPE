import { OrderPriority, PRIORITY_COLORS } from '@shared/schema';
import { cn } from '@/lib/utils';

interface PriorityBadgeProps {
  priority: OrderPriority;
  className?: string;
}

export default function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const colors = PRIORITY_COLORS[priority] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  return (
    <span
      data-testid={`priority-badge-${priority}`}
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        colors,
        className
      )}
    >
      {priority}
    </span>
  );
}
