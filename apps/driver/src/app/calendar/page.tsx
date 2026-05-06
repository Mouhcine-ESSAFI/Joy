'use client';

import { useMemo, useState, useEffect } from 'react';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { useOrders } from '@/lib/hooks';
import AppLayout from '@/components/layout/AppLayout';
import { useRouter } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Clock, Users, MapPin, MessageCircle, CalendarDays, ChevronRight } from 'lucide-react';
import type { Order } from '@/lib/types';

function buildWhatsAppUrl(phone: string, customerName: string, tourDate: string | null, tourCode: string | null) {
  const clean = phone.replace(/[\s\-().+]/g, '').replace(/^00/, '+').replace(/^0/, '+212');
  const date = tourDate ? format(new Date(tourDate + 'T00:00:00'), 'dd/MM/yyyy') : '';
  const msg = encodeURIComponent(
    `Hello ${customerName}, this is Joy Morocco transport. Your tour${tourCode ? ` (${tourCode})` : ''}${date ? ` on ${date}` : ''} is confirmed. Please be ready for pickup.`
  );
  return `https://wa.me/${clean}?text=${msg}`;
}

function getStatusColor(status?: Order['status']) {
  switch (status) {
    case 'Validate': return 'bg-purple-100 text-purple-800';
    case 'Completed': return 'bg-green-100 text-green-800';
    case 'Canceled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export default function DriverCalendarPage() {
  const { orders, loading: isLoading } = useOrders({ pageSize: 1000 });
  const router = useRouter();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

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

  const todayOrders = ordersByDate[todayStr] || [];
  const tomorrowOrders = ordersByDate[tomorrowStr] || [];
  const todayPax = todayOrders.reduce((sum, o) => sum + (o.pax || 0), 0);
  const tomorrowPax = tomorrowOrders.reduce((sum, o) => sum + (o.pax || 0), 0);

  const selectedDateOrders = useMemo(() => {
    if (!date) return [];
    return ordersByDate[format(date, 'yyyy-MM-dd')] || [];
  }, [date, ordersByDate]);

  const activeOrders = selectedDateOrders.filter(o => o.status !== 'Canceled');
  const canceledOrders = selectedDateOrders.filter(o => o.status === 'Canceled');

  // All orders sorted by tourDate ASC (upcoming first), non-null dates only
  const sortedOrders = useMemo(() => {
    return [...orders]
      .filter(o => o.tourDate)
      .sort((a, b) => {
        if (a.tourDate! < b.tourDate!) return -1;
        if (a.tourDate! > b.tourDate!) return 1;
        return 0;
      });
  }, [orders]);

  // Auto-open today's tours once loaded
  useEffect(() => {
    if (!isLoading && ordersByDate[todayStr]?.length) {
      setTimeout(() => setIsSheetOpen(true), 150);
    }
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // onDayClick fires even when clicking the already-selected date,
  // unlike onSelect which only fires when selection changes.
  const handleDayClick = (clicked: Date) => {
    setDate(clicked);
    const key = format(clicked, 'yyyy-MM-dd');
    if (ordersByDate[key]?.length) setIsSheetOpen(true);
  };

  const today = startOfDay(new Date());

  return (
    <AppLayout>
      <div className="space-y-4 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Schedule</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Your assigned tours by date</p>
        </div>

        {/* Today / Tomorrow summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors active:scale-[0.98]"
            onClick={() => { setDate(new Date()); if (todayOrders.length) setIsSheetOpen(true); }}
          >
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Today</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {isLoading ? <Skeleton className="h-7 w-16" /> : (
                <>
                  <div className="text-2xl font-bold">
                    {todayOrders.length}
                    <span className="text-sm font-normal text-muted-foreground ml-1">tours</span>
                  </div>
                  {todayPax > 0 && (
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Users className="h-3 w-3" />{todayPax} pax
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors active:scale-[0.98]"
            onClick={() => { setDate(addDays(new Date(), 1)); if (tomorrowOrders.length) setIsSheetOpen(true); }}
          >
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Tomorrow</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {isLoading ? <Skeleton className="h-7 w-16" /> : (
                <>
                  <div className="text-2xl font-bold">
                    {tomorrowOrders.length}
                    <span className="text-sm font-normal text-muted-foreground ml-1">tours</span>
                  </div>
                  {tomorrowPax > 0 && (
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Users className="h-3 w-3" />{tomorrowPax} pax
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Calendar card */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-base">Calendar</CardTitle>
            {!isLoading ? (
              <CardDescription>{Object.keys(ordersByDate).length} days with scheduled tours</CardDescription>
            ) : (
              <Skeleton className="h-4 w-48 mt-1" />
            )}
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {isLoading ? (
              <Skeleton className="h-[280px] w-full rounded-md" />
            ) : (
              <>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => { if (d) setDate(d); }}
                  onDayClick={handleDayClick}
                  showOutsideDays={false}
                  className="w-full [--cell-size:1.75rem] p-2"
                  classNames={{ root: 'w-full' }}
                  modifiers={{ booked: datesWithOrders }}
                  modifiersClassNames={{
                    booked: 'bg-accent text-accent-foreground rounded-md font-medium',
                  }}
                />
                <div className="mt-2 flex items-center gap-4 px-2 pt-3 border-t">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="h-2.5 w-2.5 rounded-sm bg-accent" />
                    Has tours
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="h-2.5 w-2.5 rounded-sm bg-primary" />
                    Selected
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* All assigned tours list */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-base">All Tours</CardTitle>
            {!isLoading && (
              <CardDescription>{sortedOrders.length} assigned tours</CardDescription>
            )}
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {isLoading ? (
              <div className="space-y-3 px-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-md" />)}
              </div>
            ) : sortedOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No tours assigned.</p>
            ) : (
              <div className="divide-y">
                {sortedOrders.map((order) => {
                  const isPast = order.tourDate
                    ? isBefore(new Date(order.tourDate + 'T00:00:00'), today)
                    : false;
                  return (
                    <button
                      key={order.id}
                      type="button"
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors active:bg-muted/60 hover:bg-muted/40 ${isPast ? 'opacity-50' : ''}`}
                      onClick={() => router.push(`/orders/${order.id}`)}
                    >
                      {/* Date column */}
                      <div className="shrink-0 w-14 text-center">
                        <CalendarDays className="h-4 w-4 text-muted-foreground mx-auto mb-0.5" />
                        {order.tourDate && (
                          <>
                            <p className="text-xs font-bold leading-tight">
                              {format(new Date(order.tourDate + 'T00:00:00'), 'dd MMM')}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {format(new Date(order.tourDate + 'T00:00:00'), 'yyyy')}
                            </p>
                          </>
                        )}
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{order.customerName}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {order.tourHour && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <Clock className="h-3 w-3" />{order.tourHour}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Users className="h-3 w-3" />{order.pax}
                          </span>
                        </div>
                      </div>

                      {/* Status + chevron */}
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <Badge className={`text-[10px] border-0 px-1.5 py-px ${getStatusColor(order.status)}`}>
                          {order.status}
                        </Badge>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent
          side="bottom"
          className="px-0 pb-0 rounded-t-2xl max-h-[85vh] flex flex-col"
        >
          <SheetHeader className="px-5 pb-3 border-b shrink-0">
            <SheetTitle className="text-left">
              {date ? format(date, 'EEEE, dd MMM yyyy') : 'Tours'}
            </SheetTitle>
            <SheetDescription className="text-left">
              {activeOrders.length} active
              {canceledOrders.length > 0 ? ` · ${canceledOrders.length} canceled` : ''}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {activeOrders.map((order) => (
              <TourCard
                key={order.id}
                order={order}
                onNavigate={() => { setIsSheetOpen(false); router.push(`/orders/${order.id}`); }}
              />
            ))}

            {canceledOrders.length > 0 && (
              <>
                {activeOrders.length > 0 && <div className="border-t" />}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 pt-1">
                  Canceled
                </p>
                {canceledOrders.map((order) => (
                  <TourCard
                    key={order.id}
                    order={order}
                    canceled
                    onNavigate={() => { setIsSheetOpen(false); router.push(`/orders/${order.id}`); }}
                  />
                ))}
              </>
            )}

            {selectedDateOrders.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No tours on this date.
              </p>
            )}
          </div>

          <div className="shrink-0 px-4 py-3 border-t bg-background">
            <Button variant="outline" className="w-full" onClick={() => setIsSheetOpen(false)}>
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

function TourCard({
  order,
  canceled = false,
  onNavigate,
}: {
  order: Order;
  canceled?: boolean;
  onNavigate: () => void;
}) {
  return (
    <Card
      className={`transition-all cursor-pointer ${
        canceled ? 'opacity-55' : 'active:scale-[0.99] hover:border-primary/40'
      }`}
      onClick={onNavigate}
    >
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{order.customerName}</p>
          </div>
          <Badge className={`text-xs shrink-0 border-0 ${getStatusColor(order.status)}`}>
            {order.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-3 px-4 space-y-1.5">
        <div className="flex items-center gap-3 text-sm">
          {order.tourHour && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{order.tourHour}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{order.pax} pax</span>
          </div>
        </div>

        {order.pickupLocation && (
          <div className="flex items-start gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-xs text-muted-foreground line-clamp-1">{order.pickupLocation}</span>
          </div>
        )}

        {order.customerPhone && (
          <div className="pt-1" onClick={e => e.stopPropagation()}>
            <a
              href={buildWhatsAppUrl(order.customerPhone, order.customerName, order.tourDate, order.tourCode)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors w-full justify-center"
              onClick={e => e.stopPropagation()}
            >
              <MessageCircle className="h-3.5 w-3.5 shrink-0" />
              {order.customerPhone}
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
