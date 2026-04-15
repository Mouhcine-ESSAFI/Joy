'use client';

import { useState } from 'react';
import { Store, Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function StoreSelector() {
  const [selectedStore, setSelectedStore] = useState('all');

  // Mock stores - will come from user's accessible stores via API
  const stores = [
    { id: 'all', name: 'All Stores', code: 'ALL', color: 'default' },
    { id: 'store_es', name: 'Spanish Store', code: 'ES', color: 'bg-red-100 text-red-800' },
    { id: 'store_en', name: 'English Store', code: 'EN', color: 'bg-blue-100 text-blue-800' },
    { id: 'store_fr', name: 'French Store', code: 'FR', color: 'bg-purple-100 text-purple-800' },
  ];

  const currentStore = stores.find((s) => s.id === selectedStore);

  return (
    <Select value={selectedStore} onValueChange={setSelectedStore}>
      <SelectTrigger className="w-full md:w-[180px]">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4" />
          <span className="truncate">{currentStore?.name}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {stores.map((store) => (
          <SelectItem key={store.id} value={store.id}>
            <div className="flex items-center justify-between w-full gap-2">
              <span>{store.name}</span>
              <Badge
                variant="secondary"
                className={store.color !== 'default' ? store.color : ''}
              >
                {store.code}
              </Badge>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
