'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { TransportType } from '@/lib/types';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkUpdate: (field: string, value: string) => void;
  transportTypes: TransportType[];
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onBulkUpdate,
  transportTypes,
}: BulkActionsBarProps) {
  const [bulkField, setBulkField] = useState('');
  const [bulkValue, setBulkValue] = useState('');

  if (selectedCount === 0) return null;

  const handleApply = () => {
    if (bulkField && bulkValue) {
      onBulkUpdate(bulkField, bulkValue);
      setBulkField('');
      setBulkValue('');
    }
  };

  const resetValueOnFieldChange = (field: string) => {
    setBulkField(field);
    setBulkValue('');
  }

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-card border rounded-lg shadow-lg p-4 flex items-center gap-4 animate-in fade-in-0 slide-in-from-bottom-5 duration-300">
        <Badge variant="secondary" className="text-base px-3 py-1">
          {selectedCount} selected
        </Badge>

        <Select value={bulkField} onValueChange={resetValueOnFieldChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select field..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="transport">Transport</SelectItem>
            <SelectItem value="tourType">Tour Type</SelectItem>
            <SelectItem value="campType">Camp Type</SelectItem>
          </SelectContent>
        </Select>

        {bulkField && (
          <Select value={bulkValue} onValueChange={setBulkValue}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select value..." />
            </SelectTrigger>
            <SelectContent>
              {bulkField === 'status' && (
                <>
                  {/* <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Updated">Updated</SelectItem> */}
                  <SelectItem value="Validate">Validate</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Canceled">Canceled</SelectItem>
                </>
              )}
              {bulkField === 'transport' && (
                <>
                  {transportTypes.map(t => (
                     <SelectItem key={t.id} value={t.code}>{t.code}</SelectItem>
                  ))}
                </>
              )}
              {bulkField === 'tourType' && (
                <>
                  <SelectItem value="Shared">Shared</SelectItem>
                  <SelectItem value="Private">Private</SelectItem>
                </>
              )}
              {bulkField === 'campType' && (
                <>
                  <SelectItem value="Comfort">Comfort</SelectItem>
                  <SelectItem value="Luxury">Luxury</SelectItem>
                  <SelectItem value="Luxury A/C">Luxury A/C</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        )}

        <Button onClick={handleApply} disabled={!bulkField || !bulkValue}>
          <Check className="mr-2 h-4 w-4" />
          Apply
        </Button>

        <Button variant="ghost" size="icon" onClick={onClearSelection}>
          <X className="h-4 w-4" />
          <span className="sr-only">Cancel</span>
        </Button>
      </div>
    </div>
  );
}