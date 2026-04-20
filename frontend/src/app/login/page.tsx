'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/layout/Logo';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import type { UserRole } from '@/lib/types';

const ADMIN_HOST = process.env.NEXT_PUBLIC_ADMIN_HOST || 'one.joymorocco.com';
const BOOKING_HOST = process.env.NEXT_PUBLIC_BOOKING_HOST || 'booking.joymorocco.com';

const ADMIN_ROLES: UserRole[] = ['Owner' as UserRole, 'Admin' as UserRole];

function getPortalHome(role: UserRole): string {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalhost = host === 'localhost' || host === '127.0.0.1';

  if (isLocalhost) {
    // Dev: just navigate within the same app
    return ADMIN_ROLES.includes(role) ? '/admin/users' : '/orders';
  }

  // Production: redirect to correct subdomain
  const protocol = window.location.protocol;
  if (ADMIN_ROLES.includes(role)) {
    return `${protocol}//${ADMIN_HOST}/admin/users`;
  }
  return `${protocol}//${BOOKING_HOST}/orders`;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { login, isAuthenticated, user } = useAuthContext();

  // Redirect when already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const dest = getPortalHome(user.role);
      if (dest.startsWith('http')) {
        window.location.href = dest;
      } else {
        router.replace(dest);
      }
    }
  }, [isAuthenticated, user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const loggedInUser = await login(email, password);
      toast({ title: 'Welcome back!', description: loggedInUser.name });
      // redirect handled by useEffect above
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'Invalid credentials.',
      });
      setLoading(false);
    }
  };

  if (isAuthenticated) return null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-headline">Joy Platform</CardTitle>
          <CardDescription>Enter your credentials to access your workspace.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@joymorocco.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
