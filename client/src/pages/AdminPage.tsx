import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { User, Building, CostCenter } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Users, Building2, Landmark, Settings, Plus, Loader2, Search } from 'lucide-react';

interface UsersResponse { success: boolean; users: User[] }
interface BuildingsResponse { success: boolean; buildings: Building[] }
interface CostCentersResponse { success: boolean; costCenters: CostCenter[] }

export default function AdminPage() {
  const [tab, setTab] = useState('users');

  return (
    <div className="space-y-4" data-testid="admin-page">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-1" /> Users
          </TabsTrigger>
          <TabsTrigger value="buildings" data-testid="tab-buildings">
            <Building2 className="h-4 w-4 mr-1" /> Buildings
          </TabsTrigger>
          <TabsTrigger value="cost-centers" data-testid="tab-cost-centers">
            <Landmark className="h-4 w-4 mr-1" /> Cost Centers
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Settings className="h-4 w-4 mr-1" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="buildings"><BuildingsTab /></TabsContent>
        <TabsContent value="cost-centers"><CostCentersTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function UsersTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', name: '', email: '', password: '', role: 'requester', building: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['/users'],
    queryFn: () => api.get<UsersResponse>('/users'),
  });

  const createUser = useMutation({
    mutationFn: () => api.post<{ success: boolean }>('/users', newUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/users'] });
      toast({ title: 'User created' });
      setShowNew(false);
      setNewUser({ username: '', name: '', email: '', password: '', role: 'requester', building: '' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const users = (data?.users || []).filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase())
  );

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-500/20 text-red-300',
      procurement: 'bg-blue-500/20 text-blue-300',
      manager: 'bg-purple-500/20 text-purple-300',
      requester: 'bg-gray-500/20 text-gray-300',
    };
    return colors[role] || colors.requester;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="users-search" />
        </div>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button data-testid="new-user-btn"><Plus className="h-4 w-4 mr-2" /> Add User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
            <div className="space-y-3" data-testid="new-user-form">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Username *</Label>
                  <Input value={newUser.username} onChange={(e) => setNewUser(p => ({ ...p, username: e.target.value }))} data-testid="new-user-username" />
                </div>
                <div className="space-y-1">
                  <Label>Name *</Label>
                  <Input value={newUser.name} onChange={(e) => setNewUser(p => ({ ...p, name: e.target.value }))} data-testid="new-user-name" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Email *</Label>
                <Input value={newUser.email} onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))} type="email" data-testid="new-user-email" />
              </div>
              <div className="space-y-1">
                <Label>Password *</Label>
                <Input value={newUser.password} onChange={(e) => setNewUser(p => ({ ...p, password: e.target.value }))} type="password" data-testid="new-user-password" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Role</Label>
                  <Select value={newUser.role} onValueChange={(v) => setNewUser(p => ({ ...p, role: v }))}>
                    <SelectTrigger data-testid="new-user-role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="requester">Requester</SelectItem>
                      <SelectItem value="procurement">Procurement</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Building</Label>
                  <Input value={newUser.building} onChange={(e) => setNewUser(p => ({ ...p, building: e.target.value }))} placeholder="e.g. B1" data-testid="new-user-building" />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => createUser.mutate()}
                disabled={!newUser.username || !newUser.name || !newUser.email || !newUser.password || createUser.isPending}
                data-testid="submit-new-user"
              >
                {createUser.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Create User
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">ID</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Username</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Building</th>
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
                ) : users.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No users found</td></tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id} className="border-b border-border hover:bg-muted/20 transition-colors" data-testid={`user-row-${u.id}`}>
                      <td className="p-3 font-mono text-xs">{u.id}</td>
                      <td className="p-3 font-medium">{u.username}</td>
                      <td className="p-3">{u.name}</td>
                      <td className="p-3 text-muted-foreground">{u.email}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={roleBadge(u.role)}>{u.role}</Badge>
                      </td>
                      <td className="p-3">{u.building || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BuildingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [newBuilding, setNewBuilding] = useState({ code: '', name: '', description: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['/buildings'],
    queryFn: () => api.get<BuildingsResponse>('/buildings'),
  });

  const createBuilding = useMutation({
    mutationFn: () => api.post<{ success: boolean }>('/buildings', newBuilding),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/buildings'] });
      toast({ title: 'Building created' });
      setShowNew(false);
      setNewBuilding({ code: '', name: '', description: '' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const buildings = data?.buildings || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button data-testid="new-building-btn"><Plus className="h-4 w-4 mr-2" /> Add Building</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Building</DialogTitle></DialogHeader>
            <div className="space-y-3" data-testid="new-building-form">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Code *</Label>
                  <Input value={newBuilding.code} onChange={(e) => setNewBuilding(p => ({ ...p, code: e.target.value }))} placeholder="e.g. B1" data-testid="new-building-code" />
                </div>
                <div className="space-y-1">
                  <Label>Name *</Label>
                  <Input value={newBuilding.name} onChange={(e) => setNewBuilding(p => ({ ...p, name: e.target.value }))} placeholder="Building name" data-testid="new-building-name" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Input value={newBuilding.description} onChange={(e) => setNewBuilding(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" data-testid="new-building-desc" />
              </div>
              <Button
                className="w-full"
                onClick={() => createBuilding.mutate()}
                disabled={!newBuilding.code || !newBuilding.name || createBuilding.isPending}
                data-testid="submit-new-building"
              >
                {createBuilding.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Create Building
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Code</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <td key={j} className="p-3"><Skeleton className="h-4 w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : buildings.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No buildings found</td></tr>
                ) : (
                  buildings.map(b => (
                    <tr key={b.id} className="border-b border-border hover:bg-muted/20 transition-colors" data-testid={`building-row-${b.code}`}>
                      <td className="p-3 font-mono font-medium">{b.code}</td>
                      <td className="p-3">{b.name}</td>
                      <td className="p-3 text-muted-foreground">{b.description || '—'}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={b.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-500/20 text-gray-300'}>
                          {b.active ? 'Active' : 'Inactive'}
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
    </div>
  );
}

function CostCentersTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [newCC, setNewCC] = useState({ building_code: '', code: '', name: '', description: '' });

  const { data: buildingsData } = useQuery({
    queryKey: ['/buildings'],
    queryFn: () => api.get<BuildingsResponse>('/buildings'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['/cost-centers'],
    queryFn: () => api.get<CostCentersResponse>('/cost-centers'),
  });

  const createCC = useMutation({
    mutationFn: () => api.post<{ success: boolean }>('/cost-centers', newCC),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/cost-centers'] });
      toast({ title: 'Cost center created' });
      setShowNew(false);
      setNewCC({ building_code: '', code: '', name: '', description: '' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const costCenters = data?.costCenters || [];
  const buildings = buildingsData?.buildings || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button data-testid="new-cc-btn"><Plus className="h-4 w-4 mr-2" /> Add Cost Center</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Cost Center</DialogTitle></DialogHeader>
            <div className="space-y-3" data-testid="new-cc-form">
              <div className="space-y-1">
                <Label>Building *</Label>
                <Select value={newCC.building_code} onValueChange={(v) => setNewCC(p => ({ ...p, building_code: v }))}>
                  <SelectTrigger data-testid="new-cc-building"><SelectValue placeholder="Select building" /></SelectTrigger>
                  <SelectContent>
                    {buildings.map(b => (
                      <SelectItem key={b.code} value={b.code}>{b.code} — {b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Code *</Label>
                  <Input value={newCC.code} onChange={(e) => setNewCC(p => ({ ...p, code: e.target.value }))} placeholder="e.g. CC-001" data-testid="new-cc-code" />
                </div>
                <div className="space-y-1">
                  <Label>Name *</Label>
                  <Input value={newCC.name} onChange={(e) => setNewCC(p => ({ ...p, name: e.target.value }))} placeholder="Cost center name" data-testid="new-cc-name" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Input value={newCC.description} onChange={(e) => setNewCC(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" data-testid="new-cc-desc" />
              </div>
              <Button
                className="w-full"
                onClick={() => createCC.mutate()}
                disabled={!newCC.building_code || !newCC.code || !newCC.name || createCC.isPending}
                data-testid="submit-new-cc"
              >
                {createCC.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Create Cost Center
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Building</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Code</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="p-3"><Skeleton className="h-4 w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : costCenters.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No cost centers found</td></tr>
                ) : (
                  costCenters.map(cc => (
                    <tr key={cc.id} className="border-b border-border hover:bg-muted/20 transition-colors" data-testid={`cc-row-${cc.id}`}>
                      <td className="p-3 font-mono">{cc.building_code}</td>
                      <td className="p-3 font-medium">{cc.code}</td>
                      <td className="p-3">{cc.name}</td>
                      <td className="p-3 text-muted-foreground">{cc.description || '—'}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={cc.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-500/20 text-gray-300'}>
                          {cc.active ? 'Active' : 'Inactive'}
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
    </div>
  );
}

function SettingsTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-assign New Orders</p>
              <p className="text-xs text-muted-foreground">Automatically assign new orders to available procurement agents</p>
            </div>
            <Switch data-testid="setting-auto-assign" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Require Approval Above Threshold</p>
              <p className="text-xs text-muted-foreground">Orders above a certain amount require manager approval</p>
            </div>
            <Switch defaultChecked data-testid="setting-approval-threshold" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email Notifications</p>
              <p className="text-xs text-muted-foreground">Send email notifications for status changes</p>
            </div>
            <Switch defaultChecked data-testid="setting-email-notifications" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">AI Supplier Suggestions</p>
              <p className="text-xs text-muted-foreground">Use AI to suggest best suppliers for new quotes</p>
            </div>
            <Switch defaultChecked data-testid="setting-ai-suggestions" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
