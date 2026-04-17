'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

import { PlusCircle, ChevronDown, Download, Clock, Users, MapPin, Calendar as CalendarIcon, Search, AlertCircle, TrendingUp, ChevronUp } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

import type { Order, ShopifyStore, TransportType, OrderStatus, TourType } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

import { Checkbox } from '@/components/ui/checkbox';
import type { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { BulkActionsBar } from '@/components/orders/BulkActionsBar';
import { useIsMobile } from '@/hooks/use-mobile';
import CustomerCell from '@/components/orders/CustomerCell';
import { cn } from '@/lib/utils';
import { useOrders, useShopifyStores, useTransportTypes } from '@/lib/hooks';
import api from '@/lib/api-client';
import { useAuthContext } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import TourCell from '@/components/orders/TourCell';
import { useMountedRef } from '@/hooks/use-mounted-ref';
import { Badge } from '@/components/ui/badge';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Loader2 } from 'lucide-react';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

function toISODateOnly(d?: Date) {
  if (!d) return undefined;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Mobile Order Card
const OrderCard = ({ order, allOrders }: { order: Order, allOrders: Order[] }) => {
    const router = useRouter();

    const getStatusColor = (status?: Order['status']) => {
        switch (status) {
            case 'New': return 'bg-primary/10 text-primary border-primary/20';
            case 'Updated': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/50';
            case 'Validate': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-200 dark:border-purple-800/50';
            case 'Completed': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-800/50';
            case 'Canceled': return 'bg-destructive/10 text-destructive border-destructive/20';
            default: return 'bg-muted text-muted-foreground border-border';
        }
    };
    
    const getTourTypeColor = (type?: Order['tourType']) => {
        return type === 'Private'
        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-200 dark:border-purple-800/50'
        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50';
    };

    const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-radix-popover-trigger]') || target.closest('a, button')) {
            return;
        }
        router.push(`/orders/${order.id}`);
    };

    return (
        <Card className="hover:bg-muted/50 cursor-pointer" onClick={handleCardClick}>
            <CardHeader className="flex-row items-start justify-between gap-4 pb-3">
                <div className="flex-1 space-y-1.5">
                    <CardTitle className="text-base font-semibold leading-none">
                        <CustomerCell order={order} allOrders={allOrders} />
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                        {order.tourType && <Badge variant="outline" className={cn("text-xs", getTourTypeColor(order.tourType))}>{order.tourType}</Badge>}
                        <TourCell order={order} />
                    </div>
                </div>
                 <div className="flex items-center gap-2 flex-wrap justify-end">
                    {order.status && <Badge variant="outline" className={cn("text-xs", getStatusColor(order.status))}>{order.status}</Badge>}
                </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-sm">
                <div className="space-y-2 text-muted-foreground">
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-1">
                        {order.tourDate && <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" /><span className="font-medium text-foreground">{format(new Date(order.tourDate), "dd-MM-yy")}</span></div>}
                        {order.tourHour && <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><span className="font-medium text-foreground">{order.tourHour}</span></div>}
                        <div className="flex items-center gap-2"><Users className="h-4 w-4" /><span className="font-medium text-foreground">{order.pax} pax</span></div>
                    </div>
                    {order.pickupLocation && (
                        <div className="flex items-start gap-2 pt-1">
                            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{order.pickupLocation}</span>
                        </div>
                    )}
                </div>

                {(order.campType || order.roomType || order.transport) && <Separator className="my-3" />}

                {(order.campType || order.roomType || order.transport) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {order.campType && <p>Camp: <span className="font-medium">{order.campType}</span></p>}
                        {order.roomType && <p>Room: <span className="font-medium">{order.roomType}</span></p>}
                        {order.transport && <p>Transport: <span className="font-medium">{order.transport}</span></p>}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


export default function OrdersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user: currentUser } = useAuthContext();
  const canCreateOrder = currentUser?.role === 'Owner' || currentUser?.role === 'Admin';
  const [mounted, setMounted] = React.useState(false);
  const [statsCollapsed, setStatsCollapsed] = useLocalStorage('orders-stats-collapsed', false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // server pagination
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = useLocalStorage('orders-page-size', 25);

  // filters — seed from URL params on first mount
  const [statusTab, setStatusTab] = React.useState<string>(
    () => searchParams?.get('status') || 'all'
  );
  const [search, setSearch] = React.useState(
    () => searchParams?.get('search') || ''
  );

  const [filters, setFilters] = React.useState({
    dateRange: undefined as DateRange | undefined,
    storeId: 'all',
    tourType: 'all',
    transport: 'all',
  });

  const {
    orders,
    total,
    totalPages,
    loading: isLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useOrders({
    page,
    pageSize,
    storeId: filters.storeId === 'all' ? undefined : filters.storeId,
    status: statusTab === 'all' ? undefined : statusTab as OrderStatus,
    tourType: filters.tourType === 'all' ? undefined : filters.tourType as TourType,
    transport: filters.transport === 'all' ? undefined : filters.transport,
    startDate: toISODateOnly(filters.dateRange?.from),
    endDate: toISODateOnly(filters.dateRange?.to),
    search: search.trim() || undefined,
  });

  const { stores: shopifyStores, error: storesError } = useShopifyStores();
  const { transportTypes: allTransportTypes, error: transportsError } = useTransportTypes(false);

  // KPI stats (independent from current filter state)
  const today = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
  const next7 = React.useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }, []);
  const { total: todayTotal, orders: todayOrders, loading: todayLoading } = useOrders({ startDate: today, endDate: today, pageSize: 200 });
  const { total: newTotal, loading: newLoading } = useOrders({ status: 'New' as OrderStatus, pageSize: 1 });
  const { total: upcomingTotal, loading: upcomingLoading } = useOrders({ startDate: today, endDate: next7, pageSize: 1 });
  const todayPax = React.useMemo(() => todayOrders.reduce((s, o) => s + (o.pax || 0), 0), [todayOrders]);

  // Filter active for dropdowns
  const activeTransportTypes = React.useMemo(
    () => (allTransportTypes || []).filter(t => t.isActive),
    [allTransportTypes]
  );

  React.useEffect(() => {
    if (ordersError) toast({ title: 'Failed to load orders', description: ordersError, variant: 'destructive' });
  }, [ordersError, toast]);
  React.useEffect(() => {
    if (storesError) toast({ title: 'Failed to load stores', description: storesError, variant: 'destructive' });
  }, [storesError, toast]);
  React.useEffect(() => {
    if (transportsError) toast({ title: 'Failed to load transport types', description: transportsError, variant: 'destructive' });
  }, [transportsError, toast]);


  // table state
  const [sorting, setSorting] = React.useState<SortingState>([
    // { id: 'shopifyOrderNumber', desc: true },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useLocalStorage<VisibilityState>('orders-column-visibility', {});
  const [rowSelection, setRowSelection] = React.useState({});

  // helper: patch an order
  const patchOrder = React.useCallback(
    async (orderId: string, patch: Partial<Order>, successMsg: string) => {
      try {
        await api.orders.update(orderId, patch as any);
        toast({ title: 'Saved', description: successMsg });
        refetchOrders();
      } catch (e: any) {
        toast({
          title: 'Update failed',
          description: e.message || 'Could not save changes.',
          variant: 'destructive',
        });
      }
    },
    [refetchOrders, toast],
  );

  const handleExport = (format: 'csv' | 'pdf') => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const rowsToExport = selectedRows.length > 0
      ? selectedRows.map((r) => r.original)
      : (orders ?? []);

    if (!rowsToExport.length) {
      toast({ title: 'Nothing to export', description: 'No orders to export.' });
      return;
    }

    if (format === 'csv') {
      const headers = [
        'Order #', 'Status', 'Customer', 'Email', 'Phone',
        'Tour Type', 'Transport', 'Arrival Date', 'Departure Date',
        'Pax', 'Total', 'Deposit', 'Balance', 'Store', 'Created At',
      ];
      const rows = rowsToExport.map((o: any) => [
        o.shopifyOrderNumber ?? '',
        o.status ?? '',
        o.customerName ?? '',
        o.customerEmail ?? '',
        o.customerPhone ?? '',
        o.tourType ?? '',
        o.transport ?? '',
        o.arrivalDate ?? '',
        o.departureDate ?? '',
        o.pax ?? '',
        o.totalPrice ?? '',
        o.depositAmount ?? '',
        o.balanceAmount ?? '',
        o.storeId ?? '',
        o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '',
      ]);

      const csvContent = [headers, ...rows]
        .map((row) =>
          row.map((cell: any) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','),
        )
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: `${rowsToExport.length} order(s) exported as CSV.`,
      });
    } else {
      // PDF — build a print-ready HTML page and open in new window
      const printRows = rowsToExport.map((o: any) => `
        <tr>
          <td>${o.shopifyOrderNumber ?? ''}</td>
          <td>${o.customerName ?? ''}</td>
          <td>${o.customerEmail ?? ''}</td>
          <td>${o.tourCode ?? ''}</td>
          <td>${o.tourDate ? new Date(o.tourDate).toLocaleDateString('en-GB') : ''}</td>
          <td>${o.pax ?? ''}</td>
          <td>${o.status ?? ''}</td>
          <td>${o.tourType ?? ''}</td>
          <td>${o.transport ?? ''}</td>
          <td style="text-align:right">${o.lineItemPrice ? Number(o.lineItemPrice).toFixed(2) + ' €' : ''}</td>
        </tr>`).join('');

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Orders Export — ${new Date().toLocaleDateString('en-GB')}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 20px; }
    h1 { font-size: 16px; margin-bottom: 4px; }
    p { font-size: 11px; color: #666; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f3f4f6; text-align: left; padding: 6px 8px; border: 1px solid #e5e7eb; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 5px 8px; border: 1px solid #e5e7eb; vertical-align: top; }
    tr:nth-child(even) td { background: #f9fafb; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>Joy Morocco — Orders</h1>
  <p>Exported ${new Date().toLocaleString('en-GB')} · ${rowsToExport.length} order(s)</p>
  <table>
    <thead>
      <tr>
        <th>Order #</th><th>Customer</th><th>Email</th><th>Tour</th>
        <th>Tour Date</th><th>PAX</th><th>Status</th><th>Type</th>
        <th>Transport</th><th>Amount</th>
      </tr>
    </thead>
    <tbody>${printRows}</tbody>
  </table>
</body>
</html>`;

      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 500);
      }

      toast({ title: 'PDF Ready', description: `Print dialog opened for ${rowsToExport.length} order(s).` });
    }
  };

  // statuses WITHOUT New/Updated (backend auto)
  const selectableStatuses: Order['status'][] = ['Validate', 'Completed', 'Canceled'];

  const statusConfig: Record<Order['status'], string> = {
    New: 'bg-blue-500',
    Updated: 'bg-yellow-500',
    Validate: 'bg-purple-500',
    Completed: 'bg-green-500',
    'Canceled': 'bg-red-500',
  };

  const columns: ColumnDef<Order>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'shopifyOrderNumber',
      header: 'Order',
      cell: ({ row }) => {
        const order = row.original as any;
        return (
          <div>
            <div className="font-medium">{order.shopifyOrderNumber}</div>
            <div className="text-xs text-muted-foreground hidden md:block">{order.storeId}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'customerName',
      header: 'Customer',
      cell: ({ row }) => <CustomerCell order={row.original as any} allOrders={orders} />,
    },
    {
      accessorKey: 'tourDate',
      header: 'Tour Date',
      cell: ({ row }) => {
        const tourDate = (row.original as any).tourDate;
        if (!tourDate) return <span className="text-muted-foreground">N/A</span>;
        return format(new Date(tourDate), 'dd-MM-yy');
      },
    },
    {
      accessorKey: 'tourCode',
      header: 'Tour',
      cell: ({ row }) => {
          return (
              <div>
                  <TourCell order={row.original as any} />
                  <div className="text-xs text-muted-foreground mt-1">{row.original.pax} PAX</div>
              </div>
          )
      }
    },
    
    // status: show chip always, but select only for allowed statuses
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const order = row.original as any;
        const current = order.status as Order['status'];

        const chip = (
          <div className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full', statusConfig[current])} />
            <span>{current}</span>
          </div>
        );

        // If backend auto-set New/Updated, user shouldn't change from dropdown there.
        // We still allow from any status -> Validate/Completed/Refund/Canceled.
        return (
          <Select
            value={selectableStatuses.includes(current) ? current : undefined}
            onValueChange={(value: Order['status']) => {
              patchOrder(order.id, { status: value }, `Order ${order.shopifyOrderNumber} status set to ${value}.`);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={<>{chip}</>} />
            </SelectTrigger>
            <SelectContent>
              {selectableStatuses.map((s) => (
                <SelectItem key={s} value={s}>
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', statusConfig[s])} />
                    <span>{s}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    },

    // transport: show code, dropdown shows active only
    {
      accessorKey: 'transport',
      header: 'Transport',
      cell: ({ row }) => {
        const order = row.original as any;
        
        // Find if transport is inactive
        const currentTransport = allTransportTypes?.find(t => t.code === order.transport);
        const isInactive = currentTransport && !currentTransport.isActive;

        return (
          <Select
            value={order.transport ?? ''}
            onValueChange={(v) => {
              patchOrder(
                order.id,
                { transport: v === 'none' ? null : v },
                `Transport updated for ${order.shopifyOrderNumber}.`
              );
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select...">
                {order.transport ? (
                  <span className={isInactive ? 'text-muted-foreground' : ''}>
                    {order.transport}
                  </span>
                ) : (
                  'None'
                )}
              </SelectValue>
            </SelectTrigger>

            <SelectContent>
              {/* Only active transports */}
              {activeTransportTypes.map((t) => (
                <SelectItem key={t.id} value={t.code}>
                  {t.code}
                </SelectItem>
              ))}
              <SelectItem value="none">No Transport</SelectItem>
            </SelectContent>
          </Select>
        );
      },
    },
    {
      accessorKey: 'lineItemPrice',
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => {
        const order = row.original as any;
        const subtotal = Number(order.lineItemPrice ?? 0);
        const deposit = Number(order.depositAmount ?? 0);
        const balance = subtotal - deposit;

        return (
          <div className="text-right">
            <div className="font-medium">{formatCurrency(subtotal)}</div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(deposit)} /{' '}
              <span className="text-orange-600">{formatCurrency(balance)}</span>
            </div>
          </div>
        );
      },
    },
     {
        accessorKey: 'createdAt',
        header: 'Created At',
        cell: ({ row }) => {
            const date = (row.original as any).createdAt;
            if (!date) return 'N/A';
            return format(new Date(date), 'dd-MM-yy HH:mm');
        }
    },
     {
        accessorKey: 'shopifyCreatedAt',
        header: 'Created (Shopify)',
        cell: ({ row }) => {
            const date = (row.original as any).shopifyCreatedAt;
            if (!date) return 'N/A';
            return format(new Date(date), 'dd-MM-yy HH:mm');
        }
    },
  ];

  const table = useReactTable({
    data: orders,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,

    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),

    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,

    state: { sorting, columnFilters, columnVisibility, rowSelection },
    
    initialState: {
        columnVisibility: {
            createdAt: false,
            shopifyCreatedAt: false,
        }
    },
  });

  // responsive columns
  React.useEffect(() => {
    // Only run this logic on initial mount
    if (Object.keys(columnVisibility).length > 0) return;

    const initialVisibility = {
      tourCode: !isMobile,
      transport: !isMobile,
      lineItemPrice: !isMobile,
      createdAt: false,
      shopifyCreatedAt: false,
    };
    table.setColumnVisibility(initialVisibility);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);


  const NON_NAVIGATING_COLUMNS = ['select', 'transport', 'customerName', 'status', 'tourCode'];

  const renderDesktopSkeleton = () => {
    const visibleColumnCount = table.getVisibleLeafColumns().length;
    return [...Array(10)].map((_, i) => (
      <TableRow key={i}>
        {[...Array(visibleColumnCount)].map((_, j) => (
          <TableCell key={j}>
            <Skeleton className="h-6 w-full" />
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  const renderMobileSkeleton = () => {
     return [...Array(5)].map((_, i) => (
        <Card key={i}>
            <CardHeader className="flex-row items-start justify-between gap-4 pb-2">
                <Skeleton className="h-6 w-3/4" />
                <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-1/2" />
            </CardContent>
        </Card>
    ));
  }

  // Column labels + hide internal ids
  const columnLabel: Record<string, string> = {
    shopifyOrderNumber: 'Order',
    customerName: 'Customer',
    tourDate: 'Tour Date',
    tourCode: 'Tour',
    status: 'Status',
    transport: 'Transport',
    lineItemPrice: 'Amount',
    createdAt: 'Created At',
    shopifyCreatedAt: 'Created (Shopify)',
  };

    // ⭐ ADD THIS - Don't render until component is mounted
  if (!mounted) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="all" value={statusTab} onValueChange={(value) => { setStatusTab(value); setPage(1); }}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Orders</CardTitle>
              <CardDescription>Newest Shopify orders appear first.</CardDescription>
            </div>
            <button
              type="button"
              onClick={() => setStatsCollapsed((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border rounded-md px-2.5 py-1.5"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              {statsCollapsed ? 'Show Stats' : 'Hide Stats'}
              <ChevronUp className={cn('h-3.5 w-3.5 transition-transform', statsCollapsed && 'rotate-180')} />
            </button>
          </div>

          {(() => {
            const kpis = [
              {
                label: "Today's Tours",
                value: todayLoading ? null : todayTotal,
                sub: todayLoading ? null : `${todayPax} pax`,
                icon: CalendarIcon,
                color: 'text-blue-600 bg-blue-50',
                href: `/orders?startDate=${today}&endDate=${today}`,
              },
              {
                label: 'New Orders',
                value: newLoading ? null : newTotal,
                sub: newLoading ? null : (newTotal > 0 ? 'Need attention' : 'All clear'),
                icon: AlertCircle,
                color: (newTotal ?? 0) > 0 ? 'text-amber-600 bg-amber-50' : 'text-green-600 bg-green-50',
                href: '/orders?status=New',
              },
              {
                label: 'Next 7 Days',
                value: upcomingLoading ? null : upcomingTotal,
                sub: upcomingLoading ? null : 'Upcoming tours',
                icon: TrendingUp,
                color: 'text-purple-600 bg-purple-50',
                href: `/orders?startDate=${today}&endDate=${next7}`,
              },
              {
                label: 'Total Orders',
                value: isLoading ? null : total,
                sub: 'Current filter',
                icon: Users,
                color: 'text-gray-600 bg-gray-50',
              },
            ];

            if (statsCollapsed) {
              return (
                <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2">
                  {kpis.map((kpi) => {
                    const content = (
                      <span key={kpi.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {kpi.value === null ? '…' : kpi.value}
                        </span>
                        {kpi.label}
                      </span>
                    );
                    return kpi.href ? (
                      <a key={kpi.label} href={kpi.href} className="hover:underline" onClick={(e) => { e.preventDefault(); router.push(kpi.href!); }}>
                        {content}
                      </a>
                    ) : content;
                  })}
                </div>
              );
            }

            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                {kpis.map((kpi) => {
                  const Icon = kpi.icon;
                  const inner = (
                    <div className={cn('rounded-lg border p-3 flex items-center gap-3 transition-shadow', kpi.href && 'cursor-pointer hover:shadow-sm')}>
                      <div className={cn('rounded-full p-2 shrink-0', kpi.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
                        {kpi.value === null
                          ? <Skeleton className="h-6 w-12 mt-0.5" />
                          : <p className="text-xl font-bold leading-tight">{kpi.value}</p>
                        }
                        {kpi.sub && kpi.value !== null && (
                          <p className="text-xs text-muted-foreground">{kpi.sub}</p>
                        )}
                      </div>
                    </div>
                  );
                  return kpi.href
                    ? <a key={kpi.label} href={kpi.href} onClick={(e) => { e.preventDefault(); router.push(kpi.href!); }}>{inner}</a>
                    : <div key={kpi.label}>{inner}</div>;
                })}
              </div>
            );
          })()}
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="New">New</TabsTrigger>
                  <TabsTrigger value="Updated">Updated</TabsTrigger>
                  <TabsTrigger value="Validate">Validate</TabsTrigger>
                  <TabsTrigger value="Completed">Completed</TabsTrigger>
                  <TabsTrigger value="Canceled">Canceled</TabsTrigger>
              </TabsList>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 mb-4">
                <div className="relative col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Search by customer, email, order..."
                        value={search}
                        onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                        }}
                        className="pl-10"
                    />
                </div>

                <DatePickerWithRange
                    date={filters.dateRange}
                    onDateChange={(range) => {
                        setFilters({ ...filters, dateRange: range });
                        setPage(1);
                    }}
                />
                
                <Select value={filters.tourType} onValueChange={(value) => { setFilters({ ...filters, tourType: value }); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Tour Type" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Shared">Shared</SelectItem>
                    <SelectItem value="Private">Private</SelectItem>
                </SelectContent>
                </Select>

                <Select value={filters.transport} onValueChange={(value) => { setFilters({ ...filters, transport: value }); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Transport" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Transport</SelectItem>
                    {activeTransportTypes.map((t) => ( <SelectItem key={t.id} value={t.code}>{t.code}</SelectItem> ))}
                </SelectContent>
                </Select>
                
                <Select value={filters.storeId} onValueChange={(value) => { setFilters({ ...filters, storeId: value }); setPage(1); }}>
                <SelectTrigger className="xl:col-start-4"><SelectValue placeholder="All Stores" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Stores</SelectItem>
                    {(shopifyStores || []).map((store) => ( <SelectItem key={store.id} value={(store as any).internalName}>{(store as any).internalName}</SelectItem> ))}
                </SelectContent>
                </Select>
            </div>


          <TabsContent value={statusTab}>
            {isMobile ? (
                <div className="space-y-4">
                    {isLoading ? renderMobileSkeleton() : orders.map(order => (
                        <OrderCard key={order.id} order={order} allOrders={orders} />
                    ))}
                    {(!isLoading && orders.length === 0) && (
                        <div className="text-center text-muted-foreground py-12">No results.</div>
                    )}
                </div>
            ) : (
                <>
                    <div className="flex items-center pb-4 gap-2">
                        <div className="ml-auto flex items-center gap-2">
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                Columns <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Show / hide columns</DropdownMenuLabel>

                                {table
                                .getAllColumns()
                                .filter((c) => c.getCanHide())
                                .map((column) => (
                                    <DropdownMenuCheckboxItem
                                    key={column.id}
                                    checked={column.getIsVisible()}
                                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                    >
                                    {columnLabel[column.id] || column.id}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-10 gap-1"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                    Export
                                    </span>
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleExport('csv')}>
                                    Export as CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                                    Export as PDF
                                </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {canCreateOrder && (
                            <Button size="sm" className="h-10 gap-1" onClick={() => router.push('/orders/new')}>
                              <PlusCircle className="h-3.5 w-3.5" />
                              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Add Order</span>
                            </Button>
                            )}
                        </div>
                    </div>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                                </TableRow>
                            ))}
                            </TableHeader>

                            <TableBody>
                            {isLoading ? (
                                renderDesktopSkeleton()
                            ) : table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                                    {row.getVisibleCells().map((cell) => (
                                    <TableCell
                                        key={cell.id}
                                        onClick={(e) => {
                                        if (NON_NAVIGATING_COLUMNS.includes(cell.column.id)) {
                                            e.stopPropagation();
                                            return;
                                        }
                                        router.push(`/orders/${(row.original as any).id}`);
                                        }}
                                        className={NON_NAVIGATING_COLUMNS.includes(cell.column.id) ? '' : 'cursor-pointer'}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                    ))}
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No results.
                                </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}

            {/* pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
              <div className="text-sm text-muted-foreground">
                Page {page} / {totalPages} • {total} orders
                {!isMobile && ` • ${table.getFilteredSelectedRowModel().rows.length} selected`}
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    const newPageSize = Number(v);
                    const newPage = Math.floor(((page - 1) * pageSize) / newPageSize) + 1;
                    setPage(newPage);
                    setPageSize(newPageSize);
                  }}
                >
                  <SelectTrigger className="w-[120px] hidden sm:flex">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} / page
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page <= 1} className="hidden sm:flex">
                  First
                </Button>

                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  Previous
                </Button>

                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  Next
                </Button>

                <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={page >= totalPages} className="hidden sm:flex">
                  Last
                </Button>
              </div>
            </div>

            <BulkActionsBar
              selectedCount={table.getFilteredSelectedRowModel().rows.length}
              onClearSelection={() => table.resetRowSelection()}
              onBulkUpdate={async (field, value) => {
                const selectedRows = table.getFilteredSelectedRowModel().rows;
                if (!selectedRows.length) return;
                try {
                  await Promise.all(
                    selectedRows.map((row) =>
                      api.orders.update(row.original.id, { [field]: value } as any),
                    ),
                  );
                  toast({
                    title: 'Bulk Update Complete',
                    description: `Updated ${field} for ${selectedRows.length} order(s).`,
                  });
                  table.resetRowSelection();
                  refetchOrders();
                } catch {
                  toast({
                    variant: 'destructive',
                    title: 'Bulk Update Failed',
                    description: 'Some orders could not be updated. Please try again.',
                  });
                }
              }}
              transportTypes={activeTransportTypes}
            />
          </TabsContent>
        </CardContent>
      </Card>
    </Tabs>
  );
}
