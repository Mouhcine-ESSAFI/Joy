'use client';

import * as React from 'react';
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  VisibilityState,
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
  Download,
  Search,
  ChevronDown,
  MoreHorizontal,
  ArrowLeft,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Mail,
  Phone,
  MapPin,
  ShoppingBag,
  Users,
} from 'lucide-react';
import type { Customer } from '@/lib/types';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomers, useShopifyStores } from '@/lib/hooks';
import { useOrdersSocket } from '@/lib/use-orders-socket';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const formatCurrency = (amount: string | number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(amount) || 0);

function getInitials(firstName?: string | null, lastName?: string | null) {
  const f = firstName?.[0] ?? '';
  const l = lastName?.[0] ?? '';
  return (f + l).toUpperCase() || '?';
}

function SortHeader({ column, label }: { column: any; label: string }) {
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      {label}
      {sorted === 'asc' ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  );
}

const CustomerCard = ({ customer, onViewOrders }: { customer: Customer; onViewOrders: (email: string) => void }) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardHeader className="pb-3">
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {getInitials(customer.firstName, customer.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="grid gap-0.5 min-w-0">
            <CardTitle className="text-base truncate">
              {customer.firstName} {customer.lastName}
            </CardTitle>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{customer.email}</span>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" className="h-8 w-8 p-0 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onViewOrders(customer.email)}>
              <ShoppingBag className="mr-2 h-4 w-4" />
              View Orders
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </CardHeader>
    <CardContent className="pt-0 space-y-2 text-sm">
      {customer.phone && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          <span>{customer.phone}</span>
        </div>
      )}
      {(customer.city || customer.country) && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>{[customer.city, customer.country].filter(Boolean).join(', ')}</span>
        </div>
      )}
      <div className="flex justify-between items-center pt-2 border-t">
        <div className="flex items-center gap-1.5">
          {customer.storeId && <Badge variant="outline" className="text-xs">{customer.storeId}</Badge>}
          <span className="text-muted-foreground text-xs">{customer.totalOrders} order(s)</span>
        </div>
        <span className="font-semibold text-sm">{formatCurrency(customer.totalSpent)}</span>
      </div>
    </CardContent>
  </Card>
);

