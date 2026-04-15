'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Order } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Ticket, BedDouble, Flame, Users, Building } from 'lucide-react';

interface TourCellProps {
  order: Order;
}

export default function TourCell({ order }: TourCellProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
            variant="outline"
            className="cursor-pointer hover:bg-accent"
            onClick={(e) => e.stopPropagation()}
        >
          {order.tourCode || 'N/A'}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-[90vw] max-w-sm">
        <div className="flex flex-col gap-4">
            <div className="space-y-1">
                <p className="text-sm font-semibold text-primary">{order.tourTitle}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Ticket className="h-4 w-4" />
                    <span>{order.tourType}</span>
                    <span className="text-xs">&bull;</span>
                    <Users className="h-4 w-4" />
                    <span>{order.pax} PAX</span>
                </div>
            </div>
            <div className="space-y-2 text-sm border-t pt-4">
                 {order.campType && (
                    <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Camp:</span>
                        <span>{order.campType}</span>
                    </div>
                 )}
                 {order.roomType && (
                    <div className="flex items-center gap-2">
                        <BedDouble className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Room:</span>
                        <span>{order.roomType}</span>
                    </div>
                 )}
                 {order.accommodationName && (
                    <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Accom:</span>
                        <span>{order.accommodationName}</span>
                    </div>
                 )}
            </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
