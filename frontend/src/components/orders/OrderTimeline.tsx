'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { User, Clock, Edit, Plus, Trash, CheckCircle2, Truck, MessageSquare, AlertCircle } from 'lucide-react';
import { useOrderHistory } from '@/lib/hooks';
import { Skeleton } from '@/components/ui/skeleton';

interface OrderTimelineProps {
  orderId: string;
}

export function OrderTimeline({ orderId }: OrderTimelineProps) {
  // ⭐ FIX #7: Guard against undefined orderId
  if (!orderId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">Invalid order ID</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ⭐ UPDATED: Get real data from API
  const { history, loading, error } = useOrderHistory(orderId);

  const getIcon = (type: string) => {
    switch (type) {
      case 'status_change':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'field_updated':
        return <Edit className="h-4 w-4" />;
      case 'supplement_added':
        return <Plus className="h-4 w-4" />;
      case 'supplement_removed':
        return <Trash className="h-4 w-4" />;
      case 'note_added':
        return <MessageSquare className="h-4 w-4" />;
      case 'driver_assigned':
      case 'driver_unassigned':
        return <Truck className="h-4 w-4" />;
      default:
        return <Edit className="h-4 w-4" />;
    }
  };

  // ⭐ NEW: Format description based on event type and data
  const getDescription = (event: any): string => {
    const type = event.type;
    
    switch (type) {
      case 'status_change':
        const oldStatus = event.old_status || event.oldStatus;
        const newStatus = event.new_status || event.newStatus;
        return `Status changed from ${oldStatus} to ${newStatus}`;
      
      case 'field_updated':
        const fieldName = event.field_name || event.fieldName;
        return `${formatFieldName(fieldName)} updated`;
      
      case 'supplement_added':
        const addLabel = event.supplement_label || event.supplementLabel;
        const addAmount = event.supplement_amount || event.supplementAmount;
        const isDiscount = addAmount < 0;
        return `${isDiscount ? 'Discount' : 'Supplement'} added: ${addLabel}`;
      
      case 'supplement_removed':
        const removeLabel = event.supplement_label || event.supplementLabel;
        const removeAmount = event.supplement_amount || event.supplementAmount;
        return `${removeAmount < 0 ? 'Discount' : 'Supplement'} removed: ${removeLabel}`;
      
      case 'note_added':
        return 'Note added';
      
      case 'driver_assigned':
        return 'Driver assigned';
      
      case 'driver_unassigned':
        return 'Driver unassigned';
      
      default:
        return 'Order updated';
    }
  };

  // ⭐ NEW: Format field names to be readable
  const formatFieldName = (fieldName: string): string => {
    const fieldMap: Record<string, string> = {
      'tourDate': 'Tour Date',
      'tourHour': 'Tour Hour',
      'tourCode': 'Tour Code',
      'tourType': 'Tour Type',
      'campType': 'Camp Type',
      'roomType': 'Room Type',
      'pax': 'Passengers',
      'pickupLocation': 'Pickup Location',
      'accommodationName': 'Accommodation',
      'transport': 'Transport',
      'driverNotes': 'Driver Notes',
      'note': 'Note',
      'customerName': 'Customer Name',
      'customerEmail': 'Customer Email',
      'customerPhone': 'Customer Phone',
    };
    
    return fieldMap[fieldName] || fieldName.replace(/([A-Z])/g, ' $1').trim();
  };

  // ⭐ NEW: Get changes to display in the gray box
  const getChanges = (event: any) => {
    const changes = [];
    const type = event.type;

    // Status change
    if (type === 'status_change') {
      const oldStatus = event.old_status || event.oldStatus;
      const newStatus = event.new_status || event.newStatus;
      if (oldStatus && newStatus) {
        changes.push({
          field: 'Status',
          oldValue: oldStatus,
          newValue: newStatus,
        });
      }
    }

    // Field update
    if (type === 'field_updated') {
      const fieldName = event.field_name || event.fieldName;
      const oldValue = event.old_value || event.oldValue;
      const newValue = event.new_value || event.newValue;
      if (fieldName && oldValue && newValue) {
        changes.push({
          field: formatFieldName(fieldName),
          oldValue: oldValue,
          newValue: newValue,
        });
      }
    }

    // Supplement amount
    if (type === 'supplement_added' || type === 'supplement_removed') {
      const supplementAmount = event.supplement_amount || event.supplementAmount;
      if (supplementAmount !== null && supplementAmount !== undefined) {
        const amount = Number(supplementAmount);
        changes.push({
          field: 'Amount',
          oldValue: null,
          newValue: `${amount > 0 ? '+' : ''}€${amount.toFixed(2)}`,
        });
      }
    }

    // Note content
    if (type === 'note_added' && event.note) {
      changes.push({
        field: 'Note',
        oldValue: null,
        newValue: event.note,
      });
    }

    return changes;
  };

  // ⭐ NEW: Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ⭐ NEW: Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">Failed to load history: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ⭐ NEW: Empty state
  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-sm text-muted-foreground">No history recorded yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Changes to this order will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((event, index) => {
            const changes = getChanges(event);
            
            return (
              <div key={event.id} className="flex gap-4">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    {getIcon(event.type)}
                  </div>
                  {index < history.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-2" />
                  )}
                </div>

                {/* Event content */}
                <div className="flex-1 pb-8">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{getDescription(event)}</p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        {event.user && (
                          <>
                            <User className="h-3 w-3" />
                            <span>{event.user.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {event.user.role}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(event.created_at || event.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Changes */}
                  {changes && changes.length > 0 && (
                    <div className="mt-2 rounded-lg bg-muted p-3 text-sm space-y-1">
                      {changes.map((change, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="font-medium">{change.field}:</span>
                          {change.oldValue && (
                            <span className="line-through text-muted-foreground">
                              {change.oldValue}
                            </span>
                          )}
                          <span>→</span>
                          <span className="text-foreground font-medium">
                            {change.newValue}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}