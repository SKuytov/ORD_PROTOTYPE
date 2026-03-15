import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Approval, OrderPriority } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import PriorityBadge from '@/components/PriorityBadge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Filter } from 'lucide-react';
import { fmtDate, fmtPrice, fmtRelative } from '@/lib/utils';

interface ApprovalsResponse { success: boolean; approvals: Approval[] }

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export default function ApprovalsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [rejectComments, setRejectComments] = useState<Record<number, string>>({});
  const [expandedReject, setExpandedReject] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['/approvals', { status: filter === 'all' ? undefined : filter }],
    queryFn: () => api.get<ApprovalsResponse>(`/approvals${filter !== 'all' ? `?status=${filter}` : ''}`),
  });

  const approveMutation = useMutation({
    mutationFn: (approvalId: number) =>
      api.put(`/approvals/${approvalId}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/approvals'] });
      queryClient.invalidateQueries({ queryKey: ['/orders'] });
      toast({ title: 'Approval granted' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ approvalId, reason }: { approvalId: number; reason: string }) =>
      api.put(`/approvals/${approvalId}/reject`, { rejection_reason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/approvals'] });
      queryClient.invalidateQueries({ queryKey: ['/orders'] });
      toast({ title: 'Approval rejected' });
      setExpandedReject(null);
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const approvals = data?.approvals || [];

  const pendingCount = approvals.filter(a => a.status === 'pending').length;
  const approvedCount = approvals.filter(a => a.status === 'approved').length;
  const rejectedCount = approvals.filter(a => a.status === 'rejected').length;

  const statusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-amber-400" />;
      case 'approved': return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-400" />;
      default: return null;
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-500/20 text-amber-300',
      approved: 'bg-emerald-500/20 text-emerald-300',
      rejected: 'bg-red-500/20 text-red-300',
      cancelled: 'bg-gray-500/20 text-gray-300',
    };
    return colors[status] || colors.cancelled;
  };

  const isManager = user?.role === 'manager' || user?.role === 'admin';

  return (
    <div className="space-y-4" data-testid="approvals-page">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="cursor-pointer hover:border-amber-500/30 transition-colors" onClick={() => setFilter('pending')}>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-emerald-500/30 transition-colors" onClick={() => setFilter('approved')}>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold">{approvedCount}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-red-500/30 transition-colors" onClick={() => setFilter('rejected')}>
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-400" />
            <div>
              <p className="text-2xl font-bold">{rejectedCount}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map(f => (
          <Badge
            key={f}
            variant={filter === f ? 'default' : 'secondary'}
            className="cursor-pointer capitalize"
            onClick={() => setFilter(f)}
            data-testid={`approval-filter-${f}`}
          >
            {f === 'all' ? 'All' : f}
          </Badge>
        ))}
      </div>

      {/* Approval Cards */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : approvals.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No approvals found
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {approvals.map(a => (
            <Card key={a.id} className="hover:border-primary/30 transition-colors" data-testid={`approval-card-${a.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {statusIcon(a.status)}
                    <span className="text-sm font-medium">Order #{a.order_id}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <PriorityBadge priority={a.priority} />
                    <Badge variant="outline" className={statusBadge(a.status)}>
                      {a.status}
                    </Badge>
                  </div>
                </div>

                {a.order && (
                  <div className="text-sm text-foreground line-clamp-2">{a.order.item_description}</div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="block">Requested by</span>
                    <span className="text-foreground">{a.requested_by_name || '—'}</span>
                  </div>
                  <div>
                    <span className="block">Est. Cost</span>
                    <span className="text-foreground">{a.estimated_cost ? fmtPrice(a.estimated_cost) : '—'}</span>
                  </div>
                  <div>
                    <span className="block">Supplier</span>
                    <span className="text-foreground">{a.supplier_name || '—'}</span>
                  </div>
                  <div>
                    <span className="block">Requested</span>
                    <span className="text-foreground">{fmtRelative(a.requested_at)}</span>
                  </div>
                </div>

                {a.comments && (
                  <p className="text-xs text-muted-foreground italic">"{a.comments}"</p>
                )}

                {a.rejection_reason && (
                  <div className="text-xs p-2 rounded bg-red-500/10 text-red-300">
                    Rejection: {a.rejection_reason}
                  </div>
                )}

                {/* Actions for pending approvals */}
                {a.status === 'pending' && isManager && (
                  <div className="space-y-2 pt-1">
                    {expandedReject === a.id ? (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Reason for rejection..."
                          value={rejectComments[a.id] || ''}
                          onChange={(e) => setRejectComments(prev => ({ ...prev, [a.id]: e.target.value }))}
                          rows={2}
                          data-testid={`reject-reason-${a.id}`}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectMutation.mutate({ approvalId: a.id, reason: rejectComments[a.id] || '' })}
                            disabled={rejectMutation.isPending}
                            data-testid={`confirm-reject-${a.id}`}
                          >
                            Confirm Reject
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setExpandedReject(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => approveMutation.mutate(a.id)}
                          disabled={approveMutation.isPending}
                          data-testid={`approve-btn-${a.id}`}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => setExpandedReject(a.id)}
                          data-testid={`reject-btn-${a.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
