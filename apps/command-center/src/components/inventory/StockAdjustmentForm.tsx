'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { createStockAdjustment } from '@/app/actions/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const REASON_OPTIONS = [
  { value: 'Damage', label: 'Damage' },
  { value: 'Theft', label: 'Theft' },
  { value: 'Counting Error', label: 'Counting Error' },
  { value: 'Expired', label: 'Expired' },
  { value: 'Sample/Giveaway', label: 'Sample / Giveaway' },
  { value: 'Other', label: 'Other' },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-caribbean-green hover:bg-caribbean-green/90 text-white"
    >
      {pending ? 'Recording...' : 'Record Adjustment'}
    </Button>
  );
}

interface StockAdjustmentFormProps {
  products: { id: string; name: string; sku: string; size: string }[];
  locations: { id: string; name: string }[];
}

export function StockAdjustmentForm({ products, locations }: StockAdjustmentFormProps) {
  const [state, formAction] = useActionState(createStockAdjustment, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message || 'Adjustment recorded');
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <h3 className="font-semibold">Stock Adjustment</h3>

      {state?.message && !state?.success && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-md text-sm">
          {state.message}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="adj-productId">Product</Label>
        <Select name="productId" required>
          <SelectTrigger id="adj-productId" className="h-11">
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.sku}) — {p.size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state?.errors?.productId && (
          <p className="text-sm text-red-500">{state.errors.productId[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="adj-locationId">Location</Label>
        <Select name="locationId" required>
          <SelectTrigger id="adj-locationId" className="h-11">
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state?.errors?.locationId && (
          <p className="text-sm text-red-500">{state.errors.locationId[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="adj-quantityChange">Quantity Change</Label>
        <Input
          id="adj-quantityChange"
          name="quantityChange"
          type="number"
          placeholder="e.g., -5 or +10"
          required
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">
          Use negative numbers to subtract, positive to add
        </p>
        {state?.errors?.quantityChange && (
          <p className="text-sm text-red-500">{state.errors.quantityChange[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="adj-reason">Reason</Label>
        <Select name="reason" required>
          <SelectTrigger id="adj-reason" className="h-11">
            <SelectValue placeholder="Select reason" />
          </SelectTrigger>
          <SelectContent>
            {REASON_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state?.errors?.reason && (
          <p className="text-sm text-red-500">{state.errors.reason[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="adj-notes">Notes (Optional)</Label>
        <textarea
          id="adj-notes"
          name="notes"
          rows={2}
          placeholder="Details about the adjustment..."
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
