'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import api from '@/lib/api-client';

// ⭐ FIXED: Allow negative numbers (discounts)
const supplementSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  amount: z.string().min(1, 'Amount is required'),
});

type SupplementFormValues = z.infer<typeof supplementSchema>;

interface SupplementFormProps {
  orderId: string;
  onFormSubmit: () => void;
}

export default function SupplementForm({ orderId, onFormSubmit }: SupplementFormProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<SupplementFormValues>({
    resolver: zodResolver(supplementSchema),
    defaultValues: {
      label: '',
      amount: '',
    },
  });

  async function onSubmit(values: SupplementFormValues) {
    setIsSaving(true);

    try {
      const amountNumber = Number(values.amount);
      
      // ⭐ FIXED: Allow negative numbers, just not NaN or zero
      if (Number.isNaN(amountNumber)) {
        toast({
          title: 'Invalid amount',
          description: 'Amount must be a valid number.',
          variant: 'destructive',
        });
        return;
      }

      if (amountNumber === 0) {
        toast({
          title: 'Invalid amount',
          description: 'Amount cannot be zero.',
          variant: 'destructive',
        });
        return;
      }

      await api.supplements.create(orderId, {
        label: values.label.trim(),
        amount: amountNumber,
      } as any);

      // ⭐ FIXED: Different message for discounts vs supplements
      const isDiscount = amountNumber < 0;
      toast({
        title: isDiscount ? 'Discount Added' : 'Supplement Added',
        description: `${values.label} (${amountNumber > 0 ? '+' : ''}€${amountNumber.toFixed(2)}) has been added.`,
      });

      form.reset({ label: '', amount: '' });
      onFormSubmit();
    } catch (e: any) {
      toast({
        title: 'Failed to add',
        description: e?.message || 'Could not add supplement.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Label</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Extra Luggage, New Year Discount" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (EUR)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="e.g., 50.00 or -10.00 for discount"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground mt-1">
                💡 Use positive for extra charges (+50), negative for discounts (-10)
              </p>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onFormSubmit}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Adding...' : 'Add Supplement'}
          </Button>
        </div>
      </form>
    </Form>
  );
}