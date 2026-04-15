'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Shield, Eye, EyeOff, Trash2, RefreshCw, TriangleAlert } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api-client';
import type { User } from '@/lib/types';
import { UserRole } from '@/lib/types';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
}).refine((data) => {
  if (data.password && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, { message: 'Passwords do not match', path: ['confirmPassword'] });

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function OwnerProfilePage() {
  const { user: currentUser } = useAuthContext();
  const router = useRouter();
  const { toast } = useToast();
  const [ownerProfile, setOwnerProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isResettingOrders, setIsResettingOrders] = useState(false);
  const [isResettingSync, setIsResettingSync] = useState(false);

  const isOwner = currentUser?.role === UserRole.OWNER;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    api.users.getOwnerProfile()
      .then((profile) => {
        setOwnerProfile(profile);
        if (isOwner) {
          form.reset({ name: profile.name, email: profile.email, password: '', confirmPassword: '' });
        }
      })
      .catch((e) => toast({ variant: 'destructive', title: 'Failed to load profile', description: e.message }))
      .finally(() => setIsLoading(false));
  }, [isOwner]);

  async function onSubmit(values: ProfileFormValues) {
    if (!isOwner) return;
    setIsSaving(true);
    try {
      const payload: { name?: string; email?: string; password?: string } = {
        name: values.name,
        email: values.email,
      };
      if (values.password) payload.password = values.password;

      const updated = await api.users.updateOwnerProfile(payload);
      setOwnerProfile(updated);
      form.reset({ name: updated.name, email: updated.email, password: '', confirmPassword: '' });
      toast({ title: 'Profile Updated', description: 'Your owner profile has been saved.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleResetOrders() {
    setIsResettingOrders(true);
    try {
      await api.maintenance.resetOrders();
      toast({ title: 'Data Reset Complete', description: 'All orders and customer data have been deleted.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Reset Failed', description: e.message });
    } finally {
      setIsResettingOrders(false);
    }
  }

  async function handleResetSync() {
    setIsResettingSync(true);
    try {
      await api.maintenance.resetSync();
      toast({ title: 'Sync State Reset', description: 'Store sync state cleared. Next sync will re-fetch all orders.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Reset Failed', description: e.message });
    } finally {
      setIsResettingSync(false);
    }
  }

  function getInitials(name?: string) {
    if (!name) return 'O';
    return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Owner Profile</h1>
            <p className="text-sm text-muted-foreground">
              {isOwner ? 'Manage your owner account settings.' : 'View the platform owner details.'}
            </p>
          </div>
        </div>

        {/* Profile overview card */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-amber-100 text-amber-800 text-xl font-bold">
                    {getInitials(ownerProfile?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid gap-1">
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold">{ownerProfile?.name}</p>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                      <Shield className="h-3 w-3 mr-1" />
                      Owner
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{ownerProfile?.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Account created {ownerProfile?.createdAt ? new Date(ownerProfile.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit form — Owner only */}
        {isOwner && (
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>Update your name, email, or password.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Your name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="owner@joymorocco.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Leave blank to keep current"
                                className="pr-10"
                              />
                              <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowPassword((v) => !v)}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormDescription>Min. 8 characters</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showConfirm ? 'text' : 'password'}
                                placeholder="Re-enter new password"
                                className="pr-10"
                              />
                              <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowConfirm((v) => !v)}
                              >
                                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving || !form.formState.isDirty}>
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Non-Owner: read-only notice */}
        {!isOwner && !isLoading && (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center text-sm text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Only the Owner can edit this profile.
            </CardContent>
          </Card>
        )}

        {/* Danger Zone — Owner only */}
        {isOwner && (
          <Card className="border-destructive/40">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-destructive">
                <TriangleAlert className="h-5 w-5" />
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
              </div>
              <CardDescription>
                These actions are irreversible. Proceed with caution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Reset Orders */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <div>
                  <p className="font-medium text-sm">Reset All Orders & Customers</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Permanently deletes all orders, supplements, order history, customers, and webhook logs. Store configuration is preserved.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="shrink-0" disabled={isResettingOrders}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      {isResettingOrders ? 'Resetting...' : 'Reset Data'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset All Orders & Customers?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete <strong>all orders, supplements, order history, customers, webhook logs, and push subscriptions</strong>.
                        <br /><br />
                        Store configurations, room rules, transport types, tour mappings, and user accounts will <strong>not</strong> be affected.
                        <br /><br />
                        <span className="text-destructive font-medium">This action cannot be undone.</span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={handleResetOrders}
                      >
                        Yes, delete everything
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Reset Sync State */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/20 p-4">
                <div>
                  <p className="font-medium text-sm">Reset Shopify Sync State</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Clears sync timestamps on all stores so the next scheduled sync will re-fetch all historical orders from Shopify. Orders are not deleted.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="shrink-0 border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:text-orange-400" disabled={isResettingSync}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {isResettingSync ? 'Resetting...' : 'Reset Sync'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Shopify Sync State?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will clear the <strong>last sync timestamp</strong> on all Shopify stores. The next sync will re-fetch <strong>all historical orders</strong> from Shopify, which may create duplicate orders if they already exist.
                        <br /><br />
                        Existing orders and customers will not be deleted.
                        <br /><br />
                        <span className="text-orange-600 font-medium">Use this only if you need to re-sync from scratch.</span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-orange-600 text-white hover:bg-orange-700"
                        onClick={handleResetSync}
                      >
                        Yes, reset sync state
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
