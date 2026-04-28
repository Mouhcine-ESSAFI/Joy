'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Users, MapPin, Tent, BedDouble, Building2, Truck, FileText, Calendar } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { useOrder } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';

export default function DriverOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const { order, loading } = useOrder(orderId);

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
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
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

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{order.customerName}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-xs font-mono">{order.shopifyOrderNumber}</Badge>
              <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
            </div>
          </div>
        </div>

        {/* Tour Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tour Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tourDate && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
                <span className="text-xs text-muted-foreground w-4 text-center font-mono">#</span>
                <span>Tour: <span className="font-medium">{order.tourCode}</span></span>
              </div>
            )}
            {order.tourType && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-4" />
                <Badge variant="outline" className="text-xs">{order.tourType}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pickup & Location */}
        {order.pickupLocation && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pickup Location</CardTitle>
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
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Accommodation</CardTitle>
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

        {/* Transport */}
        {order.transport && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Transport</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Truck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium">{order.transport}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Driver Notes */}
        {order.driverNotes && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-amber-800 uppercase tracking-wide">Driver Notes</CardTitle>
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
