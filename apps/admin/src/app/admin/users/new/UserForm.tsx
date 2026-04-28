'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Save, ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import type { User, ShopifyStore, CreateUserDto, UpdateUserDto, UserRole } from '@/lib/types';
import api from '@/lib/api-client';
import PermissionsForm from '../PermissionsForm';
import { useAuthContext } from '@/context/AuthContext';
import { useTransportTypes } from '@/lib/hooks';

const permissionSchema = z.object({
  create: z.boolean().default(false),
  read: z.boolean().default(false),
  update: z.boolean().default(false),
  delete: z.boolean().default(false),
});

// base schema for fields that are always there
const baseUserSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['Owner', 'Admin', 'Travel Agent', 'Finance', 'Driver']),
  status: z.enum(['active', 'inactive']),
  accessibleShopifyStores: z.array(z.string()),
  permissions: z.record(z.string(), permissionSchema.partial()).optional(),
  assignedTransportCode: z.string().nullable().optional(),
});

// conditional schema based on whether we are editing or creating
function getUserSchema(isEditing: boolean) {
    return baseUserSchema.extend({
        password: isEditing 
            ? z.string().min(8, 'New password must be at least 8 characters').optional().or(z.literal('')) 
            : z.string().min(8, 'Password must be at least 8 characters'),
    }).superRefine((data, ctx) => {
        if (data.role === 'Travel Agent' && data.accessibleShopifyStores.length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['accessibleShopifyStores'],
                message: "Travel Agent must be assigned to at least one store.",
            });
        }
        if (data.role === 'Driver' && !data.assignedTransportCode) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['assignedTransportCode'],
                message: "Driver must be assigned to a transport company.",
            });
        }
    });
}

interface UserFormProps {
    user?: User;
    userId?: string;
}

const getDefaultPermissions = (role: UserRole) => {
  const allTrue = { create: true, read: true, update: true, delete: true };
  const readOnly = { create: false, read: true, update: false, delete: false };

  switch (role) {
    case 'Admin':
      return {
        orders: allTrue, order_notes: allTrue, order_supplements: allTrue, order_history: allTrue,
        users: allTrue, roles: allTrue,
        stores: true, tour_codes: allTrue, room_types: allTrue, transport_types: allTrue,
        invoices: allTrue, payments: allTrue, reports: allTrue,
      };
    case 'Travel Agent':
      return {
        orders: { create: true, read: true, update: true, delete: false },
        order_notes: allTrue, order_supplements: allTrue,
        order_history: readOnly,
      };
    case 'Finance':
      return {
        orders: readOnly, order_history: readOnly,
        invoices: allTrue, payments: allTrue, reports: allTrue,
      };
    case 'Driver':
       return { orders: readOnly };
    default:
      return {};
  }
}

