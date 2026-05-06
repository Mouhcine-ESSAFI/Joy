'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Clock, Users, MapPin, Tent, BedDouble, Building2,
  FileText, CalendarDays, Phone, MessageCircle, CreditCard,
  StickyNote, ListPlus, Timer, Navigation, PlaneLanding, XCircle,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { useOrder, useSupplements } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

function buildWhatsAppUrl(phone: string, customerName: string, tourDate: string | null) {
  const clean = phone.replace(/[\s\-().+]/g, '').replace(/^00/, '+').replace(/^0/, '+212');
  const date = tourDate ? format(new Date(tourDate + 'T00:00:00'), 'dd/MM/yyyy') : '';
  const msg = encodeURIComponent(
    `Hello ${customerName}, this is Joy Morocco transport. Your tour${date ? ` on ${date}` : ''} is confirmed. Please be ready for pickup.`
  );
  return `https://wa.me/${clean}?text=${msg}`;
}

// Search for a metafield value across multiple sources:
// 1. shopifyMetadata.metafields  → product metafields fetched from Shopify API [{key, value, namespace}]
// 2. lineItemProperties.raw      → line item checkout properties [{name, value}]
function getProp(
  lineItemProps: Record<string, any> | null | undefined,
  shopifyMeta: Record<string, any> | null | undefined,
  ...keys: string[]
): string | null {
  // Product metafields (stored under shopifyMetadata.metafields)
  if (Array.isArray(shopifyMeta?.metafields)) {
    for (const key of keys) {
      const found = (shopifyMeta!.metafields as Array<{ key: string; value: string }>).find(
        (m) => m.key?.toLowerCase() === key.toLowerCase(),
      );
      if (found?.value && String(found.value).trim()) return String(found.value).trim();
    }
  }
  // Line item checkout properties (stored under lineItemProperties.raw)
  if (Array.isArray(lineItemProps?.raw)) {
    for (const key of keys) {
      const found = (lineItemProps!.raw as Array<{ name: string; value: string }>).find(
        (p) => p.name?.toLowerCase() === key.toLowerCase(),
      );
      if (found?.value && String(found.value).trim()) return String(found.value).trim();
    }
  }
  return null;
}

// Strip trailing price annotations like "(+45€)" or "(45 EUR)" from variant labels
function stripPrice(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.replace(/\s*\([^)]*[€$£¥].*?\)/g, '').trim() || null;
}

export default function DriverOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const { order, loading: orderLoading } = useOrder(orderId);
  const { supplements, loading: supplementsLoading } = useSupplements(orderId);
  const loading = orderLoading || supplementsLoading;

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

  const isCanceled = order.status === 'Canceled';

  const tourDate = order.tourDate
    ? format(new Date(order.tourDate + 'T00:00:00'), 'EEEE, dd MMM yyyy')
    : null;

  const totalSupplements = supplements.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const balanceDue = Number(order.lineItemPrice || 0) + totalSupplements - Number(order.depositAmount || 0);

  // Shopify product metafield names: Duration, From, To
  const duration = getProp(order.lineItemProperties, order.shopifyMetadata, 'Duration', 'duration');
  const departure = getProp(order.lineItemProperties, order.shopifyMetadata, 'From', 'from');
  const arrival = getProp(order.lineItemProperties, order.shopifyMetadata, 'To', 'to');

  const campType = stripPrice(order.campType);
  const roomType = stripPrice(order.roomType);

  return (
    <AppLayout>
      <div className="space-y-4 pb-6">
        {/* Header — order number left, tour type right */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
            <Badge variant="outline" className="text-xs font-mono">{order.shopifyOrderNumber}</Badge>
            {order.tourType && (
              <Badge variant="secondary" className="text-xs shrink-0">{order.tourType}</Badge>
            )}
          </div>
        </div>

        {/* 1 — Customer */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium">{order.customerName}</span>
            </div>
            {order.customerPhone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1 text-sm">{order.customerPhone}</span>
                <a
                  href={buildWhatsAppUrl(order.customerPhone, order.customerName, order.tourDate)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors shrink-0"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2 — Pickup Location */}
        {order.pickupLocation && (
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pickup Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span>{order.pickupLocation}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3 — Balance Due */}
        {balanceDue > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Balance Due</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {supplements.length > 0 && (
                <div className="space-y-1 pb-2 border-b">
                  {supplements.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ListPlus className="h-3.5 w-3.5 shrink-0" />
                      <span>{s.label}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">Amount due</span>
                </div>
                <span className="font-bold text-lg">
                  {new Intl.NumberFormat('de-DE', { style: 'currency', currency: order.currency || 'EUR' }).format(balanceDue)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4 — Tour Details */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tour Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tourDate && (
              <div className="flex items-center gap-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium">{tourDate}</span>
              </div>
            )}
            {order.tourHour && (
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium">{order.tourHour}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <span><span className="font-medium">{order.pax}</span> passengers</span>
            </div>
            {duration && (
              <div className="flex items-center gap-3">
                <Timer className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">{duration}</span>
              </div>
            )}
            {departure && (
              <div className="flex items-center gap-3">
                <Navigation className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">{departure}</span>
              </div>
            )}
            {arrival && (
              <div className="flex items-center gap-3">
                <PlaneLanding className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">{arrival}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 5 — Accommodation */}
        {(campType || roomType || order.accommodationName) && (
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Accommodation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {campType && (
                <div className="flex items-center gap-3">
                  <Tent className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Camp: <span className="font-medium">{campType}</span></span>
                </div>
              )}
              {roomType && (
                <div className="flex items-center gap-3">
                  <BedDouble className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Room: <span className="font-medium">{roomType}</span></span>
                </div>
              )}
              {order.accommodationName && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{order.accommodationName}</span>
                </div>
              )}
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
                <StickyNote className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
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
                <FileText className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <span className="text-amber-900 text-sm">{order.driverNotes}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Canceled banner */}
        {isCanceled && (
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                <div>
                  <p className="font-semibold text-red-800 text-sm">Tour Canceled</p>
                  {order.canceledAt && (
                    <p className="text-xs text-red-600 mt-0.5">
                      {format(new Date(order.canceledAt), 'dd MMM yyyy, HH:mm')}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
