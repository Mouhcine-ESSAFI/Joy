'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
    date: DateRange | undefined;
    onDateChange: (date: DateRange | undefined) => void;
    numberOfMonths?: number;
    buttonClassName?: string;
}

export function DatePickerWithRange({
  className,
  date,
  onDateChange,
  numberOfMonths = 2,
  buttonClassName,
}: DatePickerWithRangeProps) {
  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !date && 'text-muted-foreground',
              buttonClassName,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            {date?.from ? (
              date.to ? (
                <span className="truncate">{format(date.from, 'dd-MM-yy')} – {format(date.to, 'dd-MM-yy')}</span>
              ) : (
                format(date.from, 'dd-MM-yy')
              )
            ) : (
              <span>Date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="start"
          style={{ maxWidth: 'calc(100vw - 1rem)' }}
        >
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={numberOfMonths}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
