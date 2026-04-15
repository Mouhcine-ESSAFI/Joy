'use client';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Save, CalendarIcon, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import api from '@/lib/api-client';
import type { TransportType } from '@/lib/types';


const orderSchema = z.object({
  status: z.enum(['New', 'Updated', 'Validate', 'Completed', 'Canceled']).default('New'),
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().optional().refine(
    (val) => !val || z.string().email().safeParse(val).success,
    { message: 'Invalid email address' }
  ),
  customerPhone: z.string().optional(),
  storeId: z.string().min(1, 'Store is required'),
  transportCode: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  
  tourCode: z.string().min(1, 'Tour code is required'),
  pax: z.coerce.number().int().min(1, 'At least one passenger is required'),
  tourDate: z.date({ required_error: 'A tour date is required.' }),
  tourHour: z.string().min(1, 'Tour hour is required'),
  tourType: z.enum(['Shared', 'Private']),
  campType: z.string().optional().nullable(),
  roomType: z.string().min(1, 'Room type is required'),
  accommodationName: z.string().optional().nullable(),
  pickupLocation: z.string().min(1, 'Pickup location is required'),
});

type OrderFormValues = z.infer<typeof orderSchema>;

export default function NewOrderForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [transportTypes, setTransportTypes] = useState<TransportType[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);

  useEffect(() => {
    // ⭐ Load transport types
  api.transportTypes.listActive().then(setTransportTypes); // ⭐ Active only
    
    // ⭐ Load available stores from database
    setStoresLoading(true);
    api.stores.list()
      .then(storesList => {
        console.log('Loaded stores:', storesList);
        setStores(storesList);
        
        // Set first store as default if available
        if (storesList.length > 0 && form.getValues('storeId') === 'EN') {
          const firstStoreId = storesList[0].internalName || storesList[0].id;
          form.setValue('storeId', firstStoreId);
        }
      })
      .catch(err => {
        console.error('Failed to load stores:', err);
        toast({
          title: 'Warning',
          description: 'Could not load stores. Please refresh the page.',
          variant: 'destructive',
        });
      })
      .finally(() => setStoresLoading(false));
  }, []);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      status: 'New',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      storeId: 'EN', // ⭐ Changed from 'ES' to 'EN' (exists in DB)
      transportCode: null,
      note: '',
      tourCode: '',
      pax: 1,
      tourDate: new Date(),
      tourHour: '09:00',
      tourType: 'Shared',
      campType: 'Comfort',
      roomType: '',
      accommodationName: '',
      pickupLocation: '',
    },
  });

  async function onSubmit(values: OrderFormValues) {
    setIsSaving(true);
    
    try {
      // ⭐ Manual orders need default values for Shopify fields
      const payload = {
        // Order identification
        status: values.status,
        shopifyOrderId: 'MANUAL-' + Date.now(), // Unique ID for manual orders
        shopifyOrderNumber: 'MANUAL-' + Date.now(),
        shopifyLineItemId: 'MANUAL-LINE-' + Date.now(),
        
        // Customer info
        customerName: values.customerName,
        customerEmail: values.customerEmail || null,
        customerPhone: values.customerPhone || null,
        
        // Store
        storeId: values.storeId,
        
        // Tour details
        tourCode: values.tourCode,
        tourTitle: `Manual Order - ${values.tourCode}`, // Backend requires tourTitle
        tourType: values.tourType,
        tourDate: format(values.tourDate, 'yyyy-MM-dd'),
        tourHour: values.tourHour,
        pax: values.pax,
        
        // Accommodation
        campType: values.campType || null,
        roomType: values.roomType,
        accommodationName: values.accommodationName || null,
        pickupLocation: values.pickupLocation,
        
        // Transport & notes
        transport: values.transportCode === 'none' ? null : (values.transportCode || null),
        note: values.note || null,
        
        // ⭐ Financial fields (backend requires these as numbers)
        lineItemPrice: 0, // Manual orders start at 0, can be edited later
        shopifyTotalAmount: 0,
        originalTotalAmount: 0,
        depositAmount: 0,
        balanceAmount: 0,
        
        // Financial status
        financialStatus: 'pending',
      };
      
      await api.orders.create(payload);
      
      toast({ 
        title: 'Order Created', 
        description: `Manual order for ${values.customerName} has been created successfully.` 
      });
      router.push('/orders');
    } catch (e: any) {
      toast({ 
        title: 'Creation Failed', 
        description: e?.message || 'Could not create order.', 
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="customerName" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} placeholder="John Doe" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="customerEmail" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} placeholder="john.doe@example.com"/></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="customerPhone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} placeholder="+1 234 567 890" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="storeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Shopify Store</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={storesLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={storesLoading ? "Loading stores..." : "Select store..."} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {stores.map(store => (
                        <SelectItem 
                          key={store.id} 
                          value={store.internalName || store.id}
                        >
                          {store.internalName || store.id}
                        </SelectItem>
                      ))}
                      {stores.length === 0 && !storesLoading && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No stores available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tour Details</CardTitle>
                 <CardDescription>Details for the tour being created.</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="tourDate" render={({ field }) => (<FormItem><FormLabel>Tour Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd-MM-yy") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date("1900-01-01")} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="tourHour" render={({ field }) => (<FormItem><FormLabel>Tour Hour</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="pax" render={({ field }) => (<FormItem><FormLabel>Passengers (PAX)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="tourCode" render={({ field }) => (<FormItem><FormLabel>Tour Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="tourType" render={({ field }) => (<FormItem><FormLabel>Tour Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Shared">Shared</SelectItem><SelectItem value="Private">Private</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="campType" render={({ field }) => (<FormItem><FormLabel>Camp Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Comfort">Comfort</SelectItem><SelectItem value="Luxury">Luxury</SelectItem><SelectItem value="Luxury A/C">Luxury A/C</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="roomType" render={({ field }) => (<FormItem><FormLabel>Room Type</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="accommodationName" render={({ field }) => (<FormItem><FormLabel>Hotel/Camp Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <div className="md:col-span-2">
                    <FormField control={form.control} name="pickupLocation" render={({ field }) => (<FormItem><FormLabel>Pickup Location</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Operational Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="transportCode" render={({ field }) => (<FormItem><FormLabel>Transport</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select transport..." /></SelectTrigger></FormControl><SelectContent>{transportTypes.map(t => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)}<SelectItem value="none">None</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="note" render={({ field }) => (<FormItem><FormLabel>Operational Note</FormLabel><FormControl><Textarea placeholder="Add any operational notes here..." className="min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={isSaving}><Save className="mr-2 h-4 w-4" />{isSaving ? 'Creating...' : 'Create Order'}</Button>
        </div>
      </form>
    </Form>
  );
}