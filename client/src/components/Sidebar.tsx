import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  FileText,
  CheckSquare,
  Truck,
  Users,
  Settings,
  BarChart3,
  ShoppingCart,
  X,
} from 'lucide-react';
import { UserRole } from '@shared/schema';

interface NavItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[] | 'all';
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: 'all' },
  { path: '/orders', label: 'Orders', icon: ClipboardList, roles: 'all' },
  { path: '/new-order', label: 'New Order', icon: PlusCircle, roles: ['requester', 'admin'] },
  { path: '/procurement', label: 'Procurement', icon: ShoppingCart, roles: ['procurement', 'admin'] },
  { path: '/quotes', label: 'Quotes', icon: FileText, roles: ['procurement', 'admin'] },
  { path: '/suppliers', label: 'Suppliers', icon: Truck, roles: ['procurement', 'admin'] },
  { path: '/approvals', label: 'Approvals', icon: CheckSquare, roles: ['manager', 'admin'] },
  { path: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['manager', 'admin'] },
  { path: '/admin', label: 'Admin', icon: Settings, roles: ['admin'] },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function Logo() {
  return (
    <div className="flex items-center gap-2 px-2" data-testid="sidebar-logo">
      {/* PartPulse logo: navy/orange split gear with ECG pulse line */}
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="PartPulse Orders">
        {/* Left half gear — navy */}
        <clipPath id="left-half">
          <rect x="0" y="0" width="19" height="38" />
        </clipPath>
        <clipPath id="right-half">
          <rect x="19" y="0" width="19" height="38" />
        </clipPath>
        {/* Gear teeth — left side (navy) */}
        <g clipPath="url(#left-half)">
          <circle cx="19" cy="19" r="13" fill="#2d3f5e" />
          <circle cx="19" cy="19" r="7" fill="#1a2740" />
          {[270, 315, 0, 225, 180].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const cx = 19 + 13 * Math.cos(rad);
            const cy = 19 + 13 * Math.sin(rad);
            return <rect key={angle} x={cx - 2.2} y={cy - 2.2} width="4.4" height="4.4" rx="1" fill="#2d3f5e" transform={`rotate(${angle}, ${cx}, ${cy})`} />;
          })}
        </g>
        {/* Gear teeth — right side (orange) */}
        <g clipPath="url(#right-half)">
          <circle cx="19" cy="19" r="13" fill="#e8682a" />
          <circle cx="19" cy="19" r="7" fill="#c0501c" />
          {[90, 45, 0, 135].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const cx = 19 + 13 * Math.cos(rad);
            const cy = 19 + 13 * Math.sin(rad);
            return <rect key={angle} x={cx - 2.2} y={cy - 2.2} width="4.4" height="4.4" rx="1" fill="#e8682a" transform={`rotate(${angle}, ${cx}, ${cy})`} />;
          })}
        </g>
        {/* Center hole */}
        <circle cx="19" cy="19" r="4.5" fill="#0f172a" />
        {/* ECG / pulse line across center */}
        <polyline
          points="4,19 8,19 10,14 12,24 14,16 16,22 18,19 22,19 24,14 26,22 28,17 30,19 34,19"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.9"
        />
      </svg>
      <div>
        <p className="text-sm font-bold text-foreground leading-none">PartPulse</p>
        <p className="text-[10px] leading-tight" style={{ color: '#e8682a' }}>ORDERS</p>
      </div>
    </div>
  );
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const role = user?.role || 'requester';

  const filteredItems = NAV_ITEMS.filter(
    (item) => item.roles === 'all' || item.roles.includes(role)
  );

  const navigate = (path: string) => {
    setLocation(path);
    onClose();
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          data-testid="sidebar-overlay"
        />
      )}
      <aside
        data-testid="sidebar"
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-60 bg-[#0f172a] border-r border-border flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-border/50">
          <Logo />
          <button
            onClick={onClose}
            className="lg:hidden text-muted-foreground hover:text-foreground"
            data-testid="sidebar-close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {filteredItems.map((item) => {
            const active = location === item.path || (item.path !== '/' && location.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border/50">
          <div className="px-3 py-2 rounded-md bg-white/5">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
            <p className="text-xs text-primary capitalize">{role}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
