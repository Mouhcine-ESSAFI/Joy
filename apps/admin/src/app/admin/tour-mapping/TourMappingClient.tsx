'use client';
import { useState, useEffect } from 'react';
import type { TourMapping, ShopifyStore } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTourMappings } from '@/lib/hooks';
import api from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, MoreHorizontal, ArrowLeft, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';

export default function TourMappingClient() {
  const router = useRouter();
  const { tourMappings: mappings, loading: isLoading, error, refetch } = useTourMappings();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<TourMapping | null>(null);
  const [deletingMapping, setDeletingMapping] = useState<TourMapping | null>(null);
  const [shopifyStores, setShopifyStores] = useState<ShopifyStore[]>([]);

  const [formState, setFormState] = useState({ storeId: '', productTitle: '', tourCode: '' });
  const [storeProducts, setStoreProducts] = useState<string[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const { toast } = useToast();

  // Load stores on mount
  useEffect(() => {
    api.stores.list()
      .then((stores) => {
        setShopifyStores(stores);
        const first = stores.find((s) => s.status === 'active') || stores[0];
        if (first) setFormState((f) => ({ ...f, storeId: first.internalName }));
      })
      .catch(() => {});
  }, []);

  // Fetch product titles whenever storeId changes (only in create mode)
  useEffect(() => {
    if (!formState.storeId || editingMapping) return;
    setProductsLoading(true);
    setStoreProducts([]);
    api.tourMappings.storeProducts(formState.storeId)
      .then(setStoreProducts)
      .catch((e: any) => toast({ variant: 'destructive', title: 'Failed to load products', description: e?.message || 'Could not fetch product titles from Shopify.' }))
      .finally(() => setProductsLoading(false));
  }, [formState.storeId, editingMapping]);

  useEffect(() => {
    if (error) toast({ variant: 'destructive', title: 'Error fetching mappings', description: error });
  }, [error, toast]);

  const handleEditClick = (mapping: TourMapping) => {
    setEditingMapping(mapping);
    setFormState({ storeId: mapping.storeId, productTitle: mapping.productTitle, tourCode: mapping.tourCode || '' });
    setIsFormOpen(true);
  };

  const handleCreateClick = () => {
    setEditingMapping(null);
    const first = shopifyStores.find((s) => s.status === 'active') || shopifyStores[0];
    setFormState({ storeId: first?.internalName || '', productTitle: '', tourCode: '' });
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingMapping(null);
  };

  const handleStoreChange = (storeId: string) => {
    setFormState((s) => ({ ...s, storeId, productTitle: '' }));
  };

  const handleSave = async () => {
    try {
      if (editingMapping) {
        await api.tourMappings.update(editingMapping.id, { tourCode: formState.tourCode });
        toast({ title: 'Mapping Updated', description: `Tour code updated. All orders with the old code have been updated automatically.` });
      } else {
        if (!formState.productTitle) {
          toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a product title.' });
          return;
        }
        await api.tourMappings.create({
          storeId: formState.storeId,
          productTitle: formState.productTitle,
          tourCode: formState.tourCode,
        });
        toast({ title: 'Mapping Created', description: 'New tour code mapping has been created.' });
      }
      refetch();
      handleFormClose();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: e.message || 'An unexpected error occurred.' });
    }
  };

  const handleDelete = async () => {
    if (!deletingMapping) return;
    try {
      await api.tourMappings.delete(deletingMapping.id);
      toast({ title: 'Mapping Deleted', description: `Mapping for "${deletingMapping.productTitle}" has been deleted.` });
      refetch();
      setDeletingMapping(null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: e.message || 'An unexpected error occurred.' });
      setDeletingMapping(null);
    }
  };

  const renderSkeleton = () =>
    [...Array(4)].map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-6 w-12" /></TableCell>
        <TableCell><Skeleton className="h-6 w-full" /></TableCell>
        <TableCell><Skeleton className="h-6 w-32" /></TableCell>
        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
      </TableRow>
    ));

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Button>
              <div className="grid gap-1">
                <CardTitle>Tour Code Mapping</CardTitle>
                <CardDescription>
                  Map Shopify product titles to internal tour codes. Updating a code propagates to all matching orders automatically.
                </CardDescription>
              </div>
            </div>
            <Button size="sm" className="gap-1" onClick={handleCreateClick}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Mapping
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store</TableHead>
                  <TableHead className="w-[50%]">Product Title</TableHead>
                  <TableHead>Tour Code</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && renderSkeleton()}
                {!isLoading && mappings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell><Badge variant="secondary">{m.storeId}</Badge></TableCell>
                    <TableCell className="font-medium">{m.productTitle}</TableCell>
                    <TableCell>
                      {m.tourCode
                        ? <Badge variant="outline">{m.tourCode}</Badge>
                        : <Badge variant="destructive">Not Assigned</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(m)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeletingMapping(m)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && mappings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No mappings found. Create one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMapping ? 'Edit Tour Code' : 'Create New Mapping'}</DialogTitle>
            <DialogDescription>
              {editingMapping
                ? 'Update the tour code. All orders currently using the old code will be updated automatically.'
                : 'Select a store, pick a product, and assign a tour code.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Store */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Store</Label>
              <Select
                value={formState.storeId}
                onValueChange={handleStoreChange}
                disabled={!!editingMapping}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select store…" />
                </SelectTrigger>
                <SelectContent>
                  {shopifyStores.map((store) => (
                    <SelectItem key={store.id} value={store.internalName}>
                      {store.internalName} — {store.shopifyDomain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Title */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Product</Label>
              {editingMapping ? (
                <Input value={formState.productTitle} disabled className="col-span-3" />
              ) : (
                <div className="col-span-3 relative">
                  <Select
                    value={formState.productTitle}
                    onValueChange={(v) => setFormState((s) => ({ ...s, productTitle: v }))}
                    disabled={productsLoading || !formState.storeId}
                  >
                    <SelectTrigger>
                      {productsLoading
                        ? <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Loading products…</span>
                        : <SelectValue placeholder="Select a product…" />}
                    </SelectTrigger>
                    <SelectContent>
                      {storeProducts.map((title) => (
                        <SelectItem key={title} value={title}>{title}</SelectItem>
                      ))}
                      {!productsLoading && storeProducts.length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No products found</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Tour Code */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Tour Code</Label>
              <Input
                placeholder="e.g. MARR3D"
                value={formState.tourCode}
                onChange={(e) => setFormState((s) => ({ ...s, tourCode: e.target.value }))}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleFormClose}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingMapping} onOpenChange={() => setDeletingMapping(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete mapping?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the mapping for <strong>{deletingMapping?.productTitle}</strong>.
              {deletingMapping?.tourCode && (
                <> Tour code <strong>{deletingMapping.tourCode}</strong> must not be assigned to any orders — if it is, the delete will be blocked.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
