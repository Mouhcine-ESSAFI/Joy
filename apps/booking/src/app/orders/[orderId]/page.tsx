'use client';

import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Save, CalendarIcon, CreditCard, Trash2, Printer } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { useOrder, useOrders, useSupplements, useTransportTypes, useRoomTypeRules, useOrderHistory } from '@/lib/hooks';
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
import { Switch } from '@/components/ui/switch';

const DRIVER_FIELD_LABELS: Record<string, string> = {
  tourDate: 'Tour Date', tourHour: 'Tour Hour', pax: 'Passengers',
  campType: 'Camp Type', roomType: 'Room Type', pickupLocation: 'Pickup Location',
  accommodationName: 'Host Name', note: 'Note',
};

function DriverHistoryTab({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const { history, loading } = useOrderHistory(orderId);
  const confirmations = history.filter((h) => h.type === 'driver_confirmed');

  function exportCsv() {
    const rows: string[][] = [['Date', 'Type', 'Field', 'Old Value', 'New Value']];
    confirmations.forEach((h) => {
      const meta = (h as any).metadata ?? {};
      const isNewAssignment = meta.confirmedType === 'new_assignment';
      const changes: any[] = (meta.confirmedChanges ?? []).filter((c: any) => c.field !== '_assignment');
      const dateStr = format(new Date(h.createdAt), 'dd/MM/yyyy HH:mm');

      if (isNewAssignment) {
        rows.push([dateStr, 'New Assignment', '—', '—', meta.transport ?? '—']);
      } else if (changes.length === 0) {
        rows.push([dateStr, 'Update Confirmed', '—', '—', '—']);
      } else {
        changes.forEach((c: any) => {
          rows.push([dateStr, 'Update Confirmed', DRIVER_FIELD_LABELS[c.field] ?? c.field, c.oldValue ?? '', c.newValue ?? '']);
        });
      }
    });
    const bom = '﻿';
    const csv = bom + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `driver-history-${orderNumber}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <Skeleton className="h-32 w-full" />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Driver Confirmation History</CardTitle>
          <CardDescription className="mt-0.5">{confirmations.length} confirmation{confirmations.length !== 1 ? 's' : ''}</CardDescription>
        </div>
        {confirmations.length > 0 && (
          <Button size="sm" variant="outline" onClick={exportCsv}>Export CSV</Button>
        )}
      </CardHeader>
      <CardContent>
        {confirmations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No driver confirmations yet.</p>
        ) : (
          <div className="space-y-3">
            {confirmations.map((h) => {
              const meta = (h as any).metadata ?? {};
              const isNewAssignment = meta.confirmedType === 'new_assignment';
              const changes: any[] = (meta.confirmedChanges ?? []).filter((c: any) => c.field !== '_assignment');

              return (
                <div key={h.id} className={`rounded-md border p-3 space-y-2 ${isNewAssignment ? 'border-blue-200 bg-blue-50/40' : 'border-amber-200 bg-amber-50/40'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isNewAssignment ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                      {isNewAssignment ? 'New assignment received' : 'Changes confirmed'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(h.createdAt), 'dd MMM yyyy, HH:mm')}
                    </span>
                  </div>

                  {isNewAssignment ? (
                    <p className="text-sm text-blue-800">
                      Driver acknowledged receipt of tour assignment
                      {meta.transport ? <> · <span className="font-semibold">{meta.transport}</span></> : ''}.
                    </p>
                  ) : changes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Driver confirmed the tour update.</p>
                  ) : (
                    <div className="space-y-1.5 pt-1">
                      {changes.map((c: any, i: number) => (
                        <div key={i} className="text-sm grid grid-cols-[140px_1fr] gap-x-3 items-baseline">
                          <span className="font-medium text-amber-900 truncate">{DRIVER_FIELD_LABELS[c.field] ?? c.field}</span>
                          <span className="flex items-center gap-1.5 flex-wrap">
                            <span className="line-through text-muted-foreground">{c.oldValue || '—'}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-semibold">{c.newValue || '—'}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const orderSchema = z.object({
  status: z.enum(['New', 'Updated', 'Completed', 'Processed', 'Canceled']),
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerPhone: z.string().optional().nullable(),
  language: z.string().optional().nullable(),

  transportCode: z.string().optional().nullable(),
  driverName: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),

  tourDate: z.date().nullable(),
  tourHour: z.string().optional().nullable(),
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
  const { total: customerOrdersTotal } = useOrders(
    order?.customerEmail ? { search: order.customerEmail, pageSize: 1 } : undefined
  );
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
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activeTab, setActiveTab] = useLocalStorage('order-detail-tab', 'details');
  const [formInitialized, setFormInitialized] = useState(false);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      status: 'New',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      language: null,
      transportCode: null,
      driverName: '',
      note: '',
      comment: '',
      tourDate: null,
      tourHour: '',
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

  const currentStatus = form.watch('status');

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
      language: order.language ?? order.storeId ?? null,
      transportCode: order.transport ?? null,
      driverName: order.driverNotes ?? '',
      note: order.note ?? '',
      comment: order.comment ?? '',

      tourDate: order.tourDate ? new Date(order.tourDate) : null,
      tourHour: order.tourHour ?? '',
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

    const payload: Record<string, any> = {
      status: values.status,

      customerName: values.customerName,
      customerEmail: cleanString(values.customerEmail),
      customerPhone: cleanString(values.customerPhone),

      transport: normalizeTransportCode(values.transportCode),
      driverNotes: cleanString(values.driverName),
      note: cleanString(values.note),
      comment: cleanString(values.comment),
      language: cleanString(values.language),

      tourDate: values.tourDate ? format(values.tourDate, 'yyyy-MM-dd') : null,
      tourHour: cleanString(values.tourHour),
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
      router.refresh();
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

  const statuses: StatusValue[] = ['Completed', 'Canceled'];

  const statusConfig: Record<StatusValue, string> = {
    New: 'bg-primary',
    Updated: 'bg-yellow-500',
    Completed: 'bg-green-500',
    Processed: 'bg-teal-500',
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
            <Button onClick={() => router.back()} className="mt-4">
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
                  <CardHeader className="p-0">
                    {/* Row 1: back + title + actions */}
                    <div className="flex items-start gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0 mt-0.5"
                        onClick={() => router.back()}
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back</span>
                      </Button>

                      <div className="flex-1 min-w-0">
                        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                          <button
                            type="button"
                            className="hover:text-foreground transition-colors"
                            onClick={() => router.back()}
                          >
                            Orders
                          </button>
                          <span>/</span>
                          <span className="text-foreground font-medium">{order.shopifyOrderNumber} · {format(new Date(order.createdAt), "dd-MM-yy 'at' h:mm a")}</span>
                        </nav>
                        <h1 className="text-foreground font-medium tracking-tight truncate">
                          {order.customerName}
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center flex-wrap gap-x-2 gap-y-0.5">
                          {order.customerPhone && (
                            <span className="flex items-center gap-1">
                              <span>{order.customerPhone}</span>
                              <a
                                href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-green-600 hover:text-green-700"
                                title="Open in WhatsApp"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                              </a>
                            </span>
                          )}
                          {customerOrdersTotal > 0 && (
                            <span className="font-medium text-foreground">
                              {customerOrdersTotal} order{customerOrdersTotal !== 1 ? 's' : ''} · {order.storeId}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Desktop action buttons */}
                      <div className="hidden sm:flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => window.print()}
                          title="Print order"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button type="submit" disabled={isSaving || !isDirty}>
                          <Save className="mr-2 h-4 w-4" />
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </div>

                    {/* Row 2: status + financial + mobile save */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {order.financialStatus && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs shrink-0',
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
                                <SelectTrigger className="h-8 text-xs w-auto min-w-[120px]">
                                  <div className="flex items-center gap-2">
                                    <span className={cn('h-2 w-2 rounded-full shrink-0', statusConfig[field.value])} />
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

                      {/* Mobile save */}
                      <Button type="submit" size="sm" disabled={isSaving || !isDirty} className="sm:hidden ml-auto">
                        <Save className="mr-1.5 h-3.5 w-3.5" />
                        {isSaving ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              </div>

              <div className="overflow-x-auto px-4 lg:px-6">
                <div className="-mx-4 px-4 sm:mx-0 sm:px-0 border-b">
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
                    <TabsTrigger value="driver-history" className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-3 py-2 text-sm font-medium text-muted-foreground transition-none focus-visible:ring-0">
                      Driver History
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
                    <CardDescription className="flex items-center gap-2">
                      {order.tourTitle}
                      {order.tourCode && <Badge variant="outline" className="text-xs font-mono">{order.tourCode}</Badge>}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    {/* flex: left = editable fields, right = spots route (xl+) */}
                    <div className="flex flex-col xl:flex-row xl:gap-8">
                    <div className="flex-1 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="tourDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tour Date</FormLabel>
                            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
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
                                  onSelect={(d) => { field.onChange(d ?? null); setCalendarOpen(false); }}
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
                            <FormLabel>Host Name</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

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

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="transportCode"
                        render={({ field }) => {
                          const currentTransport = allTransportTypes.find((t) => t.code === field.value);
                          const isInactive = currentTransport ? !currentTransport.isActive : false;
                          const isTransportLocked = currentStatus !== 'Completed';

                          return (
                            <FormItem>
                              <FormLabel>
                                Transport
                                {isTransportLocked && (
                                  <span className="ml-2 text-xs text-muted-foreground font-normal">(requires Completed status)</span>
                                )}
                              </FormLabel>
                              <Select
                                value={field.value ?? 'none'}
                                onValueChange={(v) => field.onChange(v === 'none' ? null : v)}
                                disabled={isTransportLocked}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select transport...">
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
                    </div>{/* end flex-1 */}

                    {/* Spots route — right sidebar */}
                    {(() => {
                      function parseSpots(o: typeof order): string[] {
                        if (o?.spots) {
                          try { const p = JSON.parse(o.spots); if (Array.isArray(p)) return p.map(String).filter(Boolean); } catch {}
                          return o.spots.split(/[,\n;]/).map((s: string) => s.trim()).filter(Boolean);
                        }
                        const mf: any[] = o?.shopifyMetadata?.metafields ?? [];
                        const found = mf.find((m) => m.key?.toLowerCase() === 'spots');
                        if (found?.value && !String(found.value).startsWith('gid://')) {
                          try { const p = JSON.parse(found.value); if (Array.isArray(p)) return p.map(String).filter(Boolean); } catch {}
                          return String(found.value).split(/[,\n;]/).map((s) => s.trim()).filter(Boolean);
                        }
                        return [];
                      }
                      const spots = parseSpots(order);
                      if (spots.length === 0) return null;
                      const arrival = (order.shopifyMetadata?.metafields ?? []).find((m: any) => ['to', 'to_', 'arrival', 'destination'].includes(m.key?.toLowerCase()))?.value
                        ?? (order.lineItemProperties?.raw ?? []).find((p: any) => ['to', 'to_', 'arrival', 'destination'].includes(p.name?.toLowerCase()))?.value;
                      return (
                        <div className="xl:w-56 shrink-0 xl:border-l xl:pl-8 pt-6 xl:pt-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">Route</p>
                          <div className="relative">
                            <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />
                            {order.pickupLocation && (
                              <div className="relative flex items-start gap-3 pb-4">
                                <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1 ring-2 ring-background z-10 relative" />
                                <span className="text-sm font-medium leading-tight">{order.pickupLocation}</span>
                              </div>
                            )}
                            {spots.map((spot: string, i: number) => (
                              <div key={i} className="relative flex items-start gap-3 pb-4">
                                <div className="w-2.5 h-2.5 rounded-full border-2 border-primary bg-background shrink-0 mt-1 z-10 relative" />
                                <span className="text-sm leading-tight">{spot}</span>
                              </div>
                            ))}
                            {arrival && (
                              <div className="relative flex items-start gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0 mt-1 ring-2 ring-background z-10 relative" />
                                <span className="text-sm font-medium leading-tight text-green-700">{arrival}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    </div>{/* end flex wrapper */}

                    {/* Shopify Product Data */}
                    {(() => {
                      const metafields: any[] = order.shopifyMetadata?.metafields ?? [];
                      const properties: any[] = order.lineItemProperties?.raw ?? [];
                      if (metafields.length === 0 && properties.length === 0) return null;
                      return (
                        <>
                          <Separator />
                          <div className="space-y-3">
                            <p className="text-sm font-medium text-muted-foreground">Shopify Product Data</p>
                            {metafields.length > 0 && (
                              <div className="rounded-md border divide-y text-sm">
                                {metafields.map((m: any, i: number) => (
                                  <div key={i} className="flex gap-3 px-3 py-2">
                                    <span className="font-mono text-xs text-muted-foreground w-40 shrink-0 pt-0.5">{m.namespace}.{m.key}</span>
                                    <span className="break-all">{String(m.value ?? '')}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {properties.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground font-medium">Line Item Properties</p>
                                <div className="rounded-md border divide-y text-sm">
                                  {properties.map((p: any, i: number) => (
                                    <div key={i} className="flex gap-3 px-3 py-2">
                                      <span className="text-muted-foreground w-40 shrink-0">{p.name}</span>
                                      <span>{String(p.value ?? '')}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
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

                    <FormField
                      control={form.control}
                      name="language"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Language</FormLabel>
                          <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || null)}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                            </FormControl>
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
                                <SelectItem key={code} value={code}>
                                  {label} ({code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                                <TableHead className="text-center w-[80px]">Driver</TableHead>
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
                                  <TableCell className="text-center">
                                    <Switch
                                      checked={s.visibleToDriver}
                                      onCheckedChange={async (checked) => {
                                        try {
                                          await api.supplements.updateVisibility(s.id, checked);
                                          refetchSupplements();
                                        } catch (e: any) {
                                          toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
                                        }
                                      }}
                                    />
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

              <TabsContent value="driver-history">
                <DriverHistoryTab orderId={orderId} orderNumber={order.shopifyOrderNumber} />
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

              <Card>
                <CardHeader>
                  <CardTitle>Comment</CardTitle>
                  <CardDescription>Only you and other staff can see comments</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="comment"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="Add a staff comment..."
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