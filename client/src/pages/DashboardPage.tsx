import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Order, OrderStatus } from '@shared/schema';
import KpiCard from '@/components/KpiCard';
import OrderTable from '@/components/OrderTable';
import OrderDetail from '@/components/OrderDetail';
import StatusBadge from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocation } from 'wouter';
import { useState } from 'react';
import {
  ClipboardList, PlusCircle, AlertTriangle, Clock,
  ShoppingCart, Users, Truck, FileText, CheckSquare,
  Package, BarChart3, DollarSign,
} from 'lucide-react';
import { isOverdue, isUrgentDeadline, fmtPrice } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

interface OrdersResponse { success: boolean; orders: Order[] }

const CHART_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#6366f1', '#f97316', '#10b981', '#14b8a6', '#06b6d4', '#84cc16', '#22c55e', '#ef4444', '#6b7280'];

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role || 'requester';

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {role === 'requester' && <RequesterDashboard />}
      {role === 'procurement' && <ProcurementDashboard />}
      {role === 'manager' && <ManagerDashboard />}
      {role === 'admin' && <AdminDashboard />}
    </div>
  );
}

function RequesterDashboard() {
  const [, setLocation] = useLocation();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['/orders', { building: user?.building }],
    queryFn: () => api.get<OrdersResponse>(`/orders${user?.building ? `?building=${user.building}` : ''}`),
  });

  const orders = data?.orders || [];
  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});
  const overdueOrders = orders.filter(o => isOverdue(o.date_needed) && o.status !== 'Delivered' && o.status !== 'Cancelled');
  const urgentOrders = orders.filter(o => isUrgentDeadline(o.date_needed) && o.status !== 'Delivered' && o.status !== 'Cancelled');

  return (
    <>
      {/* Status Strip */}
      <div className="flex flex-wrap gap-2" data-testid="status-strip">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="flex items-center gap-1.5">
            <StatusBadge status={status as OrderStatus} />
            <span className="text-sm font-medium">{count}</span>
          </div>
        ))}
        {isLoading && <Skeleton className="h-6 w-48" />}
      </div>

      {/* Alerts */}
      {(overdueOrders.length > 0 || urgentOrders.length > 0) && (
        <div className="flex flex-wrap gap-3">
          {overdueOrders.length > 0 && (
            <Card className="border-red-500/50 bg-red-500/5">
              <CardContent className="p-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-red-400 font-medium">{overdueOrders.length} overdue order{overdueOrders.length > 1 ? 's' : ''}</span>
              </CardContent>
            </Card>
          )}
          {urgentOrders.length > 0 && (
            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardContent className="p-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" />
                <span className="text-sm text-amber-400 font-medium">{urgentOrders.length} due within 3 days</span>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* CTA */}
      <Card className="border-primary/30 bg-primary/5 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setLocation('/new-order')} data-testid="cta-new-order">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/20">
            <PlusCircle className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">Create New Order</p>
            <p className="text-sm text-muted-foreground">Submit a new procurement request</p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderTable orders={orders.slice(0, 10)} loading={isLoading} compact onRowClick={(o) => setSelectedOrderId(o.id)} />
        </CardContent>
      </Card>

      <OrderDetail orderId={selectedOrderId} open={!!selectedOrderId} onClose={() => setSelectedOrderId(null)} />
    </>
  );
}

function ProcurementDashboard() {
  const [, setLocation] = useLocation();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['/orders'],
    queryFn: () => api.get<OrdersResponse>('/orders'),
  });

  const { data: myOrders } = useQuery({
    queryKey: ['/order-assignments/my-orders'],
    queryFn: () => api.get<{ success: boolean; orders: Order[]; count: number }>('/order-assignments/my-orders'),
  });

  const { data: unassigned } = useQuery({
    queryKey: ['/order-assignments/unassigned'],
    queryFn: () => api.get<{ success: boolean; orders: Order[]; count: number }>('/order-assignments/unassigned'),
  });

  const orders = ordersData?.orders || [];
  const openOrders = orders.filter(o => !['Delivered', 'Cancelled'].includes(o.status));
  const inTransit = orders.filter(o => o.status === 'In Transit');
  const pendingQuotes = orders.filter(o => o.status === 'Quote Requested' || o.status === 'Quote Received');
  const urgentDeadlines = orders.filter(o => {
    const d = o.date_needed ? new Date(o.date_needed) : null;
    if (!d) return false;
    const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7 && !['Delivered', 'Cancelled'].includes(o.status);
  });

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard title="Open Orders" value={openOrders.length} icon={ClipboardList} />
        <KpiCard title="Unassigned" value={unassigned?.count || 0} icon={Users} color={unassigned?.count ? 'text-red-400' : 'text-muted-foreground'} onClick={() => setLocation('/orders')} />
        <KpiCard title="Pending Quotes" value={pendingQuotes.length} icon={FileText} color="text-purple-400" />
        <KpiCard title="In Transit" value={inTransit.length} icon={Truck} color="text-cyan-400" />
        <KpiCard title="Monthly Spend" value={fmtPrice(orders.reduce((s, o) => s + (o.total_price || 0), 0))} icon={DollarSign} color="text-emerald-400" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">My Assigned Orders</CardTitle>
              <span className="text-xs text-muted-foreground">{myOrders?.count || 0} orders</span>
            </div>
          </CardHeader>
          <CardContent>
            <OrderTable orders={(myOrders?.orders || []).slice(0, 8)} loading={isLoading} compact onRowClick={(o) => setSelectedOrderId(o.id)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Unassigned Queue</CardTitle>
              {(unassigned?.count || 0) > 0 && (
                <span className="bg-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded-full">{unassigned?.count}</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <OrderTable orders={(unassigned?.orders || []).slice(0, 8)} loading={isLoading} compact onRowClick={(o) => setSelectedOrderId(o.id)} />
          </CardContent>
        </Card>
      </div>

      {urgentDeadlines.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              Upcoming Deadlines (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OrderTable orders={urgentDeadlines.slice(0, 8)} compact onRowClick={(o) => setSelectedOrderId(o.id)} />
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button onClick={() => setLocation('/orders')} data-testid="quick-claim">
          <ShoppingCart className="h-4 w-4 mr-2" />
          View All Orders
        </Button>
        <Button variant="outline" onClick={() => setLocation('/quotes')} data-testid="quick-quote">
          <FileText className="h-4 w-4 mr-2" />
          Create Quote
        </Button>
      </div>

      <OrderDetail orderId={selectedOrderId} open={!!selectedOrderId} onClose={() => setSelectedOrderId(null)} />
    </>
  );
}

function ManagerDashboard() {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  const { data: approvalsData } = useQuery({
    queryKey: ['/approvals', { status: 'pending' }],
    queryFn: () => api.get<{ success: boolean; approvals: any[] }>('/approvals?status=pending'),
  });

  const { data: ordersData } = useQuery({
    queryKey: ['/orders'],
    queryFn: () => api.get<OrdersResponse>('/orders'),
  });

  const orders = ordersData?.orders || [];
  const pendingApprovals = approvalsData?.approvals || [];

  const statusData = Object.entries(
    orders.reduce<Record<string, number>>((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const buildingData = Object.entries(
    orders.reduce<Record<string, number>>((acc, o) => {
      acc[o.building] = (acc[o.building] || 0) + (o.total_price || 0);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: Math.round(value) })).filter(d => d.value > 0);

  return (
    <>
      <Card
        className={pendingApprovals.length > 0 ? 'border-red-500/50 bg-red-500/5 cursor-pointer' : 'cursor-pointer'}
        onClick={() => setLocation('/approvals')}
        data-testid="pending-approvals-card"
      >
        <CardContent className="p-6 flex items-center gap-4">
          <div className={`p-3 rounded-lg ${pendingApprovals.length > 0 ? 'bg-red-500/20' : 'bg-muted'}`}>
            <CheckSquare className={`h-6 w-6 ${pendingApprovals.length > 0 ? 'text-red-400' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <p className="text-3xl font-bold">{pendingApprovals.length}</p>
            <p className="text-sm text-muted-foreground">Pending Approvals</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Spend by Building</CardTitle>
          </CardHeader>
          <CardContent>
            {buildingData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={buildingData}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                    labelStyle={{ color: '#e2e8f0' }}
                    itemStyle={{ color: '#3b82f6' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No spend data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No order data</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderTable orders={orders.slice(0, 10)} compact onRowClick={(o) => setSelectedOrderId(o.id)} />
        </CardContent>
      </Card>

      <OrderDetail orderId={selectedOrderId} open={!!selectedOrderId} onClose={() => setSelectedOrderId(null)} />
    </>
  );
}

function AdminDashboard() {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['/orders'],
    queryFn: () => api.get<OrdersResponse>('/orders'),
  });

  const { data: usersData } = useQuery({
    queryKey: ['/users'],
    queryFn: () => api.get<{ success: boolean; users: any[] }>('/users'),
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['/suppliers'],
    queryFn: () => api.get<{ success: boolean; suppliers: any[] }>('/suppliers'),
  });

  const orders = ordersData?.orders || [];
  const totalSpend = orders.reduce((s, o) => s + (o.total_price || 0), 0);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Total Users" value={usersData?.users?.length || 0} icon={Users} />
        <KpiCard title="Total Suppliers" value={suppliersData?.suppliers?.length || 0} icon={Truck} />
        <KpiCard title="Total Orders" value={orders.length} icon={ClipboardList} />
        <KpiCard title="Total Spend" value={fmtPrice(totalSpend)} icon={DollarSign} color="text-emerald-400" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderTable orders={orders.slice(0, 15)} loading={isLoading} onRowClick={(o) => setSelectedOrderId(o.id)} />
        </CardContent>
      </Card>

      <OrderDetail orderId={selectedOrderId} open={!!selectedOrderId} onClose={() => setSelectedOrderId(null)} />
    </>
  );
}
