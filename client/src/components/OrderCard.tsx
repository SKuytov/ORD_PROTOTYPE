import { Order } from '@shared/schema';
import { Card, CardContent } from '@/components/ui/card';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import { fmtDate, isOverdue, isUrgentDeadline, cn } from '@/lib/utils';
import { Calendar, Building2, User } from 'lucide-react';

interface OrderCardProps {
  order: Order;
  onClick?: () => void;
  selected?: boolean;
}

export default function OrderCard({ order, onClick, selected }: OrderCardProps) {
  const overdue = isOverdue(order.date_needed);
  const urgent = isUrgentDeadline(order.date_needed);

  return (
    <Card
      data-testid={`order-card-${order.id}`}
      className={cn(
        'cursor-pointer transition-colors hover:border-primary/50',
        selected && 'border-primary',
        overdue && 'border-red-500/50'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-mono">#{order.id}</span>
          <div className="flex items-center gap-1">
            <PriorityBadge priority={order.priority} />
            <StatusBadge status={order.status} />
          </div>
        </div>

        <p className="text-sm font-medium text-foreground line-clamp-2">{order.item_description}</p>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {order.building}
            {order.cost_center_code && ` / ${order.cost_center_code}`}
          </span>
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {order.requester_name}
          </span>
          <span className={cn('flex items-center gap-1', overdue && 'text-red-400', urgent && !overdue && 'text-amber-400')}>
            <Calendar className="h-3 w-3" />
            {fmtDate(order.date_needed)}
          </span>
        </div>

        {order.supplier_name && (
          <p className="text-xs text-muted-foreground">
            Supplier: <span className="text-foreground">{order.supplier_name}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
