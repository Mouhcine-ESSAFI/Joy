'use client';
import AppLayout from "@/components/layout/AppLayout";
import { ArrowUpRight, CalendarDays, Users, AlertCircle, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { format } from "date-fns";
import type { Order } from "@/lib/types";
import { useOrders } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

const formatCurrency = (amount: string | number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(amount));

const getStatusClass = (status?: Order['status']) => {
  switch (status) {
    case 'New': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Updated': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Validate': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
    case 'Canceled': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

export default function DashboardPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const next7 = format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

  // KPI: Today's tours + PAX
  const { orders: todayOrders, total: todayTotal, loading: todayLoading } = useOrders({
    startDate: today,
    endDate: today,
    pageSize: 200,
  });

  // KPI: New orders (need attention)
  const { total: newOrdersTotal, loading: newLoading } = useOrders({
    status: 'New',
    pageSize: 1,
  });

  // KPI: Upcoming tours next 7 days
  const { total: upcomingTotal, loading: upcomingLoading } = useOrders({
    startDate: today,
    endDate: next7,
    pageSize: 1,
  });

  // Recent orders table + all-time total
  const { orders: recentOrders, total: allTotal, loading: recentLoading } = useOrders({
    pageSize: 5,
    sortBy: 'shopifyCreatedAt',
    sortOrder: 'DESC',
  });

  const todayPax = useMemo(
    () => todayOrders.reduce((sum, o) => sum + (o.pax || 0), 0),
    [todayOrders],
  );

  const kpis = [
    {
      title: "Today's Tours",
      value: todayLoading ? null : todayTotal,
      sub: todayLoading ? null : `${todayPax} passengers`,
      icon: CalendarDays,
      iconClass: 'text-blue-600',
      bgClass: 'bg-blue-50',
      href: `/orders?startDate=${today}&endDate=${today}`,
    },
    {
      title: 'New Orders',
      value: newLoading ? null : newOrdersTotal,
      sub: newLoading ? null : newOrdersTotal > 0 ? 'Need attention' : 'All up to date',
      icon: AlertCircle,
      iconClass: newOrdersTotal > 0 ? 'text-amber-600' : 'text-green-600',
      bgClass: newOrdersTotal > 0 ? 'bg-amber-50' : 'bg-green-50',
      href: '/orders?status=New',
    },
    {
      title: 'Upcoming (7 days)',
      value: upcomingLoading ? null : upcomingTotal,
      sub: upcomingLoading ? null : 'Tours scheduled',
      icon: TrendingUp,
      iconClass: 'text-purple-600',
      bgClass: 'bg-purple-50',
      href: `/orders?startDate=${today}&endDate=${next7}`,
    },
    {
      title: 'Total Bookings',
      value: recentLoading ? null : allTotal,
      sub: recentLoading ? null : 'All time',
      icon: Users,
      iconClass: 'text-gray-600',
      bgClass: 'bg-gray-50',
      href: '/orders',
    },
  ];

  return (
    <AppLayout>
      <div className="grid gap-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Link key={kpi.title} href={kpi.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {kpi.title}
                    </CardTitle>
                    <div className={cn('rounded-full p-2', kpi.bgClass)}>
                      <Icon className={cn('h-4 w-4', kpi.iconClass)} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {kpi.value === null ? (
                      <>
                        <Skeleton className="h-8 w-16 mb-1" />
                        <Skeleton className="h-4 w-24" />
                      </>
                    ) : (
                      <>
                        <div className="text-3xl font-bold">{kpi.value}</div>
                        <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-1">
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest bookings from your Shopify stores.</CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/orders">
                View All
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden sm:table-cell">Tour</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLoading
                  ? [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  : (recentOrders || []).length === 0
                  ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No orders yet. They will appear once synced from Shopify.
                        </TableCell>
                      </TableRow>
                    )
                  : (recentOrders || []).map((order) => (
                      <TableRow
                        key={order.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => window.location.href = `/orders/${order.id}`}
                      >
                        <TableCell>
                          <div className="font-medium">{order.customerName}</div>
                          <div className="hidden text-xs text-muted-foreground md:block">
                            {order.customerEmail}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline">{order.tourCode || '—'}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {order.tourDate ? format(new Date(order.tourDate), 'dd MMM yyyy') : '—'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {order.status && (
                            <Badge variant="outline" className={cn('text-xs', getStatusClass(order.status))}>
                              {order.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(order.lineItemPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
