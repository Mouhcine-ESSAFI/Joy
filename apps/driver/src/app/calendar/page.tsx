'use client';

import { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useOrders } from '@/lib/hooks';
import AppLayout from '@/components/layout/AppLayout';
import { useRouter } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Users, MapPin, CalendarDays } from 'lucide-react';
import type { Order } from '@/lib/types';

export default function DriverCalendarPage() {
  const { orders, loading: isLoading } = useOrders({ pageSize: 1000 });
  const router = useRouter();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isListOpen, setIsListOpen] = useState(false);

  const ordersByDate = useMemo(() => {
    if (isLoading) return {};
    return orders.reduce((acc, order) => {
      if (order.tourDate) {
        if (!acc[order.tourDate]) acc[order.tourDate] = [];
        acc[order.tourDate].push(order);
      }
      return acc;
    }, {} as Record<string, Order[]>);
  }, [orders, isLoading]);

  const datesWithOrders = useMemo(() =>
    Object.keys(ordersByDate).map((dateStr) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    }),
    [ordersByDate]
  );

  const selectedDateOrders = useMemo(() => {
    if (!date) return [];
    return ordersByDate[format(date, 'yyyy-MM-dd')] || [];
  }, [date, ordersByDate]);

  useEffect(() => {
    if (!isLoading && orders.length > 0) {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      if (ordersByDate[todayStr]?.length) {
        setTimeout(() => setIsListOpen(true), 100);
      }
    }
  }, [isLoading, orders, ordersByDate]);

  const handleDateSelect = (selected: Date | undefined) => {
    if (!selected) return;
    setDate(selected);
    const key = format(selected, 'yyyy-MM-dd');
    if (ordersByDate[key]?.length) setIsListOpen(true);
  };

  const getStatusColor = (status?: Order['status']) => {
    switch (status) {
      case 'Validate': return 'bg-purple-100 text-purple-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Schedule</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Your assigned tours by date</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs font-medium text-muted-foreground">Total Tours</CardTitle></CardHeader>
            <CardContent className="px-4 pb-3">
              {isLoading ? <Skeleton className="h-7 w-10" /> : <div className="text-2xl font-bold">{orders.length}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs font-medium text-muted-foreground">Scheduled Days</CardTitle></CardHeader>
            <CardContent className="px-4 pb-3">
              {isLoading ? <Skeleton className="h-7 w-10" /> : <div className="text-2xl font-bold">{Object.keys(ordersByDate).length}</div>}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Calendar</CardTitle>
            {!isLoading ? (
              <CardDescription>{Object.keys(ordersByDate).length} days with scheduled tours</CardDescription>
            ) : (
              <Skeleton className="h-4 w-48 mt-1" />
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[270px] w-full" />
            ) : (
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                className="rounded-md border p-2 w-full"
                showOutsideDays
                modifiers={{ booked: datesWithOrders }}
                modifiersStyles={{
                  booked: {
                    backgroundColor: 'hsl(var(--primary))',
                    color: 'hsl(var(--primary-foreground))',
                    fontWeight: 'bold',
                    borderRadius: '2px',
                    margin: '2px',
                  },
                }}
              />
            )}
            <div className="mt-3 space-y-1.5 pt-3 border-t">
              <div className="flex items-center gap-2 text-xs"><div className="h-3 w-3 rounded-full bg-primary" /><span className="text-muted-foreground">Has scheduled tours</span></div>
              <div className="flex items-center gap-2 text-xs"><div className="h-3 w-3 rounded-full border-2 border-primary bg-background" /><span className="text-muted-foreground">Selected date</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isListOpen} onOpenChange={setIsListOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tours for {date ? format(date, 'EEEE, dd MMM yyyy') : 'selected date'}</DialogTitle>
            <DialogDescription>{selectedDateOrders.length} tour(s) assigned</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6 pt-2 space-y-3">
            {selectedDateOrders.map((order) => (
              <Card
                key={order.id}
                className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
                onClick={() => { setIsListOpen(false); router.push(`/orders/${order.id}`); }}
              >
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm">{order.customerName}</CardTitle>
                      <Badge variant="outline" className="text-xs font-mono mt-1">{order.tourCode}</Badge>
                    </div>
                    <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-medium">{order.tourHour || 'TBD'}</span></div>
                      <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-muted-foreground" /><span>{order.pax} pax</span></div>
                    </div>
                    {order.pickupLocation && (
                      <div className="flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" /><span className="text-muted-foreground text-xs line-clamp-2">{order.pickupLocation}</span></div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
