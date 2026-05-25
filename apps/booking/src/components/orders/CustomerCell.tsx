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
                            <a
                              href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-700"
                              title="Open in WhatsApp"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                            </a>
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