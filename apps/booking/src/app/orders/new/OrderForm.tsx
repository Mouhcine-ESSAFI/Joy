'use client';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, CalendarIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useForm, useWatch } from 'react-hook-form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
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
import type { TransportType, TourMapping } from '@/lib/types';

const orderSchema = z.object({
  status: z.enum(['New', 'Updated', 'Completed', 'Processed', 'Canceled']).default('New'),
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().optional().refine(
    (val) => !val || z.string().email().safeParse(val).success,
    { message: 'Invalid email address' }
  ),
  customerPhone: z.string().optional(),
  storeId: z.string().optional(),
  customStoreId: z.string().optional(),
  transportCode: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
  stops: z.string().optional().nullable(),

  tourCode: z.string().optional().nullable(),
  pax: z.coerce.number().int().min(1, 'At least one passenger is required'),
  tourDate: z.date({ required_error: 'A tour date is required.' }),
  tourHour: z.string().optional().nullable(),
  tourType: z.enum(['Shared', 'Private']),
  campType: z.string().optional().nullable(),
  roomType: z.string().optional().nullable(),
  accommodationName: z.string().optional().nullable(),
  pickupLocation: z.string().optional().nullable(),

  totalPrice: z.coerce.number().min(0).default(0),
  depositAmount: z.coerce.number().min(0).default(0),
  language: z.string().optional().nullable(),
});

type OrderFormValues = z.infer<typeof orderSchema>;

