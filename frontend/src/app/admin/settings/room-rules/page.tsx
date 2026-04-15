'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, Edit, MoreHorizontal, ArrowLeft } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useRoomTypeRules } from "@/lib/hooks";
import type { RoomTypeRule, CreateRoomTypeRuleDto, UpdateRoomTypeRuleDto } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import api from "@/lib/api-client";

const defaultFormState: CreateRoomTypeRuleDto = {
    paxMin: 1,
    paxMax: 1,
    defaultRoomType: '',
    allowedRoomTypes: [],
};

export default function RoomRulesPage() {
  const router = useRouter();
  const { roomRules: rules, loading: isLoading, refetch } = useRoomTypeRules();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RoomTypeRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<RoomTypeRule | null>(null);
  const [formState, setFormState] = useState<CreateRoomTypeRuleDto | UpdateRoomTypeRuleDto>(defaultFormState);
  const [overridesInput, setOverridesInput] = useState(''); // ⭐ NEW: Separate state for input text
  
  const { toast } = useToast();

  useEffect(() => {
    if (isFormOpen) {
        if (editingRule) {
            setFormState({
                ...editingRule,
                allowedRoomTypes: editingRule.allowedRoomTypes || [],
            });
            // ⭐ Set the input text when editing
            setOverridesInput(editingRule.allowedRoomTypes?.join(' - ') || '');
        } else {
            setFormState(defaultFormState);
            setOverridesInput(''); // ⭐ Clear input for new rule
        }
    }
  }, [isFormOpen, editingRule]);

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingRule(null);
  }

  const handleSave = async () => {
    try {
        if (editingRule) {
            // ⭐ Only send fields that are in UpdateRoomTypeRuleDto (exclude id, createdAt, updatedAt)
            const updatePayload: UpdateRoomTypeRuleDto = {
                paxMin: formState.paxMin,
                paxMax: formState.paxMax,
                defaultRoomType: formState.defaultRoomType,
                allowedRoomTypes: Array.from(new Set(formState.allowedRoomTypes)), // ⭐ Remove duplicates
                isActive: (formState as any).isActive ?? true,
            };
            await api.roomRules.update(editingRule.id, updatePayload);
            toast({ title: "Rule Updated", description: `Rule has been updated.` });
        } else {
            // ⭐ For create, also use only DTO fields
            const createPayload: CreateRoomTypeRuleDto = {
                paxMin: formState.paxMin,
                paxMax: formState.paxMax,
                defaultRoomType: formState.defaultRoomType,
                allowedRoomTypes: Array.from(new Set(formState.allowedRoomTypes)), // ⭐ Remove duplicates
            };
            await api.roomRules.create(createPayload);
            toast({ title: "Rule Added", description: `New rule has been added.` });
        }
        refetch();
        handleFormClose();
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Save failed', description: e.message });
    }
  }

  const handleDelete = async () => {
    if (!deletingRule) return;
    try {
        await api.roomRules.delete(deletingRule.id);
        toast({ variant: "destructive", title: "Rule Deleted", description: `The rule has been deleted.` });
        setDeletingRule(null);
        refetch();
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Delete failed', description: e.message });
    }
  }
  
  const handleAllowedTypesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setOverridesInput(inputValue); // ⭐ Update input text directly
    
    // ⭐ Parse and update the array (with deduplication)
    const types = inputValue
      .split('-')
      .map(t => t.trim())
      .filter(Boolean);
    
    const uniqueTypes = Array.from(new Set(types));
    
    setFormState(s => ({...s, allowedRoomTypes: uniqueTypes }));
  }

  const renderSkeleton = () => (
    [...Array(4)].map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-6 w-12" /></TableCell>
        <TableCell><Skeleton className="h-6 w-12" /></TableCell>
        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
        <TableCell><Skeleton className="h-6 w-48" /></TableCell>
        <TableCell><Skeleton className="h-6 w-12" /></TableCell>
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
                            <CardTitle>Room Type Rules</CardTitle>
                            <CardDescription>Define rules for assigning room types based on passenger count (PAX).</CardDescription>
                        </div>
                    </div>
                    <Button size="sm" className="gap-1" onClick={() => setIsFormOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Rule
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>PAX Min</TableHead>
                            <TableHead>PAX Max</TableHead>
                            <TableHead>Default Room Type</TableHead>
                            <TableHead>Allowed Overrides</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {isLoading ? renderSkeleton() : rules.map(rule => (
                            <TableRow key={rule.id}>
                                <TableCell className="font-medium">{rule.paxMin}</TableCell>
                                <TableCell className="font-medium">{rule.paxMax}</TableCell>
                                <TableCell><Badge variant="secondary">{rule.defaultRoomType}</Badge></TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {rule.allowedRoomTypes.map((rt, idx) => <Badge key={`${rule.id}-${idx}`} variant="outline">{rt}</Badge>)}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Switch checked={rule.isActive} onCheckedChange={async (checked) => {
                                        await api.roomRules.update(rule.id, { isActive: checked });
                                        refetch();
                                    }}/>
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
                                            <DropdownMenuItem onClick={() => { setEditingRule(rule); setIsFormOpen(true);}}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                <span>Edit</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive" onClick={() => setDeletingRule(rule)}>
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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{editingRule ? 'Edit Room Rule' : 'Add New Room Rule'}</DialogTitle>
                    <DialogDescription>
                        {editingRule ? 'Update the details for this room assignment rule.' : 'Fill in the details to create a new rule for room type assignment.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="pax-min" className="text-right">PAX Min</Label>
                        <Input id="pax-min" type="number" value={formState.paxMin} onChange={e => setFormState(s => ({...s, paxMin: Number(e.target.value)}))} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="pax-max" className="text-right">PAX Max</Label>
                        <Input id="pax-max" type="number" value={formState.paxMax} onChange={e => setFormState(s => ({...s, paxMax: Number(e.target.value)}))} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="default-room-type" className="text-right">Default Type</Label>
                        <Input id="default-room-type" placeholder="e.g., 1xSingle" value={formState.defaultRoomType} onChange={e => setFormState(s => ({...s, defaultRoomType: e.target.value}))} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="allowed-overrides" className="text-right">Overrides</Label>
                        <Input 
                            id="allowed-overrides" 
                            placeholder="e.g., 1xSingle - 2xDouble" 
                            value={overridesInput} 
                            onChange={handleAllowedTypesChange} 
                            className="col-span-3" 
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleFormClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save Rule</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingRule} onOpenChange={() => setDeletingRule(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the selected room rule.
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