import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Quote, QuoteItem, Order, Supplier, SupplierSuggestion } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  FileText, Plus, Search, ChevronRight, ChevronLeft,
  Star, Loader2, Send, X,
} from 'lucide-react';
import { fmtDate, fmtPrice } from '@/lib/utils';

interface QuotesResponse { success: boolean; quotes: Quote[] }
interface OrdersResponse { success: boolean; orders: Order[] }
interface SuppliersResponse { success: boolean; suppliers: Supplier[] }
interface SuggestionsResponse { success: boolean; suggestions: SupplierSuggestion[] }

const QUOTE_STATUSES = ['all', 'Draft', 'Sent to Supplier', 'Received', 'Under Approval', 'Approved', 'Rejected'] as const;

export default function QuotesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showWizard, setShowWizard] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);

  const { data: quotesData, isLoading } = useQuery({
    queryKey: ['/quotes'],
    queryFn: () => api.get<QuotesResponse>('/quotes'),
  });

  const quotes = (quotesData?.quotes || []).filter(q => {
    if (statusFilter !== 'all' && q.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        q.quote_number.toLowerCase().includes(s) ||
        (q.supplier_name && q.supplier_name.toLowerCase().includes(s)) ||
        String(q.id).includes(s)
      );
    }
    return true;
  });

  const statusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-500/20 text-gray-300';
      case 'Sent to Supplier': return 'bg-blue-500/20 text-blue-300';
      case 'Received': return 'bg-indigo-500/20 text-indigo-300';
      case 'Under Approval': return 'bg-orange-500/20 text-orange-300';
      case 'Approved': return 'bg-emerald-500/20 text-emerald-300';
      case 'Rejected': return 'bg-red-500/20 text-red-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  return (
    <div className="space-y-4" data-testid="quotes-page">
      {/* Header */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search quotes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="quotes-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="quote-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {QUOTE_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(user?.role === 'procurement' || user?.role === 'admin') && (
          <Button onClick={() => setShowWizard(true)} data-testid="new-quote-btn">
            <Plus className="h-4 w-4 mr-2" /> New Quote
          </Button>
        )}
      </div>

      {/* Quotes Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">ID</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Quote #</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Supplier</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Valid Until</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="p-3"><Skeleton className="h-4 w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : quotes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">No quotes found</td>
                  </tr>
                ) : (
                  quotes.map(q => (
                    <tr
                      key={q.id}
                      className="border-b border-border hover:bg-muted/20 cursor-pointer transition-colors"
                      onClick={() => setSelectedQuoteId(q.id)}
                      data-testid={`quote-row-${q.id}`}
                    >
                      <td className="p-3 font-mono text-xs">{q.id}</td>
                      <td className="p-3 font-medium">{q.quote_number}</td>
                      <td className="p-3">{q.supplier_name || '—'}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={statusColor(q.status)}>{q.status}</Badge>
                      </td>
                      <td className="p-3 text-right font-medium">{fmtPrice(q.total_amount)} {q.currency}</td>
                      <td className="p-3 text-muted-foreground">{q.valid_until ? fmtDate(q.valid_until) : '—'}</td>
                      <td className="p-3 text-muted-foreground">{fmtDate(q.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* New Quote Wizard */}
      {showWizard && (
        <NewQuoteWizard
          onClose={() => setShowWizard(false)}
          onSuccess={() => {
            setShowWizard(false);
            queryClient.invalidateQueries({ queryKey: ['/quotes'] });
          }}
        />
      )}

      {/* Quote Detail */}
      <QuoteDetail
        quoteId={selectedQuoteId}
        open={!!selectedQuoteId}
        onClose={() => setSelectedQuoteId(null)}
      />
    </div>
  );
}

