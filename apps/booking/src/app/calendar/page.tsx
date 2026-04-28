'use client';

import type { Order } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useOrders } from '@/lib/hooks';
import AppLayout from '@/components/layout/AppLayout';
import { useRouter } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { Clock, Users, MapPin, Calendar as CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

export default function CalendarPage() {
  const { orders, loading: isLoading } = useOrders({ pageSize: 1000 }); // Fetch up to 1000 orders for calendar view
  const router = useRouter();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isTourListOpen, setTourListOpen] = useState(false);

  useEffect(() => {
    // When orders are loaded, check if there are tours today and open the list if so.
    if (!isLoading && orders.length > 0) {
      const todayFormatted = format(new Date(), 'yyyy-MM-dd');
      const todayHasTours = orders.some(o => o.tourDate === todayFormatted);
      if (todayHasTours) {
        setTimeout(() => setTourListOpen(true), 100);
      }
    }
  }, [isLoading, orders]);

  // Group orders by date
  const ordersByDate = useMemo(() => {
    if (isLoading) return {};
    return orders.reduce((acc, order) => {
      if (order.tourDate) {
        const date = order.tourDate;
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(order);
      }
      return acc;
    }, {} as Record<string, Order[]>);
  }, [orders, isLoading]);


  // Get dates that have orders (for highlighting in calendar)
  const datesWithOrders = useMemo(() => {
    return Object.keys(ordersByDate).map(dateStr => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    });
  }, [ordersByDate]);

  // Get orders for selected date
  const selectedDateOrders = useMemo(() => {
    if (!date) return [];
    const formattedDate = format(date, 'yyyy-MM-dd');
    return ordersByDate[formattedDate] || [];
  }, [date, ordersByDate]);
  
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
        setDate(undefined);
        return;
    };
    setDate(selectedDate);
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    if (ordersByDate[formattedDate] && ordersByDate[formattedDate].length > 0) {
        setTourListOpen(true);
    }
  }

  // Calculate statistics
  const stats = useMemo(() => {
    const totalTours = orders.length;
    const totalPax = orders.reduce((sum, order) => sum + order.pax, 0);
    const selectedDatePax = selectedDateOrders.reduce((sum, order) => sum + order.pax, 0);
    const datesWithTours = Object.keys(ordersByDate).length;

    return {
      totalTours,
      totalPax,
      selectedDatePax,
      datesWithTours,
      selectedDateTours: selectedDateOrders.length,
    };
  }, [orders, selectedDateOrders, ordersByDate]);

  // Get status color
  const getStatusColor = (status?: Order['status']) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800';
      case 'Updated': return 'bg-yellow-100 text-yellow-800';
      case 'Validate': return 'bg-purple-100 text-purple-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Canceled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get tour type color
  const getTourTypeColor = (type?: Order['tourType']) => {
    return type === 'Private'
      ? 'bg-purple-100 text-purple-800'
      : 'bg-indigo-100 text-indigo-800';
  };

  const TourListItem = ({ order }: { order: Order }) => {
    return (
      <Card
        key={order.id}
        className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
        onClick={() => { setTourListOpen(false); router.push(`/orders/${order.id}`); }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">{order.customerName}</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs font-mono">{order.shopifyOrderNumber}</Badge>
                <Badge className="text-xs">{order.tourCode}</Badge>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
              <Badge className={getTourTypeColor(order.tourType)}>{order.tourType}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-2 text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{order.tourHour || 'Not set'}</span></div>
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><span>{order.pax || 0} pax</span></div>
            </div>
            {order.pickupLocation && (
              <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><span className="text-muted-foreground line-clamp-2">{order.pickupLocation}</span></div>
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
              {order.campType && <span>Camp: {order.campType}</span>}
              {order.roomType && <span>Room: {order.roomType}</span>}
              {order.transport && <span>Transport: {order.transport}</span>}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderStatsSkeleton = () => (
    [...Array(4)].map((_, i) => (
        <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><Skeleton className="h-5 w-24" /></CardHeader>
            <CardContent><Skeleton className="h-7 w-16" /><Skeleton className="h-4 w-32 mt-1" /></CardContent>
        </Card>
    ))
  )

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tour Calendar</h1>
          <p className="text-muted-foreground mt-1">View and manage scheduled tours by date</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {isLoading ? renderStatsSkeleton() : (
            <>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Tours</CardTitle><CalendarIcon className="h-4 w-4 text-muted-foreground" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{stats.totalTours}</div><p className="text-xs text-muted-foreground mt-1">Across all dates</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Dates with Tours</CardTitle><CalendarIcon className="h-4 w-4 text-muted-foreground" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{stats.datesWithTours}</div><p className="text-xs text-muted-foreground mt-1">Days scheduled</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Selected Date Tours</CardTitle><CalendarIcon className="h-4 w-4 text-muted-foreground" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{stats.selectedDateTours}</div><p className="text-xs text-muted-foreground mt-1">{date ? format(date, 'dd-MM-yy') : 'No date selected'}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Selected Date PAX</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{stats.selectedDatePax}</div><p className="text-xs text-muted-foreground mt-1">Total passengers</p></CardContent>
                </Card>
            </>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
            {!isLoading ? (
                <CardDescription>
                    {`${stats.datesWithTours} dates with scheduled tours. Click a date to see details.`}
                </CardDescription>
            ) : (
                <Skeleton className="h-5 w-72 mt-1.5" />
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[270px] w-full" /> : (
                <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                className="rounded-md border p-2 sm:p-4 w-full"
                showOutsideDays={true}
                numberOfMonths={2}
                modifiers={{ booked: datesWithOrders }}
                modifiersStyles={{ booked: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', fontWeight: 'bold', borderRadius: '2px', margin: '2px' }}}
                />
            )}
            <div className="mt-4 space-y-2 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm"><div className="h-3 w-3 rounded-full bg-primary" /><span className="text-muted-foreground">Has scheduled tours</span></div>
              <div className="flex items-center gap-2 text-sm"><div className="h-3 w-3 rounded-full border-2 border-primary bg-background" /><span className="text-muted-foreground">Selected date</span></div>
              <div className="flex items-center gap-2 text-sm"><div className="h-3 w-3 rounded-full border-2 border-muted-foreground" /><span className="text-muted-foreground">Today</span></div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isTourListOpen} onOpenChange={setTourListOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Tours for {date ? format(date, 'EEEE, dd-MM-yy') : 'selected date'}</DialogTitle>
              <DialogDescription className="mt-1">
                {selectedDateOrders.length} tour(s) scheduled • {stats.selectedDatePax} total passengers
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6 pt-4 space-y-4">
              {selectedDateOrders.map((order) => <TourListItem key={order.id} order={order} />)}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
