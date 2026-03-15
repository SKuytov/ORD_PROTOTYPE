import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Order, OrderStatus, Building } from '@shared/schema';
import OrderTable from '@/components/OrderTable';
import OrderCard from '@/components/OrderCard';
import OrderDetail from '@/components/OrderDetail';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, X, LayoutGrid, List } from 'lucide-react';
import { isOverdue, isUrgentDeadline } from '@/lib/utils';

interface OrdersResponse { success: boolean; orders: Order[] }
interface BuildingsResponse { success: boolean; buildings: Building[] }

const STATUS_OPTIONS: (OrderStatus | 'all')[] = [
  'all', 'New', 'Pending', 'Quote Requested', 'Quote Received',
  'Quote Under Approval', 'Approved', 'Ordered', 'In Transit',
  'Partially Delivered', 'Delivered', 'Cancelled', 'On Hold',
];

const PRIORITY_OPTIONS = ['all', 'Urgent', 'High', 'Normal', 'Low'] as const;

type QuickFilter = 'all' | 'new' | 'urgent' | 'overdue' | 'this-week' | 'unassigned';

export default function OrdersPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const isProcurement = user?.role === 'procurement' || user?.role === 'admin';

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['/orders'],
    queryFn: () => api.get<OrdersResponse>('/orders'),
  });

  const { data: buildingsData } = useQuery({
    queryKey: ['/buildings'],
    queryFn: () => api.get<BuildingsResponse>('/buildings'),
  });

  const buildings = buildingsData?.buildings || [];
  const allOrders = ordersData?.orders || [];

  const filteredOrders = useMemo(() => {
    let result = allOrders;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        o.item_description.toLowerCase().includes(q) ||
        o.building.toLowerCase().includes(q) ||
        String(o.id).includes(q) ||
        (o.part_number && o.part_number.toLowerCase().includes(q)) ||
        (o.requester_name && o.requester_name.toLowerCase().includes(q)) ||
        (o.supplier_name && o.supplier_name.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter);
    }

    if (buildingFilter !== 'all') {
      result = result.filter(o => o.building === buildingFilter);
    }

    if (priorityFilter !== 'all') {
      result = result.filter(o => o.priority === priorityFilter);
    }

    switch (quickFilter) {
      case 'new': result = result.filter(o => o.status === 'New'); break;
      case 'urgent': result = result.filter(o => o.priority === 'Urgent'); break;
      case 'overdue': result = result.filter(o => isOverdue(o.date_needed) && !['Delivered', 'Cancelled'].includes(o.status)); break;
      case 'this-week': {
        const now = new Date();
        const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        result = result.filter(o => {
          const d = new Date(o.date_needed);
          return d >= now && d <= weekEnd && !['Delivered', 'Cancelled'].includes(o.status);
        });
        break;
      }
      case 'unassigned': result = result.filter(o => !o.assigned_to_user_id); break;
    }

    return result;
  }, [allOrders, search, statusFilter, buildingFilter, priorityFilter, quickFilter]);

  const pagedOrders = filteredOrders.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setBuildingFilter('all');
    setPriorityFilter('all');
    setQuickFilter('all');
    setPage(0);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pagedOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pagedOrders.map(o => o.id)));
    }
  };

  const hasFilters = search || statusFilter !== 'all' || buildingFilter !== 'all' || priorityFilter !== 'all' || quickFilter !== 'all';

  return (
    <div className="space-y-4" data-testid="orders-page">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
            data-testid="orders-search"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]" data-testid="status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={buildingFilter} onValueChange={(v) => { setBuildingFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[140px]" data-testid="building-filter">
            <SelectValue placeholder="Building" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buildings</SelectItem>
            {buildings.map(b => (
              <SelectItem key={b.code} value={b.code}>{b.code} — {b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[120px]" data-testid="priority-filter">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map(p => (
              <SelectItem key={p} value={p}>{p === 'all' ? 'All Priorities' : p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="clear-filters">
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}

        <div className="flex items-center gap-1 ml-auto">
          <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('table')} data-testid="view-table">
            <List className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === 'cards' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('cards')} data-testid="view-cards">
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {([
          { key: 'all', label: 'All' },
          { key: 'new', label: 'New' },
          { key: 'urgent', label: 'Urgent' },
          { key: 'overdue', label: 'Overdue' },
          { key: 'this-week', label: 'Due This Week' },
          ...(isProcurement ? [{ key: 'unassigned', label: 'Unassigned' }] : []),
        ] as { key: QuickFilter; label: string }[]).map(f => (
          <Badge
            key={f.key}
            variant={quickFilter === f.key ? 'default' : 'secondary'}
            className="cursor-pointer"
            onClick={() => { setQuickFilter(f.key); setPage(0); }}
            data-testid={`quick-filter-${f.key}`}
          >
            {f.label}
          </Badge>
        ))}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{filteredOrders.length} orders found</span>
        {isProcurement && selectedIds.size > 0 && (
          <Button size="sm" onClick={() => window.location.hash = '#/quotes'} data-testid="bulk-create-quote">
            Create Quote ({selectedIds.size} selected)
          </Button>
        )}
      </div>

      {/* Content */}
      {viewMode === 'table' ? (
        <OrderTable
          orders={pagedOrders}
          loading={isLoading}
          selectable={isProcurement}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={toggleSelectAll}
          onRowClick={(o) => setSelectedOrderId(o.id)}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse bg-muted rounded-lg" />
            ))
          ) : pagedOrders.length === 0 ? (
            <p className="col-span-full text-center py-8 text-muted-foreground">No orders found</p>
          ) : (
            pagedOrders.map(order => (
              <OrderCard key={order.id} order={order} onClick={() => setSelectedOrderId(order.id)} />
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} data-testid="page-prev">
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} data-testid="page-next">
            Next
          </Button>
        </div>
      )}

      <OrderDetail orderId={selectedOrderId} open={!!selectedOrderId} onClose={() => setSelectedOrderId(null)} />
    </div>
  );
}