function NewQuoteWizard({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [notes, setNotes] = useState('');

  const { data: ordersData } = useQuery({
    queryKey: ['/orders'],
    queryFn: () => api.get<OrdersResponse>('/orders'),
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['/suppliers'],
    queryFn: () => api.get<SuppliersResponse>('/suppliers'),
  });

  // Use the first selected order ID to get AI supplier suggestions
  const firstOrderId = Array.from(selectedOrderIds)[0];
  const { data: suggestionsData } = useQuery({
    queryKey: ['/suppliers/suggestions', Array.from(selectedOrderIds)],
    queryFn: () => api.get<SuggestionsResponse>(`/suppliers/suggestions/${firstOrderId}`),
    enabled: step === 2 && selectedOrderIds.size > 0 && !!firstOrderId,
  });

  const createQuote = useMutation({
    mutationFn: () => api.post<{ success: boolean; quoteId: number }>('/quotes', {
      order_ids: Array.from(selectedOrderIds),
      supplier_id: supplierId,
      notes,
      currency: 'EUR',
    }),
    onSuccess: (res) => {
      toast({ title: 'Quote created', description: `Quote #${res.quoteId} created` });
      onSuccess();
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const availableOrders = (ordersData?.orders || []).filter(o =>
    ['New', 'Pending', 'Quote Requested'].includes(o.status)
  );

  const suppliers = (suppliersData?.suppliers || []).filter(s =>
    s.active && (!supplierSearch || s.name.toLowerCase().includes(supplierSearch.toLowerCase()))
  );

  const suggestions = suggestionsData?.suggestions || [];
  const selectedSupplier = (suppliersData?.suppliers || []).find(s => s.id === supplierId);

  const toggleOrder = (id: number) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" data-testid="quote-wizard">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle>New Quote — Step {step} of 3</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
          <div className="flex gap-2 mt-2">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground">Select orders to include in this quote:</p>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {availableOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No eligible orders</p>
                ) : (
                  availableOrders.map(o => (
                    <div
                      key={o.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedOrderIds.has(o.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'
                      }`}
                      onClick={() => toggleOrder(o.id)}
                      data-testid={`wizard-order-${o.id}`}
                    >
                      <Checkbox checked={selectedOrderIds.has(o.id)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">#{o.id} — {o.item_description}</p>
                        <p className="text-xs text-muted-foreground">{o.building} · Qty {o.quantity} · {o.priority}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground">{selectedOrderIds.size} order(s) selected</p>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">Choose a supplier for this quote:</p>

              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">AI Suggestions</p>
                  {suggestions.map(s => (
                    <div
                      key={s.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        supplierId === s.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'
                      }`}
                      onClick={() => setSupplierId(s.id)}
                      data-testid={`suggestion-supplier-${s.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{s.name}</p>
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">Score: {s.score}</Badge>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < Math.round(s.performance_score / 2) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`} />
                          ))}
                          <span className="text-xs text-muted-foreground ml-1">{s.total_orders} orders</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{s.match_reasons.join(' · ')}</p>
                      </div>
                    </div>
                  ))}
                  <Separator />
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">All Suppliers</p>
                <Input
                  placeholder="Search suppliers..."
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  data-testid="wizard-supplier-search"
                />
                <div className="max-h-[30vh] overflow-y-auto space-y-1">
                  {suppliers.slice(0, 20).map(s => (
                    <div
                      key={s.id}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                        supplierId === s.id ? 'bg-primary/10' : 'hover:bg-muted/30'
                      }`}
                      onClick={() => setSupplierId(s.id)}
                      data-testid={`wizard-supplier-${s.id}`}
                    >
                      <span className="text-sm">{s.name}</span>
                      {s.is_eu === 1 && <Badge variant="outline" className="text-[10px]">EU</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-muted-foreground">Review and confirm:</p>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Orders</p>
                  <p className="text-sm font-medium">{selectedOrderIds.size} order(s) selected</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Supplier</p>
                  <p className="text-sm font-medium">{selectedSupplier?.name || 'Not selected'}</p>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes for this quote..."
                    rows={3}
                    data-testid="wizard-notes"
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>

        <div className="flex items-center justify-between p-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => step === 1 ? onClose() : setStep(s => s - 1)}
            data-testid="wizard-back"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          {step < 3 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={(step === 1 && selectedOrderIds.size === 0) || (step === 2 && !supplierId)}
              data-testid="wizard-next"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => createQuote.mutate()}
              disabled={createQuote.isPending || selectedOrderIds.size === 0}
              data-testid="wizard-submit"
            >
              {createQuote.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Create Quote
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function QuoteDetail({ quoteId, open, onClose }: { quoteId: number | null; open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [itemPrices, setItemPrices] = useState<Record<number, string>>({});
  const [itemQtys, setItemQtys] = useState<Record<number, string>>({});
  const [editingPrices, setEditingPrices] = useState(false);
  const [validUntil, setValidUntil] = useState('');
  const [showPOConfirm, setShowPOConfirm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['/quotes', quoteId],
    queryFn: () => api.get<{ success: boolean; quote: Quote }>(`/quotes/${quoteId}`),
    enabled: !!quoteId && open,
  });

  const statusMutation = useMutation({
    mutationFn: (payload: object) =>
      api.put(`/quotes/${quoteId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/quotes', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['/orders'] });
      toast({ title: 'Quote updated' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const savePricesMutation = useMutation({
    mutationFn: () => {
      const items = (quote?.items || []).map(item => ({
        id: item.id,
        order_id: item.order_id,
        unit_price: parseFloat(itemPrices[item.id] || '0') || 0,
        quantity: parseInt(itemQtys[item.id] || String(item.quantity), 10) || item.quantity,
      }));
      return api.put(`/quotes/${quoteId}`, { items, valid_until: validUntil || undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/quotes', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/orders'] });
      setEditingPrices(false);
      toast({ title: 'Prices saved' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const createPOMutation = useMutation({
    mutationFn: () =>
      api.post<{ success: boolean; poId: number; poNumber: string }>('/procurement/purchase-orders', {
        quote_id: quoteId,
        supplier_id: quote?.supplier_id,
        currency: quote?.currency || 'EUR',
        notes: `Auto-created from Quote ${quote?.quote_number}`,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/procurement/purchase-orders'] });
      setShowPOConfirm(false);
      toast({ title: 'Purchase Order created', description: `PO ${res.poNumber} created successfully` });
      onClose();
    },
    onError: (err: Error) => toast({ title: 'PO Error', description: err.message, variant: 'destructive' }),
  });

  const quote = data?.quote;
  const isProcurement = user?.role === 'procurement' || user?.role === 'admin';
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  // Initialize price/qty fields when quote loads
  useEffect(() => {
    if (quote?.items) {
      const prices: Record<number, string> = {};
      const qtys: Record<number, string> = {};
      quote.items.forEach(item => {
        prices[item.id] = item.unit_price ? String(item.unit_price) : '';
        qtys[item.id] = String(item.quantity);
      });
      setItemPrices(prices);
      setItemQtys(qtys);
      if (quote.valid_until) setValidUntil(quote.valid_until.split('T')[0]);
    }
  }, [quote?.id, quote?.items]);

  const computedTotal = (quote?.items || []).reduce((sum, item) => {
    const price = parseFloat(itemPrices[item.id] || '0') || 0;
    const qty = parseInt(itemQtys[item.id] || String(item.quantity), 10) || item.quantity;
    return sum + price * qty;
  }, 0);

  const statusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-500/20 text-gray-300';
      case 'Sent to Supplier': return 'bg-blue-500/20 text-blue-300';
      case 'Received': return 'bg-indigo-500/20 text-indigo-300';
      case 'Under Approval': return 'bg-orange-500/20 text-orange-300';
      case 'Approved': return 'bg-emerald-500/20 text-emerald-300';
      case 'Rejected': return 'bg-red-500/20 text-red-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const WORKFLOW_STEPS = ['Draft', 'Sent to Supplier', 'Received', 'Under Approval', 'Approved'];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[560px] overflow-y-auto" data-testid="quote-detail-panel">
        {isLoading || !quote ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="pb-4 border-b border-border px-6 pt-6">
              <div className="flex items-center gap-2 flex-wrap">
                <SheetTitle>Quote #{quote.id}</SheetTitle>
                <Badge variant="outline" className={statusColor(quote.status)}>{quote.status}</Badge>
              </div>
              <SheetDescription>{quote.quote_number}</SheetDescription>
            </SheetHeader>

            {/* Workflow Progress Bar */}
            <div className="px-6 py-3 border-b border-border">
              <div className="flex items-center gap-1">
                {WORKFLOW_STEPS.map((step, i) => {
                  const stepIdx = WORKFLOW_STEPS.indexOf(quote.status);
                  const isActive = step === quote.status;
                  const isPast = i < stepIdx;
                  return (
                    <div key={step} className="flex items-center flex-1">
                      {i > 0 && <div className={`h-0.5 flex-1 ${isPast || isActive ? 'bg-primary' : 'bg-border'}`} />}
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-primary ring-2 ring-primary/30' : isPast ? 'bg-primary' : 'bg-border'}`} />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-1">
                {WORKFLOW_STEPS.map(step => (
                  <span key={step} className={`text-[9px] ${step === quote.status ? 'text-primary font-medium' : 'text-muted-foreground/60'}`}>
                    {step.split(' ')[0]}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-4 p-6">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Supplier</p>
                  <p className="font-medium">{quote.supplier_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-bold text-primary">
                    {editingPrices ? fmtPrice(computedTotal) : fmtPrice(quote.total_amount)} {quote.currency}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valid Until</p>
                  {editingPrices ? (
                    <input
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="text-sm border border-border rounded px-1 py-0.5 bg-background w-full"
                    />
                  ) : (
                    <p className="font-medium">{quote.valid_until ? fmtDate(quote.valid_until) : '—'}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="font-medium">{fmtDate(quote.created_at)}</p>
                </div>
              </div>

              {quote.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
                </div>
              )}

              {/* Items with Price Entry */}
              {quote.items && quote.items.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground">Items ({quote.items.length})</p>
                    {isProcurement && (quote.status === 'Sent to Supplier' || quote.status === 'Draft' || quote.status === 'Received') && (
                      <Button
                        size="sm"
                        variant={editingPrices ? 'default' : 'outline'}
                        className="h-6 text-xs px-2"
                        onClick={() => editingPrices ? savePricesMutation.mutate() : setEditingPrices(true)}
                        disabled={savePricesMutation.isPending}
                        data-testid="edit-prices-btn"
                      >
                        {savePricesMutation.isPending ? 'Saving...' : editingPrices ? 'Save Prices' : 'Enter Prices'}
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {quote.items.map(item => (
                      <div key={item.id} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2" data-testid={`quote-item-${item.id}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.item_description || `Order #${item.order_id}`}</p>
                            <p className="text-xs text-muted-foreground">{item.building} · PN: {item.part_number || '—'} · Due {item.date_needed ? fmtDate(item.date_needed) : '—'}</p>
                          </div>
                        </div>
                        {editingPrices ? (
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Qty</p>
                              <input
                                type="number"
                                min="1"
                                value={itemQtys[item.id] ?? String(item.quantity)}
                                onChange={(e) => setItemQtys(prev => ({ ...prev, [item.id]: e.target.value }))}
                                className="w-full text-sm border border-border rounded px-2 py-1 bg-background"
                                data-testid={`item-qty-${item.id}`}
                              />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Unit Price</p>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={itemPrices[item.id] ?? ''}
                                onChange={(e) => setItemPrices(prev => ({ ...prev, [item.id]: e.target.value }))}
                                placeholder="0.00"
                                className="w-full text-sm border border-border rounded px-2 py-1 bg-background"
                                data-testid={`item-price-${item.id}`}
                              />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Line Total</p>
                              <p className="text-sm font-bold pt-1.5">
                                {fmtPrice((parseFloat(itemPrices[item.id] || '0') || 0) * (parseInt(itemQtys[item.id] || String(item.quantity), 10) || item.quantity))}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Qty {item.quantity}</span>
                            <div className="text-right">
                              {item.unit_price ? (
                                <>
                                  <span className="text-xs text-muted-foreground">{fmtPrice(item.unit_price)} × {item.quantity} = </span>
                                  <span className="font-bold">{fmtPrice(item.total_price)}</span>
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">No price yet</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {editingPrices && (
                    <div className="flex items-center justify-between mt-2 p-2 rounded bg-primary/10 border border-primary/20">
                      <span className="text-sm font-medium">Computed Total</span>
                      <span className="text-sm font-bold text-primary">{fmtPrice(computedTotal)} {quote.currency}</span>
                    </div>
                  )}

                  {editingPrices && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-1 text-muted-foreground"
                      onClick={() => setEditingPrices(false)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              )}

              {/* Workflow Actions */}
              {isProcurement && !editingPrices && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  {quote.status === 'Draft' && (
                    <Button
                      size="sm"
                      onClick={() => statusMutation.mutate({ status: 'Sent to Supplier' })}
                      disabled={statusMutation.isPending}
                      data-testid="send-quote"
                    >
                      <Send className="h-3 w-3 mr-1" /> Send to Supplier
                    </Button>
                  )}
                  {quote.status === 'Sent to Supplier' && (
                    <Button
                      size="sm"
                      onClick={() => statusMutation.mutate({ status: 'Received' })}
                      disabled={statusMutation.isPending}
                      data-testid="mark-received"
                    >
                      Mark as Received
                    </Button>
                  )}
                  {quote.status === 'Received' && (
                    <Button
                      size="sm"
                      onClick={() => statusMutation.mutate({ status: 'Under Approval' })}
                      disabled={statusMutation.isPending}
                      data-testid="submit-for-approval"
                    >
                      Submit for Approval
                    </Button>
                  )}
                  {quote.status === 'Approved' && !showPOConfirm && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setShowPOConfirm(true)}
                      data-testid="create-po-btn"
                    >
                      <FileText className="h-3 w-3 mr-1" /> Create Purchase Order
                    </Button>
                  )}
                  {showPOConfirm && (
                    <div className="w-full p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 space-y-2">
                      <p className="text-sm font-medium">Create PO from this quote?</p>
                      <p className="text-xs text-muted-foreground">All items will be ordered from {quote.supplier_name}. Orders will move to "Ordered" status.</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => createPOMutation.mutate()}
                          disabled={createPOMutation.isPending}
                          data-testid="confirm-create-po"
                        >
                          {createPOMutation.isPending ? 'Creating...' : 'Confirm Create PO'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowPOConfirm(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Manager Approval Actions */}
              {isManager && quote.status === 'Under Approval' && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => statusMutation.mutate({ status: 'Approved' })}
                    disabled={statusMutation.isPending}
                    data-testid="approve-quote"
                  >
                    Approve Quote
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => statusMutation.mutate({ status: 'Rejected' })}
                    disabled={statusMutation.isPending}
                    data-testid="reject-quote"
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
