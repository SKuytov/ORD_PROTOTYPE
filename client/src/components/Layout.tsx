import { ReactNode, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Sidebar from './Sidebar';
import { PerplexityAttribution } from './PerplexityAttribution';
import { Bell, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/orders': 'Orders',
  '/new-order': 'New Order',
  '/quotes': 'Quotes',
  '/approvals': 'Approvals',
  '/suppliers': 'Suppliers',
  '/procurement': 'Procurement',
  '/admin': 'Administration',
  '/analytics': 'Analytics',
};

export default function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const { data: pendingCount } = useQuery({
    queryKey: ['/approvals/pending-count'],
    queryFn: () => api.get<{ success: boolean; count: number }>('/approvals/pending-count'),
    enabled: user?.role === 'manager' || user?.role === 'admin',
    refetchInterval: 30000,
  });

  const title = PAGE_TITLES[location] || 'PartPulse';
  const approvalCount = pendingCount?.count || 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background" data-testid="app-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-muted-foreground hover:text-foreground"
              data-testid="menu-toggle"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground" data-testid="page-title">{title}</h1>
          </div>

          <div className="flex items-center gap-2">
            {(user?.role === 'manager' || user?.role === 'admin') && (
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                data-testid="notifications-bell"
                onClick={() => window.location.hash = '#/approvals'}
              >
                <Bell className="h-4 w-4" />
                {approvalCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground border-0">
                    {approvalCount}
                  </Badge>
                )}
              </Button>
            )}

            <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50">
              <span className="text-sm text-foreground">{user?.name}</span>
              <Badge variant="secondary" className="text-[10px] capitalize">{user?.role}</Badge>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              data-testid="logout-button"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6" data-testid="main-content">
          {children}
          <PerplexityAttribution />
        </main>
      </div>
    </div>
  );
}
