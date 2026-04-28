'use client';

import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Save, CalendarIcon, CreditCard, Trash2, Printer } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { useOrder, useSupplements, useTransportTypes, useRoomTypeRules } from '@/lib/hooks';
import api from '@/lib/api-client';
import { useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import SupplementForm from './SupplementForm';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const orderSchema = z.object({
  status: z.enum(['New', 'Updated', 'Validate', 'Completed', 'Canceled']),
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerPhone: z.string().optional().nullable(),

  transportCode: z.string().optional().nullable(),
  driverName: z.string().optional().nullable(),
  note: z.string().optional().nullable(),

  tourDate: z.date().nullable(),
  tourHour: z.string().optional().nullable(),
  tourCode: z.string().optional().nullable(),
  tourType: z.enum(['Shared', 'Private']).nullable(),
  campType: z.string().optional().nullable(),
  roomType: z.string().optional().nullable(),
  accommodationName: z.string().optional().nullable(),
  pickupLocation: z.string().optional().nullable(),
  pax: z.coerce.number().int().min(1, 'At least one passenger is required'),
});

type OrderFormValues = z.infer<typeof orderSchema>;
type StatusValue = OrderFormValues['status'];

const formatCurrency = (amount: string | number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(amount || 0));

function cleanString(v: unknown) {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string') return v as any;
  const t = v.trim();
  return t.length ? t : null;
}

function normalizeTransportCode(v: unknown) {
  const t = cleanString(v);
  if (t === 'none') return null;
  return t;
}

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const orderId = typeof params?.orderId === 'string' ? params.orderId : '';
  const invalidOrderId = !orderId;

  const { order, loading: orderLoading, error: orderError } = useOrder(orderId);
  const {
    supplements = [],
    loading: supplementsLoading,
    error: supplementsError,
    refetch: refetchSupplements,
  } = useSupplements(orderId);
  const {
    transportTypes: allTransportTypes = [],
    loading: transportLoading,
    error: transportsError,
  } = useTransportTypes(false);

  const activeTransportTypes = useMemo(
    () => allTransportTypes.filter((t) => t.isActive),
    [allTransportTypes]
  );

  const { roomRules, loading: roomRulesLoading } = useRoomTypeRules();

  const [isSupplementFormOpen, setSupplementFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useLocalStorage('order-detail-tab', 'details');
  const [formInitialized, setFormInitialized] = useState(false);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      status: 'New',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      transportCode: null,
      driverName: '',
      note: '',
      tourDate: null,
      tourHour: '',
      tourCode: '',
      tourType: null,
      campType: '',
      roomType: '',
      accommodationName: '',
      pickupLocation: '',
      pax: 1,
    },
  });

  const {
    formState: { isDirty },
  } = form;

  // Derive room type options from the rule that matches current PAX
  const paxValue = form.watch('pax');
  const roomTypeOptions = useMemo(() => {
    const pax = Number(paxValue) || 1;
    const rule = roomRules.find(
      (r) => r.isActive && pax >= r.paxMin && pax <= r.paxMax,
    );
    if (!rule) return [];
    const opts = [rule.defaultRoomType, ...(rule.allowedRoomTypes || [])];
    return [...new Set(opts.filter(Boolean))];
  }, [roomRules, paxValue]);

  // Keep the skeleton until after form.reset() fires (it runs post-render via useEffect).
  // Without this, the form briefly shows empty default values before being populated.
  const isLoading = orderLoading || supplementsLoading || transportLoading || roomRulesLoading || (!!order && !formInitialized);

  useEffect(() => {
    if (!order || orderLoading || transportLoading || roomRulesLoading) return;

    form.reset({
      status: (order.status || 'New') as StatusValue,
      customerName: order.customerName ?? '',
      customerEmail: order.customerEmail ?? '',
      customerPhone: order.customerPhone ?? '',
      transportCode: order.transport ?? null,
      driverName: order.driverNotes ?? '',
      note: order.note ?? '',

      tourDate: order.tourDate ? new Date(order.tourDate) : null,
      tourHour: order.tourHour ?? '',
      tourCode: order.tourCode ?? '',
      tourType: order.tourType ? (order.tourType as 'Shared' | 'Private') : null,
      campType: order.campType ?? '',
      roomType: order.roomType ?? '',
      accommodationName: order.accommodationName ?? '',
      pickupLocation: order.pickupLocation ?? '',
      pax: Number(order.pax || 1),
    });
    setFormInitialized(true);
  }, [order, orderLoading, transportLoading, roomRulesLoading, form]);

  useEffect(() => {
    const err = orderError || supplementsError || transportsError;
    if (!err) return;
    toast({
      title: 'Load error',
      description: String(err),
      variant: 'destructive',
    });
  }, [orderError, supplementsError, transportsError, toast]);

  const totalSupplementAmount = useMemo(
    () => supplements.reduce((acc, s) => acc + Number(s.amount || 0), 0),
    [supplements]
  );

  const money = useMemo(() => {
    const lineItem = Number(order?.lineItemPrice || 0);
    const deposit = Number(order?.depositAmount || 0);
    const subtotal = lineItem + totalSupplementAmount;
    const balance = subtotal - deposit;
    return { lineItem, deposit, subtotal, balance };
  }, [order?.lineItemPrice, order?.depositAmount, totalSupplementAmount]);

  async function onSubmit(values: OrderFormValues) {
    if (!orderId) return;

    setIsSaving(true);

    const payload = {
      status: values.status,

      customerName: values.customerName,
      customerEmail: cleanString(values.customerEmail),
      customerPhone: cleanString(values.customerPhone),

      transport: normalizeTransportCode(values.transportCode),
      driverNotes: cleanString(values.driverName),
      note: cleanString(values.note),

      tourDate: values.tourDate ? format(values.tourDate, 'yyyy-MM-dd') : null,
      tourHour: cleanString(values.tourHour),
      tourCode: cleanString(values.tourCode),
      tourType: values.tourType ?? null,

      campType: cleanString(values.campType),
      roomType: cleanString(values.roomType),
      accommodationName: cleanString(values.accommodationName),
      pickupLocation: cleanString(values.pickupLocation),

      pax: Number(values.pax),
    };

    try {
      await api.orders.update(orderId, payload);
      toast({
        title: 'Order Updated',
        description: `Order ${order?.shopifyOrderNumber} saved.`,
      });
      form.reset(values);
    } catch (e: any) {
      toast({
        title: 'Update Failed',
        description: e?.message || 'Could not update order.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }

  const statuses: StatusValue[] = ['New', 'Updated', 'Validate', 'Completed', 'Canceled'];

  const statusConfig: Record<StatusValue, string> = {
    New: 'bg-primary',
    Updated: 'bg-yellow-500',
    Validate: 'bg-purple-500',
    Completed: 'bg-green-500',
    Canceled: 'bg-red-500',
  };

  if (invalidOrderId) {
    return (
      <AppLayout>
        <Card>
          <CardHeader>
            <CardTitle>Invalid Order</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No valid order ID provided.</p>
            <Button onClick={() => router.push('/orders')} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="sticky top-0 z-10 -mx-4 -mt-4 lg:-mx-6 lg:-mt-6 bg-background/95 backdrop-blur-sm border-b">
            <Skeleton className="h-[148px] w-full" />
          </div>
          <div className="py-6">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!order || orderError) {
    return (
      <AppLayout>
        <Card>
          <CardHeader>
            <CardTitle>{orderError ? 'Error' : 'Order Not Found'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{orderError || 'The requested order could not be found.'}</p>
            <Button onClick={() => router.back()} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="sticky top-0 z-10 -mx-4 -mt-4 lg:-mx-6 lg:-mt-6 bg-background/95 backdrop-blur-sm border-b">
              <div className="px-4 pt-4 lg:px-6 lg:pt-6 pb-2">
                <Card className="bg-transparent border-none shadow-none">
                  <CardHeader className="p-0 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => router.push('/orders')}
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back</span>
                      </Button>

                      <div className="grid gap-1">
                        {/* Breadcrumb */}
                        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <button
                            type="button"
                            className="hover:text-foreground transition-colors"
                            onClick={() => router.push('/orders')}
                          >
                            Orders
                          </button>
                          <span>/</span>
                          <span className="text-foreground font-medium">{order.shopifyOrderNumber}</span>
                        </nav>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                          Order {order.shopifyOrderNumber}
                        </h1>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {format(new Date(order.createdAt), "dd-MM-yy 'at' h:mm a")} from {order.storeId} Store
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center ml-auto sm:ml-0">
                      {order.financialStatus && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs',
                            order.financialStatus === 'paid' && 'bg-green-100 text-green-800',
                            order.financialStatus === 'partially_paid' && 'bg-yellow-100 text-yellow-800',
                            order.financialStatus === 'refunded' && 'bg-red-100 text-red-800'
                          )}
                        >
                          <CreditCard className="mr-1 h-3 w-3" />
                          {order.financialStatus.replace('_', ' ')}
                        </Badge>
                      )}

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="w-auto md:w-[160px] text-xs md:text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className={cn('h-2 w-2 rounded-full', statusConfig[field.value])} />
                                    <span>{field.value}</span>
                                  </div>
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {statuses.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    <div className="flex items-center gap-2">
                                      <span className={cn('h-2 w-2 rounded-full', statusConfig[s])} />
                                      <span>{s}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="hidden sm:flex"
                        onClick={() => window.print()}
                        title="Print order"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button type="submit" disabled={isSaving || !isDirty} className="hidden sm:flex">
                        <Save className="mr-2 h-4 w-4" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              </div>

              <div className="px-4 lg:px-6">
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 border-b">
                  <TabsList className="bg-transparent p-0 -mb-px h-auto">
                    <TabsTrigger value="details" className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-3 py-2 text-sm font-medium text-muted-foreground transition-none focus-visible:ring-0">
                      Tour Details
                    </TabsTrigger>
                    <TabsTrigger value="customer" className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-3 py-2 text-sm font-medium text-muted-foreground transition-none focus-visible:ring-0">
                      Customer
                    </TabsTrigger>
                    <TabsTrigger value="payment" className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-3 py-2 text-sm font-medium text-muted-foreground transition-none focus-visible:ring-0">
                      Payment &amp; Supplements
                    </TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-3 py-2 text-sm font-medium text-muted-foreground transition-none focus-visible:ring-0">
                      History
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>
            </div>

            <div className="py-6 space-y-6">
              <TabsContent value="details">
                <Card>
                  <CardHeader>
                    <CardTitle>Tour Details</CardTitle>
                    <CardDescription>{order.tourTitle}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="tourDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tour Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                                  >
                                    {field.value ? format(field.value, 'dd-MM-yy') : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value ?? undefined}
                                  onSelect={(d) => field.onChange(d ?? null)}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tourHour"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tour Hour</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="pax"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Passengers (PAX)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tourCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tour Code</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tourType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tour Type</FormLabel>
                            <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || null)}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Shared">Shared</SelectItem>
                                <SelectItem value="Private">Private</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="campType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Camp Type</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="roomType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Room Type</FormLabel>
                            <FormControl>
                              {roomTypeOptions.length > 0 ? (
                                <Select
                                  value={field.value ?? ''}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select room type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[...new Set([...(field.value ? [field.value] : []), ...roomTypeOptions])].map((opt) => (
                                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input {...field} value={field.value ?? ''} placeholder="e.g. 1xDouble" />
                              )}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="accommodationName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hotel/Camp Name</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="lg:col-span-3">
                        <FormField
                          control={form.control}
                          name="pickupLocation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pickup Location</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? ''} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="transportCode"
                        render={({ field }) => {
                          const currentTransport = allTransportTypes.find((t) => t.code === field.value);
                          const isInactive = currentTransport ? !currentTransport.isActive : false;

                          return (
                            <FormItem>
                              <FormLabel>Transport</FormLabel>
                              <Select
                                value={field.value ?? 'none'}
                                onValueChange={(v) => field.onChange(v === 'none' ? null : v)}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select transport...">
                                      {/* ⭐ FIX 5: Always show current value */}
                                      {field.value ? (
                                        <span className={isInactive ? 'text-muted-foreground' : ''}>
                                          {field.value}{isInactive ? ' ⚠️ (Inactive)' : ''}
                                        </span>
                                      ) : (
                                        'None'
                                      )}
                                    </SelectValue>
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {activeTransportTypes.map((t) => (
                                    <SelectItem key={t.code} value={t.code}>
                                      {t.code}
                                    </SelectItem>
                                  ))}

                                  {isInactive && field.value && (
                                    <SelectItem value={field.value}>
                                      {field.value} ⚠️ (Inactive)
                                    </SelectItem>
                                  )}

                                  <SelectItem value="none">None</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />

                      <FormField
                        control={form.control}
                        name="driverName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Driver Name</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="customer">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer</CardTitle>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="font-semibold" value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="customerEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="customerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payment">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment &amp; Supplements</CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2 rounded-md border bg-muted/50 p-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Line Item Price</span>
                        <span className="font-medium">{formatCurrency(money.lineItem)}</span>
                      </div>

                      {totalSupplementAmount !== 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            {totalSupplementAmount > 0 ? 'Supplements' : 'Discounts'}
                          </span>
                          <span className={cn('font-medium', totalSupplementAmount < 0 && 'text-green-600')}>
                            {totalSupplementAmount > 0 ? '+' : ''}
                            {formatCurrency(totalSupplementAmount)}
                          </span>
                        </div>
                      )}

                      <Separator className="my-2" />

                      <div className="flex justify-between font-semibold">
                        <span>Subtotal</span>
                        <span>{formatCurrency(money.subtotal)}</span>
                      </div>

                      <div className="flex justify-between text-green-600">
                        <span className="font-medium">Deposit Paid</span>
                        <span className="font-medium">-{formatCurrency(money.deposit)}</span>
                      </div>

                      <Separator className="my-2 bg-muted-foreground/20" />

                      <div
                        className={cn(
                          'flex justify-between font-semibold text-base',
                          money.balance > 0 ? 'text-orange-600' : 'text-green-600'
                        )}
                      >
                        <span>Balance {money.balance > 0 ? 'Due' : 'Credit'}</span>
                        <span>{formatCurrency(Math.abs(money.balance))}</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mt-6 mb-2">
                        <h4 className="text-sm font-medium">Supplement Details</h4>

                        <Dialog open={isSupplementFormOpen} onOpenChange={setSupplementFormOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-1">
                              <PlusCircle className="h-4 w-4" />
                              Add
                            </Button>
                          </DialogTrigger>

                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Supplement</DialogTitle>
                              <DialogDescription>Add an extra charge or discount to this order.</DialogDescription>
                            </DialogHeader>

                            <SupplementForm
                              orderId={orderId}
                              onFormSubmit={() => {
                                setSupplementFormOpen(false);
                                refetchSupplements();
                              }}
                            />
                          </DialogContent>
                        </Dialog>
                      </div>

                      {supplements.length > 0 ? (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Label</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="w-[50px]" />
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {supplements.map((s) => (
                                <TableRow key={s.id}>
                                  <TableCell className="font-medium">{s.label}</TableCell>
                                  <TableCell
                                    className={cn('text-right font-medium', Number(s.amount) < 0 && 'text-green-600')}
                                  >
                                    {formatCurrency(s.amount)}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={async () => {
                                        if (confirm(`Delete supplement "${s.label}"?`)) {
                                          try {
                                            await api.supplements.delete(s.id);
                                            toast({
                                              title: 'Supplement Deleted',
                                              description: `${s.label} has been removed.`,
                                            });
                                            refetchSupplements();
                                          } catch (e: any) {
                                            toast({
                                              variant: 'destructive',
                                              title: 'Delete Failed',
                                              description: e.message,
                                            });
                                          }
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span className="sr-only">Delete</span>
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
                          No supplements added.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <OrderTimeline orderId={orderId} />
              </TabsContent>

              <Card>
                <CardHeader>
                  <CardTitle>Operational Note</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="note"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="Add any operational notes here..."
                            className="min-h-[100px]"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="sticky bottom-0 -mx-4 -mb-6 mt-6 sm:hidden">
              <div className="bg-background/95 backdrop-blur-sm border-t p-4">
                <Button type="submit" disabled={isSaving || !isDirty} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </Tabs>
        </form>
      </Form>
    </AppLayout>
  );
}