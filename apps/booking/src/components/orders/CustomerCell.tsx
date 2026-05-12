'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Order } from '@/lib/types';
import { Mail, Phone, ShoppingBag } from 'lucide-react';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';

interface CustomerCellProps {
  order: Order;
  allOrders: Order[];
}

export default function CustomerCell({ order, allOrders }: CustomerCellProps) {
  // ⭐ OPTIMIZED: This useMemo prevents O(n²) filtering on every render
  // Alternative: Pre-group orders by email in parent component for even better performance
  const customerOrders = useMemo(() => {
    return allOrders.filter(o => o.customerEmail === order.customerEmail);
  }, [allOrders, order.customerEmail]);
  
  const ordersByStore = useMemo(() => {
    return customerOrders.reduce((acc, o) => {
        acc[o.storeId] = (acc[o.storeId] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
  }, [customerOrders]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <span
            className="text-primary underline decoration-dotted cursor-pointer hover:no-underline"
            onClick={(e) => e.stopPropagation()}
        >
          {order.customerName}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-[90vw] max-w-sm">
        <div className="flex flex-col gap-4">
            <div className="flex gap-4">
                <Avatar>
                    <AvatarImage src={`/avatars/${order.customerAvatar}.png`} />
                    <AvatarFallback>{getInitials(order.customerName)}</AvatarFallback>
                </Avatar>
                <div className="grid gap-1">
                    <p className="text-base font-semibold">{order.customerName}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{order.customerEmail}</span>
                    </div>
                    {order.customerPhone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{order.customerPhone}</span>
                        </div>
                    )}
                </div>
            </div>
            <div className="space-y-2 text-sm border-t pt-4">
                 <div className="flex items-center gap-2 font-medium">
                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    <span>{customerOrders.length} total order(s)</span>
                </div>
                <div className="flex flex-wrap gap-2 pl-6">
                    {Object.entries(ordersByStore).map(([storeId, count]) => (
                        <Badge key={storeId} variant="secondary">{count} in {storeId}</Badge>
                    ))}
                </div>
            </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}