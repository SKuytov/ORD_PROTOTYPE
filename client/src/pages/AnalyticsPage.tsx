import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Order, Building } from '@shared/schema';
import KpiCard from '@/components/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { ClipboardList, DollarSign, Truck, TrendingUp, Package } from 'lucide-react';
import { fmtPrice } from '@/lib/utils';

interface OrdersResponse { success: boolean; orders: Order[] }
interface BuildingsResponse { success: boolean; buildings: Building[] }

const CHART_COLORS = [
  '#3b82f6', '#f59e0b', '#8b5cf6', '#6366f1', '#f97316',
  '#10b981', '#14b8a6', '#06b6d4', '#84cc16', '#22c55e',
  '#ef4444', '#6b7280',
];

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: 8 },
  labelStyle: { color: '#e2e8f0' },
  itemStyle: { color: '#94a3b8' },
};

export default function AnalyticsPage() {
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['/orders'],
    queryFn: () => api.get<OrdersResponse>('/orders'),
  });

  const { data: buildingsData } = useQuery({
    queryKey: ['/buildings'],
    queryFn: () => api.get<BuildingsResponse>('/buildings'),
  });

  const orders = ordersData?.orders || [];

  // Summary KPIs
  const totalOrders = orders.length;
  const totalSpend = orders.reduce((s, o) => s + (o.total_price || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalSpend / totalOrders : 0;
  const uniqueSuppliers = new Set(orders.filter(o => o.supplier_id).map(o => o.supplier_id)).size;
  const deliveredCount = orders.filter(o => o.status === 'Delivered').length;

  // Spend by Building
  const spendByBuilding = useMemo(() => {
    const map = orders.reduce<Record<string, number>>((acc, o) => {
      acc[o.building] = (acc[o.building] || 0) + (o.total_price || 0);
      return acc;
    }, {});
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [orders]);

  // Orders by Status (pie)
  const ordersByStatus = useMemo(() => {
    const map = orders.reduce<Record<string, number>>((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [orders]);

  // Orders Over Time (monthly line)
  const ordersOverTime = useMemo(() => {
    const map = orders.reduce<Record<string, { count: number; spend: number }>>((acc, o) => {
      const d = new Date(o.submission_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[key]) acc[key] = { count: 0, spend: 0 };
      acc[key].count++;
      acc[key].spend += o.total_price || 0;
      return acc;
    }, {});
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, orders: data.count, spend: Math.round(data.spend) }));
  }, [orders]);

  // Top Suppliers by spend
  const topSuppliers = useMemo(() => {
    const map = orders.reduce<Record<string, { name: string; spend: number; count: number }>>((acc, o) => {
      if (o.supplier_name) {
        if (!acc[o.supplier_name]) acc[o.supplier_name] = { name: o.supplier_name, spend: 0, count: 0 };
        acc[o.supplier_name].spend += o.total_price || 0;
        acc[o.supplier_name].count++;
      }
      return acc;
    }, {});
    return Object.values(map)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 10);
  }, [orders]);

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="analytics-page">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-[250px] w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="analytics-page">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard title="Total Orders" value={totalOrders} icon={ClipboardList} />
        <KpiCard title="Total Spend" value={fmtPrice(totalSpend)} icon={DollarSign} color="text-emerald-400" />
        <KpiCard title="Avg Order Value" value={fmtPrice(avgOrderValue)} icon={TrendingUp} color="text-blue-400" />
        <KpiCard title="Suppliers Used" value={uniqueSuppliers} icon={Truck} color="text-purple-400" />
        <KpiCard title="Delivered" value={deliveredCount} icon={Package} color="text-cyan-400" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Spend by Building */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Spend by Building</CardTitle>
          </CardHeader>
          <CardContent>
            {spendByBuilding.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={spendByBuilding}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(value: number) => fmtPrice(value)} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No spend data</p>
            )}
          </CardContent>
        </Card>

        {/* Orders by Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={ordersByStatus}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={55}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {ordersByStatus.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No order data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Orders Over Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Orders Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={ordersOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                  <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                  <Line yAxisId="right" type="monotone" dataKey="spend" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Top Suppliers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Suppliers by Spend</CardTitle>
          </CardHeader>
          <CardContent>
            {topSuppliers.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topSuppliers} layout="vertical">
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={120} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(value: number) => fmtPrice(value)} />
                  <Bar dataKey="spend" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No supplier data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