export default function CustomersClient() {
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const [storeFilter, setStoreFilter] = React.useState<string>('all');
  const { stores } = useShopifyStores();

  const { customers, total, totalPages, loading: isLoading, error, refetch } = useCustomers({
    search: debouncedSearch || undefined,
    storeId: storeFilter === 'all' ? undefined : storeFilter,
    page,
    pageSize,
  });

  useOrdersSocket(refetch);

  React.useEffect(() => {
    if (error) toast({ title: 'Failed to load customers', description: error, variant: 'destructive' });
  }, [error, toast]);

  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    id: false,
    storeDomain: false,
    updatedAt: false,
  });

  const handleViewOrders = (email: string) =>
    router.push(`/orders?search=${encodeURIComponent(email)}`);

  const handleExport = () => {
    if (!customers.length) { toast({ title: 'Nothing to export' }); return; }
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Country', 'City', 'Total Orders', 'Total Spent', 'Store', 'Created At'];
    const rows = customers.map((c) => [
      c.firstName ?? '', c.lastName ?? '', c.email ?? '', c.phone ?? '',
      c.country ?? '', c.city ?? '', c.totalOrders, c.totalSpent,
      c.storeId ?? '', c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '',
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export Complete', description: `${customers.length} customers exported.` });
  };

  const columns: ColumnDef<Customer>[] = [
    {
      id: 'customer',
      header: ({ column }) => <SortHeader column={column} label="Customer" />,
      accessorFn: (row) => `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim(),
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                {getInitials(c.firstName, c.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0">
              <span className="font-medium truncate">{c.firstName} {c.lastName}</span>
              <span className="text-muted-foreground text-xs truncate">{c.email}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.original.phone ? (
            <a href={`tel:${row.original.phone}`} className="hover:text-foreground transition-colors">
              {row.original.phone}
            </a>
          ) : '—'}
        </span>
      ),
    },
    {
      id: 'location',
      header: ({ column }) => <SortHeader column={column} label="Location" />,
      accessorFn: (row) => [row.city, row.country].filter(Boolean).join(', '),
      cell: ({ row }) => {
        const c = row.original;
        const loc = [c.city, c.country].filter(Boolean).join(', ');
        return <span className="text-sm">{loc || '—'}</span>;
      },
    },
    {
      accessorKey: 'storeId',
      header: 'Store',
      cell: ({ row }) =>
        row.original.storeId ? (
          <Badge variant="outline" className="text-xs">{row.original.storeId}</Badge>
        ) : null,
    },
    {
      accessorKey: 'totalOrders',
      header: ({ column }) => <SortHeader column={column} label="Orders" />,
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant="secondary" className="font-mono">{row.original.totalOrders}</Badge>
        </div>
      ),
    },
    {
      accessorKey: 'totalSpent',
      header: ({ column }) => <SortHeader column={column} label="Total Spent" />,
      cell: ({ row }) => (
        <span className="font-semibold text-sm">{formatCurrency(row.original.totalSpent)}</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <SortHeader column={column} label="Added" />,
      cell: ({ row }) =>
        row.original.createdAt
          ? <span className="text-muted-foreground text-xs">{format(new Date(row.original.createdAt), 'dd MMM yy')}</span>
          : '—',
    },
    {
      accessorKey: 'updatedAt',
      header: 'Last Updated',
      cell: ({ row }) =>
        row.original.updatedAt
          ? <span className="text-muted-foreground text-xs">{format(new Date(row.original.updatedAt), 'dd MMM yy')}</span>
          : '—',
    },
    {
      accessorKey: 'id',
      header: 'Customer ID',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.id}</span>
      ),
    },
    {
      accessorKey: 'storeDomain',
      header: 'Store Domain',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">{row.original.storeDomain}</span>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleViewOrders(row.original.email)}>
              <ShoppingBag className="mr-2 h-4 w-4" />
              View Orders
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useReactTable({
    data: customers,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    manualPagination: true,
    pageCount: totalPages,
    state: { sorting, columnVisibility },
  });

  const renderSkeleton = (isMobileView: boolean) => {
    if (isMobileView) {
      return [...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ));
    }
    return [...Array(10)].map((_, i) => (
      <TableRow key={i}>
        {[...Array(table.getVisibleLeafColumns().length)].map((_, j) => (
          <TableCell key={j}><Skeleton className="h-6 w-full" /></TableCell>
        ))}
      </TableRow>
    ));
  };

  // Summary stats from current page
  const totalSpentOnPage = customers.reduce((sum, c) => sum + Number(c.totalSpent || 0), 0);
  const totalOrdersOnPage = customers.reduce((sum, c) => sum + (c.totalOrders || 0), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
            <div className="grid gap-1">
              <CardTitle>Customers</CardTitle>
              <CardDescription>
                {total > 0 ? `${total} customer(s) synced from Shopify` : 'View and manage your customer data.'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Stats bar */}
        {!isLoading && customers.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 p-3 bg-muted/40 rounded-lg border text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Total:</span>
              <span className="font-semibold">{total}</span>
            </div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Orders (page):</span>
              <span className="font-semibold">{totalOrdersOnPage}</span>
            </div>
            <div className="col-span-2 sm:col-span-1 flex items-center gap-2">
              <span className="text-muted-foreground">Spent (page):</span>
              <span className="font-semibold">{formatCurrency(totalSpentOnPage)}</span>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center pb-4 gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name, email or phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>
          {stores.length > 0 && (
            <Select value={storeFilter} onValueChange={(v) => { setStoreFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Stores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {stores.map((s) => (
                  <SelectItem key={s.id} value={s.internalName}>
                    {s.internalName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1.5">
                Columns <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {table.getAllColumns().filter((col) => col.getCanHide()).map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  className="capitalize"
                  checked={col.getIsVisible()}
                  onCheckedChange={(value) => col.toggleVisibility(!!value)}
                >
                  {col.id.replace(/([A-Z])/g, ' $1').replace('_', ' ')}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile cards / Desktop table */}
        {isMobile ? (
          <div className="space-y-3">
            {isLoading
              ? renderSkeleton(true)
              : customers.length === 0
              ? (
                <div className="text-center py-12 text-muted-foreground">
                  {debouncedSearch ? `No customers found for "${debouncedSearch}"` : 'No customers yet.'}
                </div>
              )
              : customers.map((c) => (
                  <CustomerCard key={c.id} customer={c} onViewOrders={handleViewOrders} />
                ))}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead key={header.id} className="text-xs text-muted-foreground">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  renderSkeleton(false)
                ) : table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => handleViewOrders(row.original.email)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} onClick={cell.column.id === 'actions' ? (e) => e.stopPropagation() : undefined}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                      {debouncedSearch ? `No customers found for "${debouncedSearch}"` : 'No customers yet. They will appear after orders are synced from Shopify.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            {total} customer(s) · Page {page} of {totalPages || 1}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
