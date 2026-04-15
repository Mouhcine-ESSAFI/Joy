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
import { PlusCircle, Edit, Trash2, MoreHorizontal, ArrowLeft } from 'lucide-react';
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
  const { tourMappings: products, loading: isLoading, error, refetch } = useTourMappings();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<TourMapping | null>(null);
  const [deletingMapping, setDeletingMapping] = useState<TourMapping | null>(null);
  const [shopifyStores, setShopifyStores] = useState<ShopifyStore[]>([]);

  const [formState, setFormState] = useState({
      storeId: '',
      productTitle: '',
      tourCode: '',
  });

  const { toast } = useToast();

  useEffect(() => {
    api.stores.list()
      .then((stores) => {
        setShopifyStores(stores);
        // Set default storeId to first active store
        const first = stores.find((s) => s.status === 'active') || stores[0];
        if (first) setFormState((f) => ({ ...f, storeId: first.internalName }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if(error) {
        toast({ variant: 'destructive', title: 'Error fetching mappings', description: error });
    }
  }, [error, toast]);

  const handleEditClick = (mapping: TourMapping) => {
    setEditingMapping(mapping);
    setFormState({
        storeId: mapping.storeId,
        productTitle: mapping.productTitle,
        tourCode: mapping.tourCode || '',
    });
    setIsFormOpen(true);
  };

  const handleCreateClick = () => {
    setEditingMapping(null);
    const first = shopifyStores.find((s) => s.status === 'active') || shopifyStores[0];
    setFormState({
        storeId: first?.internalName || '',
        productTitle: '',
        tourCode: '',
    });
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingMapping(null);
  };

  const handleSave = async () => {
    try {
        if (editingMapping) {
            await api.tourMappings.update(editingMapping.id, { tourCode: formState.tourCode });
            toast({ title: "Mapping Updated", description: `Mapping for ${editingMapping.productTitle} has been updated.` });
        } else {
            if (!formState.productTitle) {
                toast({ 
                  variant: 'destructive', 
                  title: 'Missing Information', 
                  description: 'Product Title is required.'  // ⭐ Updated message
                });
                return;
            }
            await api.tourMappings.create({
                storeId: formState.storeId,
                productTitle: formState.productTitle,
                tourCode: formState.tourCode,
            });
            toast({ title: "Mapping Created", description: `New tour code mapping has been created.` });
        }
        refetch();
        handleFormClose();
    } catch(e: any) {
        toast({ variant: "destructive", title: "Save Failed", description: e.message || 'An unexpected error occurred.' });
    }
  };

  const handleDelete = async () => {
    if (!deletingMapping) return;
    try {
        await api.tourMappings.delete(deletingMapping.id);
        toast({ variant: "destructive", title: "Mapping Deleted", description: `Mapping for ${deletingMapping.productTitle} has been deleted.` });
        refetch();
        setDeletingMapping(null);
    } catch(e: any) {
        toast({ variant: "destructive", title: "Delete Failed", description: e.message || 'An unexpected error occurred.' });
    }
  };

  const renderSkeleton = () => (
    [...Array(4)].map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-6 w-12" /></TableCell>
        <TableCell><Skeleton className="h-6 w-full" /></TableCell>
        <TableCell><Skeleton className="h-6 w-32" /></TableCell>
        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
      </TableRow>
    ))
  );

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
                    Manage Shopify product to internal tour code mappings.
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
                {!isLoading && products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Badge variant="secondary">{product.storeId}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{product.productTitle}</TableCell>
                    <TableCell>
                      {product.tourCode ? (
                        <Badge variant="outline">{product.tourCode}</Badge>
                      ) : (
                        <Badge variant="destructive">Not Assigned</Badge>
                      )}
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
                                <DropdownMenuItem onClick={() => handleEditClick(product)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>Edit</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => setDeletingMapping(product)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && products.length === 0 && (
                  <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No products found.
                      </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingMapping ? 'Edit Mapping' : 'Create New Mapping'}</DialogTitle>
                <DialogDescription>
                    {editingMapping ? 'Update the tour code for this product.' : 'Create a new product to tour code mapping.'}
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="store" className="text-right">Store</Label>
                    <Select value={formState.storeId} onValueChange={(v) => setFormState(s => ({...s, storeId: v}))} disabled={!!editingMapping}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select store..." />
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
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="title" className="text-right">Product Title</Label>
                    <Input id="title" value={formState.productTitle} onChange={(e) => setFormState(s => ({...s, productTitle: e.target.value}))} className="col-span-3" disabled={!!editingMapping} />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="tourCode" className="text-right">Tour Code</Label>
                    <Input id="tourCode" placeholder="e.g. MARR3D" value={formState.tourCode} onChange={(e) => setFormState(s => ({...s, tourCode: e.target.value}))} className="col-span-3" />
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
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the mapping for <strong>{deletingMapping?.productTitle}</strong>.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </>
  );
}
