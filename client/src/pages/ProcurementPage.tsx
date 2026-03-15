import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Order, ProcurementKPIs } from '@shared/schema';
import KpiCard from '@/components/KpiCard';
import OrderTable from '@/components/OrderTable';
import OrderDetail from '@/components/OrderDetail';
import StatusBadge from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import {
  ClipboardList, Users, FileText, Truck, DollarSign,
  AlertTriangle, Clock, ShoppingCart, ArrowRight,
  Package, Receipt, CheckCircle2, ExternalLink, Plus, Search,
} from 'lucide-react';
import { fmtPrice, fmtDate, isOverdue } from '@/lib/utils';

interface OrdersResponse { success: boolean; orders: Order[] }
interface KPIsResponse { success: boolean; kpis: ProcurementKPIs }

interface PO {
  id: number;
  po_number: string;
  supplier_name: string;
  created_by_name: string;
  quote_number?: string;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
  expected_delivery_date?: string;
  item_count: number;
}

interface Invoice {
  id: number;
  invoice_number: string;
  supplier_name: string;
  po_number?: string;
  total_amount: number;
  currency: string;
  status: string;
  invoice_date: string;
  payment_due_date?: string;
  paid_at?: string;
}

export default function ProcurementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [poSearch, setPoSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ po_id: '', invoice_number: '', total_amount: '', payment_due_date: '', notes: '' });

  const { data: kpisData, isLoading: kpisLoading } = useQuery({
    queryKey: ['/procurement/kpis'],
    queryFn: () => api.get<KPIsResponse>('/procurement/kpis'),
  });

  const { data: myOrders } = useQuery({
    queryKey: ['/order-assignments/my-orders'],
    queryFn: () => api.get<{ success: boolean; orders: Order[]; count: number }>('/order-assignments/my-orders'),
  });

  const { data: unassigned } = useQuery({
    queryKey: ['/order-assignments/unassigned'],
    queryFn: () => api.get<{ success: boolean; orders: Order[]; count: number }>('/order-assignments/unassigned'),
  });

  const { data: ordersData } = useQuery({
    queryKey: ['/orders'],
    queryFn: () => api.get<OrdersResponse>('/orders'),
  });

  const { data: posData, isLoading: posLoading } = useQuery({
    queryKey: ['/procurement/purchase-orders'],
    queryFn: () => api.get<{ success: boolean; purchase_orders: PO[] }>('/procurement/purchase-orders'),
    enabled: activeTab === 'purchase-orders' || activeTab === 'dashboard',
  });

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['/procurement/invoices'],
    queryFn: () => api.get<{ success: boolean; invoices: Invoice[] }>('/procurement/invoices'),
    enabled: activeTab === 'invoices' || activeTab === 'dashboard',
  });

  const claimMutation = useMutation({
    mutationFn: (orderId: number) => api.post(`/order-assignments/${orderId}/claim`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/order-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/orders'] });
      toast({ title: 'Order claimed' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const updatePoMutation = useMutation({
    mutationFn: ({ poId, status }: { poId: number; status: string }) =>
      api.put(`/procurement/purchase-orders/${poId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/procurement/purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/orders'] });
      toast({ title: 'PO updated' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: ({ invoiceId, status, paid_at }: { invoiceId: number; status: string; paid_at?: string }) =>
      api.put(`/procurement/invoices/${invoiceId}`, { status, paid_at }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/procurement/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/procurement/kpis'] });
      toast({ title: 'Invoice updated' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const createInvoiceMutation = useMutation({
    mutationFn: () => api.post('/procurement/invoices', {
      po_id: invoiceForm.po_id ? parseInt(invoiceForm.po_id) : undefined,
      invoice_number: invoiceForm.invoice_number,
      total_amount: parseFloat(invoiceForm.total_amount) || 0,
      payment_due_date: invoiceForm.payment_due_date || undefined,
      notes: invoiceForm.notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/procurement/invoices'] });
      setShowNewInvoice(false);
      setInvoiceForm({ po_id: '', invoice_number: '', total_amount: '', payment_due_date: '', notes: '' });
      toast({ title: 'Invoice created' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const kpis = kpisData?.kpis;
  const allOrders = ordersData?.orders || [];
  const myOrdersList = myOrders?.orders || [];
  const unassignedList = unassigned?.orders || [];
  const pos = posData?.purchase_orders || [];
  const invoices = invoicesData?.invoices || [];

  const filteredPos = pos.filter(po => {
    if (!poSearch) return true;
    const q = poSearch.toLowerCase();
    return po.po_number.toLowerCase().includes(q) || (po.supplier_name && po.supplier_name.toLowerCase().includes(q));
  });

  const filteredInvoices = invoices.filter(inv => {
    if (!invoiceSearch) return true;
    const q = invoiceSearch.toLowerCase();
    return inv.invoice_number.toLowerCase().includes(q) || (inv.supplier_name && inv.supplier_name.toLowerCase().includes(q));
  });

  const pipelineCounts = allOrders.reduce<Record<string, number>>((acc, o) => {
    if (!['Delivered', 'Cancelled'].includes(o.status)) {
      acc[o.status] = (acc[o.status] || 0) + 1;
    }
    return acc;
  }, {});

  const recentQuoteOrders = allOrders.filter(o => o.status === 'Quote Requested' || o.status === 'Quote Received').slice(0, 5);
  const upcomingDeadlines = allOrders.filter(o => {
    if (['Delivered', 'Cancelled'].includes(o.status)) return false;
    const d = o.date_needed ? new Date(o.date_needed) : null;
    if (!d) return false;
    const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }).sort((a, b) => new Date(a.date_needed).getTime() - new Date(b.date_needed).getTime()).slice(0, 8);

  const poStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-500/20 text-gray-300';
      case 'Sent': return 'bg-blue-500/20 text-blue-300';
      case 'Confirmed': return 'bg-indigo-500/20 text-indigo-300';
      case 'In Transit': return 'bg-cyan-500/20 text-cyan-300';
      case 'Received': return 'bg-emerald-500/20 text-emerald-300';
      case 'Cancelled': return 'bg-red-500/20 text-red-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const invStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-300';
      case 'approved': return 'bg-blue-500/20 text-blue-300';
      case 'paid': return 'bg-emerald-500/20 text-emerald-300';
      case 'overdue': return 'bg-red-500/20 text-red-300';
      case 'disputed': return 'bg-orange-500/20 text-orange-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  return (
    <div className="space-y-4" data-testid="procurement-page">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="purchase-orders" data-testid="tab-pos">Purchase Orders</TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-invoices">Invoices</TabsTrigger>
        </TabsList>

        {/* ===== DASHBOARD TAB ===== */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {kpisLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
              ))
            ) : (
              <>
                <KpiCard title="Open Orders" value={kpis?.openOrders ?? 0} icon={ClipboardList} />
                <KpiCard
                  title="Unassigned"
                  value={kpis?.unassignedOrders ?? 0}
                  icon={Users}
                  color={(kpis?.unassignedOrders ?? 0) > 0 ? 'text-red-400' : undefined}
                />
                <KpiCard title="Pending Quotes" value={kpis?.pendingQuotes ?? 0} icon={FileText} color="text-purple-400" />
                <KpiCard title="In Transit" value={kpis?.inTransit ?? 0} icon={Truck} color="text-cyan-400" />
                <KpiCard
                  title="Month Spend"
                  value={fmtPrice(kpis?.totalSpendThisMonth ?? 0)}
                  icon={DollarSign}
                  color="text-emerald-400"
                />
              </>
            )}
          </div>

          {/* Additional KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard title="Active POs" value={pos.filter(p => !['Received','Cancelled'].includes(p.status)).length} icon={Package} color="text-blue-400" />
            <KpiCard title="Pending Invoices" value={invoices.filter(i => i.status === 'pending').length} icon={Receipt} color="text-amber-400" />
            <KpiCard title="Overdue Invoices" value={invoices.filter(i => i.status === 'overdue').length} icon={AlertTriangle} color="text-red-400" />
            <KpiCard title="Paid This Month" value={invoices.filter(i => i.status === 'paid' && i.paid_at && new Date(i.paid_at).getMonth() === new Date().getMonth()).length} icon={CheckCircle2} color="text-emerald-400" />
          </div>

          {/* Overdue Alert */}
          {(kpis?.overdueOrders ?? 0) > 0 && (
            <Card className="border-red-500/50 bg-red-500/5">
              <CardContent className="p-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-red-400 font-medium">{kpis?.overdueOrders} overdue order(s) need attention</span>
              </CardContent>
            </Card>
          )}

          {/* Pipeline View */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Order Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(pipelineCounts).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-1.5">
                    <StatusBadge status={status as any} />
                    <span className="text-sm font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* My Work Queue + Unassigned Pool */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">My Work Queue</CardTitle>
                  <span className="text-xs text-muted-foreground">{myOrders?.count || 0} orders</span>
                </div>
              </CardHeader>
              <CardContent>
                <OrderTable
                  orders={myOrdersList.slice(0, 8)}
                  compact
                  onRowClick={(o) => setSelectedOrderId(o.id)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Unassigned Pool</CardTitle>
                  {(unassigned?.count || 0) > 0 && (
                    <Badge variant="destructive" className="text-xs">{unassigned?.count}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {unassignedList.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">All orders are assigned</p>
                ) : (
                  <div className="space-y-2">
                    {unassignedList.slice(0, 6).map(o => (
                      <div
                        key={o.id}
                        className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-muted/20 transition-colors"
                        data-testid={`unassigned-order-${o.id}`}
                      >
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedOrderId(o.id)}>
                          <p className="text-sm font-medium truncate">#{o.id} — {o.item_description}</p>
                          <p className="text-xs text-muted-foreground">{o.building} · {o.priority} · Due {fmtDate(o.date_needed)}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); claimMutation.mutate(o.id); }}
                          disabled={claimMutation.isPending}
                          data-testid={`claim-btn-${o.id}`}
                        >
                          Claim
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Quotes */}
          {recentQuoteOrders.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-400" />
                  Recent Quote Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OrderTable orders={recentQuoteOrders} compact onRowClick={(o) => setSelectedOrderId(o.id)} />
              </CardContent>
            </Card>
          )}

          {/* Upcoming Deadlines */}
          {upcomingDeadlines.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-400" />
                  Upcoming Deadlines (7 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OrderTable orders={upcomingDeadlines} compact onRowClick={(o) => setSelectedOrderId(o.id)} />
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setLocation('/orders')} data-testid="procurement-view-all">
              <ShoppingCart className="h-4 w-4 mr-2" /> View All Orders
            </Button>
            <Button variant="outline" onClick={() => setLocation('/quotes')} data-testid="procurement-quotes">
              <FileText className="h-4 w-4 mr-2" /> Quotes
            </Button>
            <Button variant="outline" onClick={() => setLocation('/suppliers')} data-testid="procurement-suppliers">
              <Truck className="h-4 w-4 mr-2" /> Suppliers
            </Button>
          </div>
        </TabsContent>

        {/* ===== PURCHASE ORDERS TAB ===== */}
        <TabsContent value="purchase-orders" className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search purchase orders..."
                value={poSearch}
                onChange={(e) => setPoSearch(e.target.value)}
                className="pl-9"
                data-testid="po-search"
              />
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">PO #</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Supplier</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Quote</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Items</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Expected</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Created</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i} className="border-b border-border">
                          {Array.from({ length: 9 }).map((_, j) => (
                            <td key={j} className="p-3"><Skeleton className="h-4 w-16" /></td>
                          ))}
                        </tr>
                      ))
                    ) : filteredPos.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-muted-foreground">No purchase orders found</td>
                      </tr>
                    ) : (
                      filteredPos.map(po => (
                        <tr key={po.id} className="border-b border-border hover:bg-muted/20 transition-colors" data-testid={`po-row-${po.id}`}>
                          <td className="p-3 font-mono text-xs font-medium">{po.po_number}</td>
                          <td className="p-3">{po.supplier_name || '—'}</td>
                          <td className="p-3 text-xs text-muted-foreground">{po.quote_number || '—'}</td>
                          <td className="p-3">
                            <Badge variant="outline" className={poStatusColor(po.status)}>{po.status}</Badge>
                          </td>
                          <td className="p-3 text-right font-medium">{fmtPrice(po.total_amount)}</td>
                          <td className="p-3 text-center">{po.item_count}</td>
                          <td className="p-3 text-muted-foreground">{po.expected_delivery_date ? fmtDate(po.expected_delivery_date) : '—'}</td>
                          <td className="p-3 text-muted-foreground">{fmtDate(po.created_at)}</td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              {po.status === 'Draft' && (
                                <Button size="sm" variant="outline" className="h-6 text-xs px-2"
                                  onClick={() => updatePoMutation.mutate({ poId: po.id, status: 'Sent' })}
                                  data-testid={`po-send-${po.id}`}
                                >Send</Button>
                              )}
                              {po.status === 'Sent' && (
                                <Button size="sm" variant="outline" className="h-6 text-xs px-2"
                                  onClick={() => updatePoMutation.mutate({ poId: po.id, status: 'Confirmed' })}
                                  data-testid={`po-confirm-${po.id}`}
                                >Confirm</Button>
                              )}
                              {po.status === 'Confirmed' && (
                                <Button size="sm" variant="outline" className="h-6 text-xs px-2"
                                  onClick={() => updatePoMutation.mutate({ poId: po.id, status: 'In Transit' })}
                                  data-testid={`po-transit-${po.id}`}
                                >In Transit</Button>
                              )}
                              {po.status === 'In Transit' && (
                                <Button size="sm" variant="outline" className="h-6 text-xs px-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  onClick={() => updatePoMutation.mutate({ poId: po.id, status: 'Received' })}
                                  data-testid={`po-receive-${po.id}`}
                                >Received</Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== INVOICES TAB ===== */}
        <TabsContent value="invoices" className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                className="pl-9"
                data-testid="invoice-search"
              />
            </div>
            <Button onClick={() => setShowNewInvoice(true)} data-testid="new-invoice-btn">
              <Plus className="h-4 w-4 mr-2" /> New Invoice
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">Invoice #</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Supplier</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">PO</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Invoice Date</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Due Date</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoicesLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i} className="border-b border-border">
                          {Array.from({ length: 8 }).map((_, j) => (
                            <td key={j} className="p-3"><Skeleton className="h-4 w-16" /></td>
                          ))}
                        </tr>
                      ))
                    ) : filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">No invoices found</td>
                      </tr>
                    ) : (
                      filteredInvoices.map(inv => (
                        <tr key={inv.id} className="border-b border-border hover:bg-muted/20 transition-colors" data-testid={`invoice-row-${inv.id}`}>
                          <td className="p-3 font-mono text-xs font-medium">{inv.invoice_number}</td>
                          <td className="p-3">{inv.supplier_name || '—'}</td>
                          <td className="p-3 text-xs text-muted-foreground">{inv.po_number || '—'}</td>
                          <td className="p-3">
                            <Badge variant="outline" className={invStatusColor(inv.status)}>{inv.status}</Badge>
                          </td>
                          <td className="p-3 text-right font-medium">{fmtPrice(inv.total_amount)} {inv.currency}</td>
                          <td className="p-3 text-muted-foreground">{fmtDate(inv.invoice_date)}</td>
                          <td className={`p-3 ${inv.payment_due_date && !inv.paid_at && new Date(inv.payment_due_date) < new Date() ? 'text-red-400 font-medium' : 'text-muted-foreground'}`}>
                            {inv.payment_due_date ? fmtDate(inv.payment_due_date) : '—'}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              {inv.status === 'pending' && (
                                <Button size="sm" variant="outline" className="h-6 text-xs px-2"
                                  onClick={() => updateInvoiceMutation.mutate({ invoiceId: inv.id, status: 'approved' })}
                                  data-testid={`inv-approve-${inv.id}`}
                                >Approve</Button>
                              )}
                              {inv.status === 'approved' && (
                                <Button size="sm" variant="outline" className="h-6 text-xs px-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  onClick={() => updateInvoiceMutation.mutate({ invoiceId: inv.id, status: 'paid', paid_at: new Date().toISOString() })}
                                  data-testid={`inv-pay-${inv.id}`}
                                >Mark Paid</Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Summary Row */}
          {filteredInvoices.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Pending Payment</p>
                  <p className="text-lg font-bold text-amber-400">
                    {fmtPrice(filteredInvoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.total_amount || 0), 0))}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Paid Total</p>
                  <p className="text-lg font-bold text-emerald-400">
                    {fmtPrice(filteredInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total_amount || 0), 0))}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Overdue</p>
                  <p className="text-lg font-bold text-red-400">
                    {filteredInvoices.filter(i => i.status === 'overdue').length}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* New Invoice Dialog */}
      <Dialog open={showNewInvoice} onOpenChange={setShowNewInvoice}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Record New Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Invoice Number *</Label>
                <Input
                  value={invoiceForm.invoice_number}
                  onChange={(e) => setInvoiceForm(f => ({ ...f, invoice_number: e.target.value }))}
                  placeholder="INV-2024-001"
                  data-testid="invoice-number-input"
                />
              </div>
              <div className="space-y-1">
                <Label>Total Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={invoiceForm.total_amount}
                  onChange={(e) => setInvoiceForm(f => ({ ...f, total_amount: e.target.value }))}
                  placeholder="0.00"
                  data-testid="invoice-amount-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Linked PO</Label>
                <Select value={invoiceForm.po_id} onValueChange={(v) => setInvoiceForm(f => ({ ...f, po_id: v }))}>
                  <SelectTrigger data-testid="invoice-po-select">
                    <SelectValue placeholder="Select PO..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pos.map(po => (
                      <SelectItem key={po.id} value={String(po.id)}>{po.po_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Payment Due</Label>
                <Input
                  type="date"
                  value={invoiceForm.payment_due_date}
                  onChange={(e) => setInvoiceForm(f => ({ ...f, payment_due_date: e.target.value }))}
                  data-testid="invoice-due-input"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes..."
                data-testid="invoice-notes-input"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => createInvoiceMutation.mutate()}
              disabled={!invoiceForm.invoice_number || !invoiceForm.total_amount || createInvoiceMutation.isPending}
              data-testid="submit-invoice"
            >
              {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <OrderDetail orderId={selectedOrderId} open={!!selectedOrderId} onClose={() => setSelectedOrderId(null)} />
    </div>
  );
}
