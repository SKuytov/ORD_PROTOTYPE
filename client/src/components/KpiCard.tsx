import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color?: string;
  className?: string;
  onClick?: () => void;
}

export default function KpiCard({ title, value, icon: Icon, trend, color = 'text-primary', className, onClick }: KpiCardProps) {
  return (
    <Card
      data-testid={`kpi-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className={cn('cursor-default', onClick && 'cursor-pointer hover:border-primary/50 transition-colors', className)}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
            <p className={cn('text-2xl font-bold', color)}>{value}</p>
            {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
          </div>
          <div className={cn('p-2 rounded-lg bg-primary/10', color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