export default function UserForm({ user, userId }: UserFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { user: currentUser } = useAuthContext();
  const [isSaving, setIsSaving] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [shopifyStores, setShopifyStores] = useState<ShopifyStore[]>([]);
  const [ownerExists, setOwnerExists] = useState(false);
  const canManageOwnerRole = currentUser?.role === 'Owner';
  const { transportTypes } = useTransportTypes(false);

  const userSchema = useMemo(() => getUserSchema(!!userId), [userId]);
  type UserFormValues = z.infer<typeof userSchema>;

  useEffect(() => {
    api.stores.list().then(setShopifyStores).catch(err => {
        toast({ variant: 'destructive', title: 'Could not load stores', description: err.message });
    });
    // Check if an Owner already exists (for create mode only)
    if (!userId) {
      api.users.getOwnerProfile().then(() => setOwnerExists(true)).catch(() => setOwnerExists(false));
    }
  }, [toast, userId]);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: user ? {
        ...user,
        password: '',
        permissions: user.permissions || getDefaultPermissions(user.role),
        assignedTransportCode: user.assignedTransportCode ?? null,
    } : {
      name: '', email: '', password: '',
      role: 'Travel Agent', status: 'active',
      accessibleShopifyStores: [],
      permissions: getDefaultPermissions('Travel Agent'),
      assignedTransportCode: null,
    },
  });
  
  const role = form.watch('role');
  const permissions = form.watch('permissions');
  const allowedPermissionKeys = Object.keys(permissions || {});

  const handleRoleChange = (newRole: UserRole) => {
    form.setValue('role', newRole);
    form.setValue('permissions', getDefaultPermissions(newRole));
    form.setValue('assignedTransportCode', null);

    if (newRole === 'Admin' || newRole === 'Finance' || newRole === 'Driver' || newRole === 'Owner') {
        form.setValue('accessibleShopifyStores', shopifyStores.map(s => s.internalName));
    } else {
        form.setValue('accessibleShopifyStores', []);
    }
  }

  async function onSubmit(values: UserFormValues) {
    setIsSaving(true);
    try {
        if (userId) {
            const payload: UpdateUserDto = (values.password)
                ? values
                : Object.fromEntries(Object.entries(values).filter(([key]) => key !== 'password'));
            await api.users.update(userId, payload);
        } else {
            await api.users.create(values as CreateUserDto);
        }
        toast({
            title: userId ? 'User Updated' : 'User Created',
            description: `User ${values.name} has been successfully saved.`,
        });
        router.push('/admin/users');
        router.refresh(); 
    } catch(e: any) {
        toast({
            variant: 'destructive',
            title: userId ? 'Update Failed' : 'Creation Failed',
            description: e.message || 'An unexpected error occurred.',
        });
    } finally {
        setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="user@joymorocco.com" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder={userId ? "Leave blank to keep current" : "••••••••"} {...field} /></FormControl><FormDescription>{userId ? 'Leave blank to keep the password unchanged.' : 'Must be at least 8 characters.'}</FormDescription><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Role</FormLabel><Select onValueChange={(value: UserRole) => handleRoleChange(value)} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{canManageOwnerRole && !ownerExists && <SelectItem value="Owner">Owner</SelectItem>}<SelectItem value="Admin">Admin</SelectItem><SelectItem value="Travel Agent">Travel Agent</SelectItem><SelectItem value="Finance">Finance</SelectItem><SelectItem value="Driver">Driver</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
        </div>

        <Collapsible open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
            <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full">
                    <ChevronsUpDown className="mr-2 h-4 w-4" />
                    {isPermissionsOpen ? 'Hide' : 'Show'} Advanced Permissions
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-6 animate-in fade-in-0 zoom-in-95">
                 <PermissionsForm allowedKeys={allowedPermissionKeys} />
            </CollapsibleContent>
        </Collapsible>
        
        {role === 'Travel Agent' && (
            <Card>
                <CardHeader><CardTitle>Store Access</CardTitle><CardDescription>Select which Shopify stores this travel agent can access.</CardDescription></CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="accessibleShopifyStores"
                        render={() => (
                            <FormItem>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {shopifyStores.map((store) => (
                                    <FormField
                                        key={store.id}
                                        control={form.control}
                                        name="accessibleShopifyStores"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                                <FormControl>
                                                <Checkbox
                                                    checked={field.value?.includes(store.internalName)}
                                                    onCheckedChange={(checked) => {
                                                    return checked
                                                        ? field.onChange([...field.value, store.internalName])
                                                        : field.onChange(
                                                            field.value?.filter(
                                                            (value) => value !== store.internalName
                                                            )
                                                        )
                                                    }}
                                                />
                                                </FormControl>
                                                <FormLabel className="font-normal cursor-pointer w-full">{store.internalName} - {store.shopifyDomain}</FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                    ))}
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>
        )}
        
        {role === 'Driver' && (
            <Card>
                <CardHeader><CardTitle>Transport Assignment</CardTitle><CardDescription>Assign this driver to a transport company. They will only see orders with this transport code.</CardDescription></CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="assignedTransportCode"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Transport Company</FormLabel>
                                <Select onValueChange={(v) => field.onChange(v || null)} value={field.value ?? ''}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Select a transport company" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {transportTypes.map((t) => (
                                            <SelectItem key={t.id} value={t.code}>{t.name} ({t.code})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>
        )}

        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Save className="mr-2"/>
                {isSaving ? 'Saving...' : 'Save User'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
