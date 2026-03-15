import { Order } from '@shared/schema';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import { fmtDate, fmtPrice, isOverdue, isUrgentDeadline, cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface OrderTableProps {
  orders: Order[];
  loading?: boolean;
  selectable?: boolean;
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
  onSelectAll?: () => void;
  onRowClick?: (order: Order) => void;
  compact?: boolean;
}

export default function OrderTable({
  orders,
  loading,
  selectable,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onRowClick,
  compact,
}: OrderTableProps) {
  if (loading) {
    return (
      <div className="space-y-2" data-testid="orders-loading">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground" data-testid="orders-empty">
        No orders found
      </div>
    );
  }

  return (
    <div className="rounded-md border" data-testid="orders-table">
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-10">
                <Checkbox
                  data-testid="select-all"
                  checked={selectedIds?.size === orders.length && orders.length > 0}
                  onCheckedChange={onSelectAll}
                />
              </TableHead>
            )}
            <TableHead className="w-16">ID</TableHead>
            <TableHead>Item</TableHead>
            {!compact && <TableHead>Building/CC</TableHead>}
            <TableHead className="w-20">Priority</TableHead>
            <TableHead className="w-32">Status</TableHead>
            {!compact && <TableHead>Supplier</TableHead>}
            <TableHead className="w-24">Needed</TableHead>
            {!compact && <TableHead>Assigned</TableHead>}
            {!compact && <TableHead className="text-right w-24">Price</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const overdue = isOverdue(order.date_needed);
            const urgent = isUrgentDeadline(order.date_needed);
            return (
              <TableRow
                key={order.id}
                data-testid={`order-row-${order.id}`}
                className={cn(
                  'cursor-pointer hover:bg-muted/50',
                  overdue && 'bg-red-500/5',
                  selectedIds?.has(order.id) && 'bg-primary/10'
                )}
                onClick={() => onRowClick?.(order)}
              >
                {selectable && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      data-testid={`select-order-${order.id}`}
                      checked={selectedIds?.has(order.id) || false}
                      onCheckedChange={() => onToggleSelect?.(order.id)}
                    />
                  </TableCell>
                )}
                <TableCell className="font-mono text-xs text-muted-foreground">#{order.id}</TableCell>
                <TableCell className="max-w-[200px]">
                  <span className="line-clamp-1 text-sm">{order.item_description}</span>
                </TableCell>
                {!compact && (
                  <TableCell className="text-xs text-muted-foreground">
                    {order.building}
                    {order.cost_center_code && ` / ${order.cost_center_code}`}
                  </TableCell>
                )}
                <TableCell><PriorityBadge priority={order.priority} /></TableCell>
                <TableCell><StatusBadge status={order.status} /></TableCell>
                {!compact && (
                  <TableCell className="text-xs text-muted-foreground">{order.supplier_name || '—'}</TableCell>
                )}
                <TableCell className={cn('text-xs', overdue && 'text-red-400', urgent && !overdue && 'text-amber-400')}>
                  {fmtDate(order.date_needed)}
                </TableCell>
                {!compact && (
                  <TableCell className="text-xs text-muted-foreground">{order.assigned_to_name || '—'}</TableCell>
                )}
                {!compact && (
                  <TableCell className="text-right text-xs">{fmtPrice(order.total_price || order.price)}</TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
