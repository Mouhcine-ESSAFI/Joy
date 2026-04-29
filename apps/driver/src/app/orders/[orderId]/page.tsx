'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Clock, Users, MapPin, Tent, BedDouble, Building2,
  Truck, FileText, CalendarDays, Phone, MessageCircle, CreditCard,
  StickyNote, Hash, Tag, ListPlus,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { useOrder, useSupplements } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

function buildWhatsAppUrl(phone: string, customerName: string, tourDate: string | null, tourCode: string | null) {
  const clean = phone.replace(/[\s\-().+]/g, '').replace(/^00/, '+').replace(/^0/, '+212');
  const date = tourDate ? format(new Date(tourDate + 'T00:00:00'), 'dd/MM/yyyy') : '';
  const msg = encodeURIComponent(
    `Hello ${customerName}, this is Joy Morocco transport. Your tour${tourCode ? ` (${tourCode})` : ''}${date ? ` on ${date}` : ''} is confirmed. Please be ready for pickup.`
  );
  return `https://wa.me/${clean}?text=${msg}`;
}

export default function DriverOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const { order, loading: orderLoading } = useOrder(orderId);
  const { supplements, loading: supplementsLoading } = useSupplements(orderId);
  const loading = orderLoading || supplementsLoading;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Validate': return 'bg-purple-100 text-purple-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!order) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Order not found or access denied.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go back
          </Button>
        </div>
      </AppLayout>
    );
  }

  const tourDate = order.tourDate
    ? format(new Date(order.tourDate + 'T00:00:00'), 'EEEE, dd MMM yyyy')
    : null;

  const totalSupplements = supplements.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const balanceDue = Number(order.lineItemPrice || 0) + totalSupplements - Number(order.depositAmount || 0);

  return (
    <AppLayout>
      <div className="space-y-4 pb-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{order.customerName}</h1>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <Badge variant="outline" className="text-xs font-mono">{order.shopifyOrderNumber}</Badge>
              {order.tourType && (
                <Badge variant="outline" className="text-xs">{order.tourType}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Customer */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium">{order.customerName}</span>
            </div>
            {order.customerPhone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="flex-1">{order.customerPhone}</span>
                <a
                  href={buildWhatsAppUrl(order.customerPhone, order.customerName, order.tourDate, order.tourCode)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tour Details */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tour Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tourDate && (
              <div className="flex items-center gap-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium">{tourDate}</span>
              </div>
            )}
            {order.tourHour && (
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium">{order.tourHour}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span><span className="font-medium">{order.pax}</span> passengers</span>
            </div>
            {order.tourCode && (
              <div className="flex items-center gap-3">
                <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>Code: <span className="font-medium">{order.tourCode}</span></span>
              </div>
            )}
            {order.tourTitle && (
              <div className="flex items-center gap-3">
                <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm">{order.tourTitle}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pickup */}
        {order.pickupLocation && (
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pickup Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span>{order.pickupLocation}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Accommodation */}
        {(order.campType || order.roomType || order.accommodationName) && (
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Accommodation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.campType && (
                <div className="flex items-center gap-3">
                  <Tent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>Camp: <span className="font-medium">{order.campType}</span></span>
                </div>
              )}
              {order.roomType && (
                <div className="flex items-center gap-3">
                  <BedDouble className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>Room: <span className="font-medium">{order.roomType}</span></span>
                </div>
              )}
              {order.accommodationName && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>{order.accommodationName}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Balance to pay */}
        {balanceDue > 0 && (
          <Card className="border-blue-200 bg-blue-50/40">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Balance Due</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {supplements.length > 0 && (
                <div className="space-y-1 pb-2 border-b border-blue-100">
                  {supplements.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ListPlus className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                      <span>{s.label}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <span className="text-sm font-medium">Amount due from customer</span>
                </div>
                <span className="font-bold text-blue-700 text-lg">
                  {new Intl.NumberFormat('de-DE', { style: 'currency', currency: order.currency || 'EUR' }).format(balanceDue)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transport */}
        {order.transport && (
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Transport</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Truck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium">{order.transport}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Note */}
        {order.note && (
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Note</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <StickyNote className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span className="text-sm">{order.note}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Driver Notes */}
        {order.driverNotes && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Driver Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <span className="text-amber-900">{order.driverNotes}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
