'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, ArrowLeft, Copy, Check, Webhook } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useCallback } from "react";
import type { ShopifyStore } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useShopifyStores } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import api from "@/lib/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const WEBHOOK_ENDPOINTS = [
  { label: 'Order Created', path: '/webhooks/shopify/orders/create' },
  { label: 'Order Updated', path: '/webhooks/shopify/orders/updated' },
  { label: 'Order Cancelled', path: '/webhooks/shopify/orders/cancelled' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCopy} title="Copy URL">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

const defaultNewStore = {
    internalName: '',
    shopifyDomain: '',
    accessToken: '',
    webhookSecret: '',
};

export default function IntegrationsPage() {
  const router = useRouter();
  const { stores, loading: isLoading, refetch } = useShopifyStores();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newStore, setNewStore] = useState(defaultNewStore);

  const [editingStore, setEditingStore] = useState<ShopifyStore | null>(null);
  const [editCreds, setEditCreds] = useState({ accessToken: '', webhookSecret: ''});

  const [deletingStore, setDeletingStore] = useState<ShopifyStore | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (!isAddDialogOpen) {
      setNewStore(defaultNewStore);
    }
  }, [isAddDialogOpen]);

  useEffect(() => {
    if (!editingStore) {
        setEditCreds({ accessToken: '', webhookSecret: ''});
    }
  }, [editingStore]);
  
  // ⭐ ADDED: Helper to notify other pages
  const notifyStoresUpdated = () => {
    // Emit event to notify orders page
    window.dispatchEvent(new CustomEvent('stores-updated'));
    // Refetch stores
    refetch();
  };

  const handleDisconnect = async () => {
    if (!deletingStore) return;
    try {
        // ⭐ CHANGED: Toggle status instead of delete
        await api.stores.toggleStatus(deletingStore.id);
        
        const newStatus = deletingStore.status === 'active' ? 'inactive' : 'active';
        
        toast({ 
          title: newStatus === 'inactive' ? 'Store Deactivated' : 'Store Activated', 
          description: `${deletingStore.internalName} has been ${newStatus === 'inactive' ? 'deactivated' : 'activated'}.`
        });
        
        notifyStoresUpdated();
        setDeletingStore(null);
    } catch (e: any) {
        toast({ variant: "destructive", title: 'Failed to update status', description: e.message });
    }
  }
  
  const handleSave = async () => {
    if (!editingStore) return;
    try {
        await api.stores.update(editingStore.id, editCreds);
        toast({ title: "Credentials Saved", description: `Credentials for ${editingStore?.internalName} have been updated.` });
        setEditingStore(null);
        notifyStoresUpdated(); // ⭐ CHANGED: Use helper
    } catch (e: any) {
        toast({ variant: "destructive", title: 'Failed to save', description: e.message });
    }
  }
  
  const handleConnect = async () => {
    try {
        await api.stores.create(newStore);
        toast({ title: "Store Connected", description: `Store ${newStore.internalName} has been connected.` });
        setIsAddDialogOpen(false);
        notifyStoresUpdated(); // ⭐ CHANGED: Use helper
    } catch (e: any) {
        toast({ variant: "destructive", title: 'Failed to connect', description: e.message });
    }
  }

  const renderSkeleton = () => (
    [...Array(2)].map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
        <TableCell><Skeleton className="h-6 w-48" /></TableCell>
        <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-24" /></TableCell>
        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <AppLayout>
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => router.back()}>
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">Back</span>
                        </Button>
                        <div className="grid gap-1">
                            <CardTitle>Integration Management</CardTitle>
                            <CardDescription>Connect and manage your Shopify stores.</CardDescription>
                        </div>
                    </div>
                    <Button size="sm" className="gap-1" onClick={() => setIsAddDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Connect New Store
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Internal Name</TableHead>
                            <TableHead>Shopify Domain</TableHead>
                            <TableHead className="hidden sm:table-cell">API Version</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>
                                <span className="sr-only">Actions</span>
                            </TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {isLoading ? renderSkeleton() : stores.map(store => (
                            <TableRow key={store.id}>
                                <TableCell className="font-medium">{store.internalName}</TableCell>
                                <TableCell>{store.shopifyDomain}</TableCell>
                                <TableCell className="hidden sm:table-cell">{store.apiVersion}</TableCell>
                                <TableCell>
                                    <Badge variant={store.status === 'active' ? 'default' : 'destructive'}>
                                        {store.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setEditingStore(store)}>Edit Credentials</DropdownMenuItem>
                                            <DropdownMenuItem 
                                              className={store.status === 'active' ? 'text-destructive focus:text-destructive' : ''}
                                              onClick={() => setDeletingStore(store)}
                                            >
                                              {store.status === 'active' ? 'Deactivate' : 'Activate'}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>

        {/* Webhook Endpoints Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Webhook Endpoints</CardTitle>
                <CardDescription className="mt-1">
                  Register these URLs in your Shopify store under <strong>Settings → Notifications → Webhooks</strong>.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {WEBHOOK_ENDPOINTS.map(({ label, path }) => {
                const url = `${API_URL}${path}`;
                return (
                  <div key={path} className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
                      <p className="text-sm font-mono truncate select-all">{url}</p>
                    </div>
                    <CopyButton text={url} />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Use <strong>JSON</strong> format when registering webhooks in Shopify. Set the <strong>Webhook secret</strong> to match the key configured per store above.
            </p>
          </CardContent>
        </Card>

        {/* Add Store Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Connect a new Shopify Store</DialogTitle>
                    <DialogDescription>
                        Enter the details for the new Shopify store you want to integrate.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Internal Name
                        </Label>
                        <Input id="name" placeholder="e.g. 'FR' for French store" className="col-span-3" value={newStore.internalName} onChange={(e) => setNewStore(s => ({...s, internalName: e.target.value}))}/>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="domain" className="text-right">
                            Shopify Domain
                        </Label>
                        <Input id="domain" placeholder="your-store.myshopify.com" className="col-span-3" value={newStore.shopifyDomain} onChange={(e) => setNewStore(s => ({...s, shopifyDomain: e.target.value}))}/>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="token" className="text-right">
                            Access Token
                        </Label>
                        <Input id="token" type="password" placeholder="shpat_••••••••••••" className="col-span-3" value={newStore.accessToken} onChange={(e) => setNewStore(s => ({...s, accessToken: e.target.value}))}/>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="webhookKey" className="text-right">
                            Webhook Key
                        </Label>
                        <Input id="webhookKey" type="password" placeholder="••••••••••••••••" className="col-span-3" value={newStore.webhookSecret} onChange={(e) => setNewStore(s => ({...s, webhookSecret: e.target.value}))}/>
                    </div>
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleConnect}>Connect Store</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Edit Store Dialog */}
        <Dialog open={!!editingStore} onOpenChange={(isOpen) => !isOpen && setEditingStore(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Credentials for {editingStore?.internalName}</DialogTitle>
                    <DialogDescription>
                        Update the access token and webhook key for this store.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-name" className="text-right">
                            Internal Name
                        </Label>
                        <Input id="edit-name" value={editingStore?.internalName || ''} className="col-span-3" disabled />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-domain" className="text-right">
                            Shopify Domain
                        </Label>
                        <Input id="edit-domain" value={editingStore?.shopifyDomain || ''} className="col-span-3" disabled />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-token" className="text-right">
                            Access Token
                        </Label>
                        <Input id="edit-token" type="password" placeholder="shpat_••••••••••••" className="col-span-3" value={editCreds.accessToken} onChange={(e) => setEditCreds(c => ({...c, accessToken: e.target.value}))}/>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-webhookKey" className="text-right">
                            Webhook Key
                        </Label>
                        <Input id="edit-webhookKey" type="password" placeholder="••••••••••••••••" className="col-span-3" value={editCreds.webhookSecret} onChange={(e) => setEditCreds(c => ({...c, webhookSecret: e.target.value}))}/>
                    </div>
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingStore(null)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Credentials</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Toggle Status Confirmation */}
        <AlertDialog open={!!deletingStore} onOpenChange={() => setDeletingStore(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>
                  {deletingStore?.status === 'active' ? 'Deactivate Store?' : 'Activate Store?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                    {deletingStore?.status === 'active' ? (
                      <>
                        This will deactivate the <strong>{deletingStore?.internalName}</strong> store. 
                        Orders will remain in the database, but webhooks will be ignored.
                      </>
                    ) : (
                      <>
                        This will activate the <strong>{deletingStore?.internalName}</strong> store. 
                        Webhooks will be processed and orders will sync.
                      </>
                    )}
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDisconnect} 
                  className={deletingStore?.status === 'active' ? 'bg-destructive hover:bg-destructive/90' : ''}
                >
                  {deletingStore?.status === 'active' ? 'Deactivate' : 'Activate'}
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </AppLayout>
  );
}