export default function NewOrderForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [transportTypes, setTransportTypes] = useState<TransportType[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [tourMappings, setTourMappings] = useState<TourMapping[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [useCustomStore, setUseCustomStore] = useState(false);

  useEffect(() => {
    api.transportTypes.listActive().then(setTransportTypes).catch(() => {});

    setStoresLoading(true);
    api.stores.list()
      .then((list) => { setStores(list); })
      .catch(() => toast({ title: 'Warning', description: 'Could not load stores.', variant: 'destructive' }))
      .finally(() => setStoresLoading(false));

    api.tourMappings.list()
      .then((mappings) => setTourMappings(mappings))
      .catch(() => {});
  }, []);

  // Unique tour codes across all stores
  const tourCodeOptions = Array.from(
    new Map(
      tourMappings
        .filter((m) => m.tourCode)
        .map((m) => [m.tourCode!, m])
    ).values()
  ).sort((a, b) => (a.tourCode ?? '').localeCompare(b.tourCode ?? ''));

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      status: 'New',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      storeId: '',
      customStoreId: '',
      transportCode: null,
      note: '',
      comment: '',
      stops: '',
      tourCode: null,
      pax: 1,
      tourDate: new Date(),
      tourHour: '07:00',
      tourType: 'Shared',
      campType: null,
      roomType: null,
      accommodationName: '',
      pickupLocation: '',
      totalPrice: 0,
      depositAmount: 0,
      language: null,
    },
  });

  const { showPrompt, confirmLeave, stayOnPage, guard } = useUnsavedChanges(form.formState.isDirty);

  // Auto-set language from store's primaryLocale when store selection changes
  const watchedStoreId = useWatch({ control: form.control, name: 'storeId' });
  const watchedCustomStoreId = useWatch({ control: form.control, name: 'customStoreId' });
  useEffect(() => {
    if (useCustomStore) {
      if (watchedCustomStoreId) form.setValue('language', watchedCustomStoreId.toUpperCase());
    } else {
      const selected = stores.find((s) => (s.internalName || s.id) === watchedStoreId);
      if (selected) {
        const locale = selected.primaryLocale?.toUpperCase() ?? selected.internalName?.toUpperCase() ?? null;
        form.setValue('language', locale);
      }
    }
  }, [watchedStoreId, watchedCustomStoreId, useCustomStore, stores]);

  async function onSubmit(values: OrderFormValues) {
    setIsSaving(true);
    try {
      const resolvedStoreId = useCustomStore
        ? (values.customStoreId || 'Manual')
        : (values.storeId || 'Manual');

      const payload = {
        status: values.status,
        shopifyOrderId: 'MANUAL-' + Date.now(),
        shopifyOrderNumber: 'MANUAL-' + Date.now(),
        shopifyLineItemId: 'MANUAL-LINE-' + Date.now(),

        customerName: values.customerName,
        customerEmail: values.customerEmail || null,
        customerPhone: values.customerPhone || null,

        storeId: resolvedStoreId,

        tourCode: values.tourCode || null,
        tourTitle: values.tourCode ? `Manual Order - ${values.tourCode}` : 'Manual Order',
        tourType: values.tourType,
        tourDate: format(values.tourDate, 'yyyy-MM-dd'),
        tourHour: values.tourHour || '07:00',
        pax: values.pax,

        campType: values.campType || null,
        roomType: values.roomType || null,
        accommodationName: values.accommodationName || null,
        pickupLocation: values.pickupLocation || null,
        stops: values.stops || null,

        transport: values.transportCode === 'none' ? null : (values.transportCode || null),
        note: values.note || null,
        comment: values.comment || null,

        lineItemPrice: values.totalPrice,
        shopifyTotalAmount: values.totalPrice,
        originalTotalAmount: values.totalPrice,
        depositAmount: values.depositAmount,
        balanceAmount: values.totalPrice - values.depositAmount,

        financialStatus: 'pending',
        language: values.language || null,
      };

      await api.orders.create(payload as any);
      toast({ title: 'Order Created', description: `Manual order for ${values.customerName} created.` });
      router.back();
    } catch (e: any) {
      toast({ title: 'Creation Failed', description: e?.message || 'Could not create order.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <AlertDialog open={showPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>You have unsaved changes that will be lost if you leave this page.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={stayOnPage}>Stay on page</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLeave} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Leave anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column — Customer */}
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="customerName" render={({ field }) => (
                <FormItem><FormLabel>Full Name *</FormLabel><FormControl><Input {...field} placeholder="John Doe" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="customerEmail" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} placeholder="john@example.com" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="customerPhone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} placeholder="+212 600 000 000" /></FormControl><FormMessage /></FormItem>
              )} />

              {/* Shopify Store — optional with custom text option */}
              <FormItem>
                <FormLabel>Shopify Store</FormLabel>
                <div className="space-y-2">
                  {!useCustomStore ? (
                    <FormField control={form.control} name="storeId" render={({ field }) => (
                      <Select
                        onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                        value={field.value || '__none__'}
                        disabled={storesLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={storesLoading ? 'Loading…' : 'Select store or leave empty'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None / Manual</SelectItem>
                          {stores.map((s) => (
                            <SelectItem key={s.id} value={s.internalName || s.id}>
                              {s.internalName || s.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )} />
                  ) : (
                    <FormField control={form.control} name="customStoreId" render={({ field }) => (
                      <FormControl><Input {...field} placeholder="e.g. FR, IT, Manual…" /></FormControl>
                    )} />
                  )}
                  <button
                    type="button"
                    className="text-xs text-primary underline"
                    onClick={() => setUseCustomStore((v) => !v)}
                  >
                    {useCustomStore ? '← Select from list' : 'Type custom store ID'}
                  </button>
                </div>
              </FormItem>

              {/* Language */}
              <FormField control={form.control} name="language" render={({ field }) => (
                <FormItem><FormLabel>Language</FormLabel>
                  <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || null)}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {[
                        { code: 'EN', label: 'English' },
                        { code: 'ES', label: 'Spanish' },
                        { code: 'FR', label: 'French' },
                        { code: 'DE', label: 'German' },
                        { code: 'IT', label: 'Italian' },
                        { code: 'PT', label: 'Portuguese' },
                        { code: 'NL', label: 'Dutch' },
                        { code: 'AR', label: 'Arabic' },
                        { code: 'RU', label: 'Russian' },
                        { code: 'ZH', label: 'Chinese' },
                        { code: 'JA', label: 'Japanese' },
                        { code: 'PL', label: 'Polish' },
                      ].map(({ code, label }) => (
                        <SelectItem key={code} value={code}>{label} ({code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />

              {/* Payment */}
              <FormField control={form.control} name="totalPrice" render={({ field }) => (
                <FormItem><FormLabel>Total Price (€)</FormLabel><FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="depositAmount" render={({ field }) => (
                <FormItem><FormLabel>Deposit (€)</FormLabel><FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Right columns — Tour + Operational */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Tour Details</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Tour Date */}
                  <FormField control={form.control} name="tourDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tour Date *</FormLabel>
                      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                              {field.value ? format(field.value, 'dd-MM-yy') : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={(d) => { field.onChange(d); setCalendarOpen(false); }} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Tour Hour */}
                  <FormField control={form.control} name="tourHour" render={({ field }) => (
                    <FormItem><FormLabel>Tour Hour</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="07:00" /></FormControl><FormMessage /></FormItem>
                  )} />

                  {/* PAX */}
                  <FormField control={form.control} name="pax" render={({ field }) => (
                    <FormItem><FormLabel>Passengers (PAX) *</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  {/* Tour Code — select from all mappings */}
                  <FormField control={form.control} name="tourCode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tour Code</FormLabel>
                      <Select
                        value={field.value ?? '__none__'}
                        onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tour…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {tourCodeOptions.map((m) => (
                            <SelectItem key={m.tourCode!} value={m.tourCode!}>
                              {m.tourCode} {m.productTitle ? `— ${m.productTitle}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Tour Type */}
                  <FormField control={form.control} name="tourType" render={({ field }) => (
                    <FormItem><FormLabel>Tour Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Shared">Shared</SelectItem>
                          <SelectItem value="Private">Private</SelectItem>
                        </SelectContent>
                      </Select>
                    <FormMessage /></FormItem>
                  )} />

                  {/* Stops */}
                  <FormField control={form.control} name="stops" render={({ field }) => (
                    <FormItem><FormLabel>Stops / Pickup Point</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="e.g. Jemaa el-Fna" /></FormControl><FormMessage /></FormItem>
                  )} />

                  {/* Camp Type — optional */}
                  <FormField control={form.control} name="campType" render={({ field }) => (
                    <FormItem><FormLabel>Camp Type</FormLabel>
                      <Select
                        value={field.value ?? '__none__'}
                        onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                      >
                        <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          <SelectItem value="Comfort">Comfort</SelectItem>
                          <SelectItem value="Luxury">Luxury</SelectItem>
                          <SelectItem value="Luxury A/C">Luxury A/C</SelectItem>
                        </SelectContent>
                      </Select>
                    <FormMessage /></FormItem>
                  )} />

                  {/* Room Type — optional */}
                  <FormField control={form.control} name="roomType" render={({ field }) => (
                    <FormItem><FormLabel>Room Type</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="e.g. 1xDouble (optional)" /></FormControl><FormMessage /></FormItem>
                  )} />

                  {/* Hotel Name */}
                  <FormField control={form.control} name="accommodationName" render={({ field }) => (
                    <FormItem><FormLabel>Hotel / Camp Name</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                  )} />

                  {/* Pickup Location */}
                  <div className="md:col-span-2">
                    <FormField control={form.control} name="pickupLocation" render={({ field }) => (
                      <FormItem><FormLabel>Pickup Location</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Operational Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="transportCode" render={({ field }) => (
                  <FormItem><FormLabel>Transport</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value ?? ''}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select transport…" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {transportTypes.map((t) => <SelectItem key={t.code} value={t.code}>{t.name || t.code}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="note" render={({ field }) => (
                  <FormItem><FormLabel>Operational Note</FormLabel><FormControl><Textarea placeholder="Operational notes…" className="min-h-[80px]" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="comment" render={({ field }) => (
                  <FormItem><FormLabel>Internal Comment</FormLabel><FormControl><Textarea placeholder="Internal comments…" className="min-h-[80px]" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => guard(() => router.back())}>Cancel</Button>
          <Button type="submit" disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Creating…' : 'Create Order'}
          </Button>
        </div>
      </form>
    </Form>
    </>
  );
}
