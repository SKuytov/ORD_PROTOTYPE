import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Order, OrderStatus, ORDER_STATUS_FLOW } from '@shared/schema';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import { fmtDate, fmtDateTime, fmtPrice, fmtRelative, fileSize, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Building2, Calendar, User, Package, Hash, Tag,
  FileText, Clock, ChevronRight, Truck, ArrowRight, XCircle,
  Download, Image, ExternalLink,
} from 'lucide-react';

interface OrderDetailProps {
  orderId: number | null;
  open: boolean;
  onClose: () => void;
}

interface OrderDetailResponse {
  success: boolean;
  order: Order & {
    history?: Array<{
      id: number;
      field_name: string;
      old_value: string;
      new_value: string;
      changed_by: string;
      changed_at: string;
    }>;
    files?: Array<{
      id: number;
      file_name: string;
      file_path: string;
      file_type: string;
      file_size: number;
      uploaded_at: string;
    }>;
  };
}

interface DocumentsResponse {
  success: boolean;
  documents: Array<{
    id: number;
    document_type: string;
    file_name: string;
    file_path?: string;
    file_size: number;
    uploaded_at: string;
  }>;
}

export default function OrderDetail({ orderId, open, onClose }: OrderDetailProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['/orders', orderId],
    queryFn: () => api.get<OrderDetailResponse>(`/orders/${orderId}`),
    enabled: !!orderId && open,
  });

  const { data: docsData } = useQuery({
    queryKey: ['/documents', orderId],
    queryFn: () => api.get<DocumentsResponse>(`/documents/order/${orderId}`),
    enabled: !!orderId && open,
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { status: string }) =>
      api.put(`/orders/${orderId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/orders', orderId] });
      toast({ title: 'Status updated' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const claimMutation = useMutation({
    mutationFn: () => api.post(`/order-assignments/${orderId}/claim`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['/order-assignments'] });
      toast({ title: 'Order claimed' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const releaseMutation = useMutation({
    mutationFn: () => api.post(`/order-assignments/${orderId}/release`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['/order-assignments'] });
      toast({ title: 'Order released' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const order = data?.order;
  const documents = docsData?.documents || [];
  const history = order?.history || [];
  const currentStepIndex = ORDER_STATUS_FLOW.indexOf(order?.status as OrderStatus);
  const isProcurement = user?.role === 'procurement' || user?.role === 'admin';
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const isRequester = user?.role === 'requester';
  const isAssignedToMe = order?.assigned_to_user_id === user?.id;

  const getNextStatus = (): OrderStatus | null => {
    if (!order) return null;
    const idx = ORDER_STATUS_FLOW.indexOf(order.status);
    if (idx >= 0 && idx < ORDER_STATUS_FLOW.length - 1) {
      return ORDER_STATUS_FLOW[idx + 1];
    }
    return null;
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[600px] overflow-y-auto p-0" data-testid="order-detail-panel">
        {isLoading || !order ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <>
            <SheetHeader className="p-6 pb-4 border-b border-border">
              <div className="flex items-center gap-2 flex-wrap">
                <SheetTitle className="text-lg">Order #{order.id}</SheetTitle>
                <PriorityBadge priority={order.priority} />
                <StatusBadge status={order.status} />
              </div>
              <SheetDescription className="line-clamp-2">{order.item_description}</SheetDescription>
            </SheetHeader>

            {/* Status Pipeline */}
            <div className="px-6 py-3 border-b border-border overflow-x-auto">
              <div className="flex items-center gap-1 min-w-max">
                {ORDER_STATUS_FLOW.map((s, i) => {
                  const isActive = s === order.status;
                  const isPast = i < currentStepIndex;
                  return (
                    <div key={s} className="flex items-center">
                      {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5 shrink-0" />}
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap',
                          isActive && 'bg-primary/20 text-primary font-medium',
                          isPast && 'text-muted-foreground',
                          !isActive && !isPast && 'text-muted-foreground/50'
                        )}
                      >
                        {s}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Info Grid */}
            <div className="p-6 grid grid-cols-2 gap-4 border-b border-border">
              <InfoItem icon={Building2} label="Building" value={order.building} />
              <InfoItem icon={Tag} label="Cost Center" value={order.cost_center_code ? `${order.cost_center_code} — ${order.cost_center_name}` : '—'} />
              <InfoItem icon={User} label="Requester" value={order.requester_name} />
              <InfoItem icon={Package} label="Category" value={order.category || '—'} />
              <InfoItem icon={Hash} label="Part Number" value={order.part_number || '—'} />
              <InfoItem icon={Package} label="Quantity" value={String(order.quantity)} />
              <InfoItem icon={Calendar} label="Date Needed" value={fmtDate(order.date_needed)} />
              <InfoItem icon={Truck} label="Supplier" value={order.supplier_name || '—'} />
            </div>

            {/* Price Info */}
            {(order.total_price > 0 || order.unit_price > 0) && (
              <div className="px-6 py-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Unit Price</span>
                  <span className="text-sm font-medium">{fmtPrice(order.unit_price)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-muted-foreground">Total Price</span>
                  <span className="text-sm font-bold text-primary">{fmtPrice(order.total_price)}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="px-6 py-3 border-b border-border space-y-2">
              {isProcurement && (
                <div className="flex flex-wrap gap-2">
                  {!isAssignedToMe && !order.assigned_to_user_id && (
                    <Button
                      size="sm"
                      onClick={() => claimMutation.mutate()}
                      disabled={claimMutation.isPending}
                      data-testid="claim-order"
                    >
                      Claim Order
                    </Button>
                  )}
                  {isAssignedToMe && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => releaseMutation.mutate()}
                      disabled={releaseMutation.isPending}
                      data-testid="release-order"
                    >
                      Release
                    </Button>
                  )}
                  {getNextStatus() && order.status !== 'Cancelled' && order.status !== 'On Hold' && (
                    <Button
                      size="sm"
                      onClick={() => statusMutation.mutate({ status: getNextStatus()! })}
                      disabled={statusMutation.isPending}
                      data-testid="advance-status"
                    >
                      <ArrowRight className="h-3 w-3 mr-1" />
                      Move to {getNextStatus()}
                    </Button>
                  )}
                </div>
              )}

              {isManager && order.status === 'Quote Under Approval' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => statusMutation.mutate({ status: 'Approved' })}
                    disabled={statusMutation.isPending}
                    data-testid="approve-order"
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => statusMutation.mutate({ status: 'On Hold' })}
                    disabled={statusMutation.isPending}
                    data-testid="reject-order"
                  >
                    Reject
                  </Button>
                </div>
              )}

              {isRequester && order.status === 'New' && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => statusMutation.mutate({ status: 'Cancelled' })}
                  disabled={statusMutation.isPending}
                  data-testid="cancel-order"
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Cancel Order
                </Button>
              )}
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="px-6 py-3 border-b border-border">
                <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}

            {/* File Attachments (photos/images uploaded with order) */}
            {order.files && order.files.length > 0 && (
              <div className="px-6 py-3 border-b border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">Attachments ({order.files.length})</p>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {order.files
                    .filter(f => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(f.file_name))
                    .map((f) => (
                      <a
                        key={f.id}
                        href={f.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded overflow-hidden border border-border hover:border-primary/50 transition-colors group"
                        title={f.file_name}
                      >
                        <img
                          src={f.file_path}
                          alt={f.file_name}
                          className="w-full h-20 object-cover group-hover:opacity-90 transition-opacity"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<div class="flex items-center justify-center h-20 bg-muted/50 text-muted-foreground text-xs">${f.file_name}</div>`;
                            }
                          }}
                        />
                      </a>
                    ))}
                </div>
                <div className="space-y-1">
                  {order.files.map((f) => (
                    <a
                      key={f.id}
                      href={f.file_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs p-2 rounded bg-muted/50 hover:bg-muted/80 transition-colors group"
                    >
                      {/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(f.file_name)
                        ? <Image className="h-3 w-3 text-blue-400 shrink-0" />
                        : <FileText className="h-3 w-3 text-muted-foreground shrink-0" />}
                      <span className="flex-1 truncate text-foreground group-hover:text-primary">{f.file_name}</span>
                      <span className="text-muted-foreground">{fileSize(f.file_size)}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Documents (procurement documents) */}
            {documents.length > 0 && (
              <div className="px-6 py-3 border-b border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">Documents ({documents.length})</p>
                <div className="space-y-1">
                  {documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.file_path || `/uploads/${doc.file_name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs p-2 rounded bg-muted/50 hover:bg-muted/80 transition-colors group"
                    >
                      <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate text-foreground group-hover:text-primary">{doc.file_name}</span>
                      <Badge variant="secondary" className="text-[10px]">{doc.document_type}</Badge>
                      <span className="text-muted-foreground">{fileSize(doc.file_size)}</span>
                      <Download className="h-3 w-3 text-muted-foreground shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div className="px-6 py-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">History</p>
                <div className="space-y-2">
                  {history.slice(0, 20).map((h) => (
                    <div key={h.id} className="flex items-start gap-2 text-xs">
                      <Clock className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground">
                          <span className="font-medium">{h.field_name}</span>:{' '}
                          <span className="text-muted-foreground">{h.old_value || '—'}</span>
                          {' → '}
                          <span className="text-primary">{h.new_value}</span>
                        </p>
                        <p className="text-muted-foreground">
                          {h.changed_by} · {fmtRelative(h.changed_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="text-sm font-medium text-foreground truncate">{value}</p>
    </div>
  );
}
