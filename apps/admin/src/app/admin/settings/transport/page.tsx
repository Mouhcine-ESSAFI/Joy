'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MoreHorizontal, PlusCircle, Trash2, Edit, ArrowLeft } from 'lucide-react';
import AppLayout from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { useTransportTypes } from "@/lib/hooks";
import type { TransportType, CreateTransportTypeDto, UpdateTransportTypeDto } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import api from "@/lib/api-client";

const defaultFormState: CreateTransportTypeDto = {
  code: '',
  name: '',
};

export default function TransportSettingsPage() {
  const router = useRouter();
  const { transportTypes, loading: isLoading, refetch } = useTransportTypes();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransport, setEditingTransport] = useState<TransportType | null>(null);
  const [deletingTransport, setDeletingTransport] = useState<TransportType | null>(null);
  const [formState, setFormState] = useState<CreateTransportTypeDto | UpdateTransportTypeDto>(defaultFormState);
  
  const { toast } = useToast();
  
  useEffect(() => {
    if (isFormOpen) {
      if (editingTransport) {
        setFormState(editingTransport);
      } else {
        setFormState(defaultFormState);
      }
    }
  }, [isFormOpen, editingTransport]);

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingTransport(null);
  }

  const handleSave = async () => {
    try {
      if (editingTransport) {
        await api.transportTypes.update(editingTransport.id, formState as UpdateTransportTypeDto);
        toast({ title: "Transport Updated", description: `${(formState as UpdateTransportTypeDto).name} has been updated.` });
      } else {
        await api.transportTypes.create(formState as CreateTransportTypeDto);
        toast({ title: "Transport Added", description: `${(formState as CreateTransportTypeDto).name} has been added.` });
      }
      refetch();
      handleFormClose();
    } catch(e: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
    }
  }

  const handleDelete = async () => {
    if (!deletingTransport) return;
    try {
        await api.transportTypes.delete(deletingTransport.id);
        toast({ variant: "destructive", title: "Transport Deleted", description: `${deletingTransport.name} has been deleted.` });
        setDeletingTransport(null);
        refetch();
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
    }
  }

  const renderSkeleton = () => (
    [...Array(3)].map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
        <TableCell><Skeleton className="h-6 w-48" /></TableCell>
        <TableCell><Skeleton className="h-6 w-12" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-full ml-auto" /></TableCell>
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
                            <CardTitle>Transport Types</CardTitle>
                            <CardDescription>Manage transport companies available for orders.</CardDescription>
                        </div>
                    </div>
                    <Button size="sm" className="gap-1" onClick={() => setIsFormOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Transport
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Active</TableHead>
                                <TableHead className="w-[100px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? renderSkeleton() : transportTypes.map(transport => (
                            <TableRow key={transport.id}>
                                <TableCell className="font-medium">{transport.code}</TableCell>
                                <TableCell>{transport.name}</TableCell>
                                <TableCell>
                                <Switch checked={transport.isActive} onCheckedChange={async (checked) => {
                                    await api.transportTypes.update(transport.id, { isActive: checked });
                                    refetch();
                                }} />
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
                                        <DropdownMenuItem onClick={() => {setEditingTransport(transport); setIsFormOpen(true)}}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            <span>Edit</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onClick={() => setDeletingTransport(transport)}>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            <span>Delete</span>
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

        {/* Add/Edit Dialog */}
        <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingTransport ? 'Edit Transport Type' : 'Add New Transport Type'}</DialogTitle>
                    <DialogDescription>
                        {editingTransport ? 'Update the details for this transport type.' : 'Fill in the details for the new transport type.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="code" className="text-right">Code</Label>
                        <Input id="code" value={formState.code} onChange={e => setFormState(s => ({...s, code: e.target.value}))} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" value={formState.name} onChange={e => setFormState(s => ({...s, name: e.target.value}))} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleFormClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingTransport} onOpenChange={() => setDeletingTransport(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the transport type <strong>{deletingTransport?.name}</strong>.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </AppLayout>
  );
}
