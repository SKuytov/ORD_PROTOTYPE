import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Building, CostCenter, OrderPriority } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Loader2, Upload, X, Send } from 'lucide-react';
import { debounce } from '@/lib/utils';

interface BuildingsResponse { success: boolean; buildings: Building[] }
interface CostCentersResponse { success: boolean; costCenters: CostCenter[] }
interface AutocompleteResponse { suggestions: Array<{ text: string; usage_count: number }> }

export default function NewOrderPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [building, setBuilding] = useState(user?.building || '');
  const [costCenterId, setCostCenterId] = useState<string>('');
  const [itemDescription, setItemDescription] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [dateNeeded, setDateNeeded] = useState('');
  const [priority, setPriority] = useState<OrderPriority>('Normal');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: buildingsData } = useQuery({
    queryKey: ['/buildings'],
    queryFn: () => api.get<BuildingsResponse>('/buildings'),
  });

  const { data: costCentersData } = useQuery({
    queryKey: ['/cost-centers', building],
    queryFn: () => api.get<CostCentersResponse>(`/cost-centers?building_code=${building}`),
    enabled: !!building,
  });

  const buildings = buildingsData?.buildings || [];
  const costCenters = (costCentersData?.costCenters || []).filter(cc => cc.active);

  const fetchSuggestions = useCallback(
    debounce(async (q: string) => {
      if (q.length < 2) { setSuggestions([]); return; }
      try {
        const res = await api.get<AutocompleteResponse>(`/autocomplete/item-description?q=${encodeURIComponent(q)}`);
        setSuggestions(res.suggestions.map(s => s.text));
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 300),
    []
  );

  useEffect(() => {
    fetchSuggestions(itemDescription);
  }, [itemDescription, fetchSuggestions]);

  const createOrder = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('building', building);
      formData.append('itemDescription', itemDescription);
      formData.append('partNumber', partNumber);
      formData.append('category', category);
      formData.append('quantity', quantity);
      formData.append('dateNeeded', dateNeeded);
      formData.append('priority', priority);
      formData.append('notes', notes);
      formData.append('requester', user?.name || '');
      formData.append('requesterEmail', user?.email || '');
      if (costCenterId) formData.append('costCenterId', costCenterId);
      files.forEach(f => formData.append('files', f));
      return api.postForm<{ success: boolean; orderId: number }>('/orders', formData);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['/orders'] });
      toast({ title: 'Order created', description: `Order #${res.orderId} submitted` });
      setLocation('/orders');
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...newFiles].slice(0, 5));
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const newFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...newFiles].slice(0, 5));
  };

  const canSubmit = building && itemDescription && quantity && dateNeeded;

  return (
    <div className="max-w-2xl mx-auto space-y-6" data-testid="new-order-page">
      <Card>
        <CardHeader>
          <CardTitle>Create New Order</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Building */}
          <div className="space-y-2">
            <Label>Building *</Label>
            {user?.role === 'requester' && user?.building ? (
              <Input value={building} readOnly className="bg-muted" data-testid="order-building" />
            ) : (
              <Select value={building} onValueChange={setBuilding}>
                <SelectTrigger data-testid="order-building">
                  <SelectValue placeholder="Select building" />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map(b => (
                    <SelectItem key={b.code} value={b.code}>{b.code} — {b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Cost Center */}
          {costCenters.length > 0 && (
            <div className="space-y-2">
              <Label>Cost Center</Label>
              <RadioGroup value={costCenterId} onValueChange={setCostCenterId} data-testid="order-cost-center">
                {costCenters.map(cc => (
                  <div key={cc.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={String(cc.id)} id={`cc-${cc.id}`} />
                    <Label htmlFor={`cc-${cc.id}`} className="font-normal cursor-pointer">
                      {cc.code} — {cc.name}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Item Description with autocomplete */}
          <div className="space-y-2 relative">
            <Label>Item Description *</Label>
            <Textarea
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Describe the item you need..."
              rows={3}
              data-testid="order-description"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-40 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                    onMouseDown={() => {
                      setItemDescription(s);
                      setShowSuggestions(false);
                    }}
                    data-testid={`suggestion-${i}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Part Number & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Part Number</Label>
              <Input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} placeholder="e.g. ABC-123" data-testid="order-part-number" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Electrical" data-testid="order-category" />
            </div>
          </div>

          {/* Quantity & Date Needed */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} data-testid="order-quantity" />
            </div>
            <div className="space-y-2">
              <Label>Date Needed *</Label>
              <Input type="date" value={dateNeeded} onChange={(e) => setDateNeeded(e.target.value)} data-testid="order-date-needed" />
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as OrderPriority)}>
              <SelectTrigger data-testid="order-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional information..." rows={2} data-testid="order-notes" />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Attachments (max 5)</Label>
            <div
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
              data-testid="file-drop-zone"
            >
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Drop files here or click to browse</p>
              <input id="file-input" type="file" multiple className="hidden" onChange={handleFileChange} />
            </div>
            {files.length > 0 && (
              <div className="space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(i)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            className="w-full"
            onClick={() => createOrder.mutate()}
            disabled={!canSubmit || createOrder.isPending}
            data-testid="submit-order"
          >
            {createOrder.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Submit Order
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
