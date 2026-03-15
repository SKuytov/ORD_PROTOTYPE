import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Supplier } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, Star, Globe, Phone, Mail, MapPin, X, Loader2 } from 'lucide-react';
import { fmtDate } from '@/lib/utils';

interface SuppliersResponse { success: boolean; suppliers: Supplier[] }

export default function SuppliersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['/suppliers'],
    queryFn: () => api.get<SuppliersResponse>('/suppliers'),
  });

  const suppliers = (data?.suppliers || []).filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.contact_person && s.contact_person.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.specialization && s.specialization.toLowerCase().includes(q)) ||
      (s.category_tags && s.category_tags.toLowerCase().includes(q))
    );
  });

  const isProcurementOrAdmin = user?.role === 'procurement' || user?.role === 'admin';

  const renderStars = (score: number) => {
    const stars = Math.round(score / 2);
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${i < stars ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">{score.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4" data-testid="suppliers-page">
      {/* Header */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="suppliers-search"
          />
        </div>
        {isProcurementOrAdmin && (
          <Dialog open={showNewForm} onOpenChange={setShowNewForm}>
            <DialogTrigger asChild>
              <Button data-testid="new-supplier-btn">
                <Plus className="h-4 w-4 mr-2" /> New Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Supplier</DialogTitle>
              </DialogHeader>
              <NewSupplierForm
                onSuccess={() => {
                  setShowNewForm(false);
                  queryClient.invalidateQueries({ queryKey: ['/suppliers'] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <p className="text-sm text-muted-foreground">{suppliers.length} suppliers</p>

      {/* Suppliers Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Supplier</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Contact</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Rating</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Orders</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Specialization</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="p-3"><Skeleton className="h-4 w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">No suppliers found</td>
                  </tr>
                ) : (
                  suppliers.map(s => (
                    <tr
                      key={s.id}
                      className="border-b border-border hover:bg-muted/20 cursor-pointer transition-colors"
                      onClick={() => setSelectedSupplierId(s.id)}
                      data-testid={`supplier-row-${s.id}`}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{s.name}</span>
                          {s.is_eu === 1 && (
                            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-300 border-blue-500/30">EU</Badge>
                          )}
                        </div>
                        {s.country && <p className="text-xs text-muted-foreground">{s.country}</p>}
                      </td>
                      <td className="p-3">
                        <p className="text-sm">{s.contact_person || '—'}</p>
                        {s.email && <p className="text-xs text-muted-foreground">{s.email}</p>}
                      </td>
                      <td className="p-3">{renderStars(s.performance_score)}</td>
                      <td className="p-3 text-right font-medium">{s.total_orders}</td>
                      <td className="p-3 text-muted-foreground">{s.specialization || '—'}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={s.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-500/20 text-gray-300'}>
                          {s.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Supplier Detail */}
      <SupplierDetail
        supplierId={selectedSupplierId}
        suppliers={data?.suppliers || []}
        open={!!selectedSupplierId}
        onClose={() => setSelectedSupplierId(null)}
      />
    </div>
  );
}

function SupplierDetail({ supplierId, suppliers, open, onClose }: {
  supplierId: number | null;
  suppliers: Supplier[];
  open: boolean;
  onClose: () => void;
}) {
  const supplier = suppliers.find(s => s.id === supplierId);

  const renderStars = (score: number) => {
    const stars = Math.round(score / 2);
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < stars ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-2">{score.toFixed(1)} / 10</span>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[500px] overflow-y-auto" data-testid="supplier-detail-panel">
        {!supplier ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="pb-4">
              <div className="flex items-center gap-2">
                <SheetTitle>{supplier.name}</SheetTitle>
                {supplier.is_eu === 1 && (
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30">EU</Badge>
                )}
              </div>
              <SheetDescription>{supplier.specialization || 'General supplier'}</SheetDescription>
            </SheetHeader>

            <div className="space-y-4">
              {/* Rating */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Performance Rating</p>
                {renderStars(supplier.performance_score)}
              </div>

              {/* Contact Info */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Contact</p>
                {supplier.contact_person && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{supplier.contact_person}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{supplier.email}</span>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{supplier.address}{supplier.country ? `, ${supplier.country}` : ''}</span>
                  </div>
                )}
                {supplier.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{supplier.website}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                  <p className="text-lg font-bold">{supplier.total_orders}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Last Order</p>
                  <p className="text-sm font-medium">{supplier.last_order_date ? fmtDate(supplier.last_order_date) : '—'}</p>
                </div>
              </div>

              {/* Tags */}
              {supplier.category_tags && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Categories</p>
                  <div className="flex flex-wrap gap-1">
                    {supplier.category_tags.split(',').map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{tag.trim()}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {supplier.keywords && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Keywords</p>
                  <p className="text-sm text-foreground">{supplier.keywords}</p>
                </div>
              )}

              {supplier.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{supplier.notes}</p>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function NewSupplierForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [isEu, setIsEu] = useState(false);
  const [website, setWebsite] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [notes, setNotes] = useState('');

  const createSupplier = useMutation({
    mutationFn: () => api.post<{ success: boolean }>('/suppliers', {
      name, contact_person: contactPerson, email, phone,
      address, country, is_eu: isEu ? 1 : 0, website,
      specialization, notes,
    }),
    onSuccess: () => {
      toast({ title: 'Supplier created' });
      onSuccess();
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-4" data-testid="new-supplier-form">
      <div className="space-y-2">
        <Label>Name *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Supplier name" data-testid="supplier-name" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Contact Person</Label>
          <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Contact name" data-testid="supplier-contact" />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" type="email" data-testid="supplier-email" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 890" data-testid="supplier-phone" />
        </div>
        <div className="space-y-2">
          <Label>Website</Label>
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." data-testid="supplier-website" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Address</Label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" data-testid="supplier-address" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Country</Label>
          <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" data-testid="supplier-country" />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Switch checked={isEu} onCheckedChange={setIsEu} data-testid="supplier-eu" />
          <Label>EU Supplier</Label>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Specialization</Label>
        <Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="e.g. Electrical components" data-testid="supplier-specialization" />
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." rows={2} data-testid="supplier-notes" />
      </div>
      <Button
        className="w-full"
        onClick={() => createSupplier.mutate()}
        disabled={!name || createSupplier.isPending}
        data-testid="submit-supplier"
      >
        {createSupplier.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
        Add Supplier
      </Button>
    </div>
  );
}
