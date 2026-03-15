import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    try {
      await login(username, password);
      toast({ title: 'Welcome back!' });
    } catch (err: any) {
      toast({ title: 'Login failed', description: err.message || 'Invalid credentials', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" data-testid="login-page">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <svg width="56" height="56" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="18" cy="18" r="16" stroke="currentColor" strokeWidth="2" className="text-primary" />
              <circle cx="18" cy="18" r="6" stroke="currentColor" strokeWidth="2" className="text-primary" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
                const rad = (angle * Math.PI) / 180;
                const x1 = 18 + 8 * Math.cos(rad);
                const y1 = 18 + 8 * Math.sin(rad);
                const x2 = 18 + 14 * Math.cos(rad);
                const y2 = 18 + 14 * Math.sin(rad);
                return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary" />;
              })}
              <text x="18" y="20.5" textAnchor="middle" className="text-primary" fill="currentColor" fontSize="7" fontWeight="bold" fontFamily="Inter, sans-serif">PP</text>
            </svg>
          </div>
          <CardTitle className="text-2xl">PartPulse Orders</CardTitle>
          <CardDescription>Sign in to your procurement system</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                data-testid="login-username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                data-testid="login-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !username || !password}
              data-testid="login-submit"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />}
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
