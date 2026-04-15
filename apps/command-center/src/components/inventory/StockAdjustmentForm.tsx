'use client';

import { useActionState, useEffect, useRef, useState, useCallback } from 'react';
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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';

const REASON_OPTIONS = [
  { value: 'Damage', label: 'Damage' },
  { value: 'Theft', label: 'Theft' },
  { value: 'Counting Error', label: 'Counting Error' },
  { value: 'Expired', label: 'Expired' },
  { value: 'Sample/Giveaway', label: 'Sample / Giveaway' },
  { value: 'Other', label: 'Other' },
];

interface StockAdjustmentFormProps {
  products: { id: string; name: string; sku: string; size: string }[];
  locations: { id: string; name: string }[];
}

export function StockAdjustmentForm({ products, locations }: StockAdjustmentFormProps) {
  const [state, formAction, pending] = useActionState(createStockAdjustment, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [formKey, setFormKey] = useState(0);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message || 'Adjustment recorded');
      formRef.current?.reset();
      setFormKey((k) => k + 1);
      setShowError(false);
    } else if (state?.message || state?.errors) {
      setShowError(true);
    }
  }, [state]);

  const clearError = useCallback(() => {
    if (showError) setShowError(false);
  }, [showError]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4" onChange={clearError}>
      <h3 className="font-semibold">Stock Adjustment</h3>

      {showError && state?.message && !state?.success && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-md text-sm">
          {state.message}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="adj-productId">Product</Label>
        <SearchableSelect
          key={`p-${formKey}`}
          id="adj-productId"
          name="productId"
          value={undefined}
          onValueChange={(v) => clearError()}
          placeholder="Select product"
          searchPlaceholder="Search catalog..."
          emptyMessage="No products found"
          options={products.map(p => ({
            value: p.id,
            label: `${p.name} (${p.sku}) — ${p.size}`,
            keywords: [p.sku, p.size].filter(Boolean) as string[],
          }))}
          className="h-11"
        />
        {showError && state?.errors?.productId && (
          <p className="text-sm text-red-500">{state.errors.productId[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="adj-locationId">Location</Label>
        <Select key={`l-${formKey}`} name="locationId" required onValueChange={clearError}>
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
        {showError && state?.errors?.locationId && (
          <p className="text-sm text-red-500">{state.errors.locationId[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="adj-quantityChange">Quantity Change</Label>
        <Input
          key={`q-${formKey}`}
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
        {showError && state?.errors?.quantityChange && (
          <p className="text-sm text-red-500">{state.errors.quantityChange[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="adj-reason">Reason</Label>
        <Select key={`r-${formKey}`} name="reason" required onValueChange={clearError}>
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
        {showError && state?.errors?.reason && (
          <p className="text-sm text-red-500">{state.errors.reason[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="adj-notes">Notes (Optional)</Label>
        <textarea
          key={`n-${formKey}`}
          id="adj-notes"
          name="notes"
          rows={2}
          placeholder="Details about the adjustment..."
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="w-full bg-caribbean-green hover:bg-caribbean-green/90 text-white"
      >
        {pending ? 'Recording...' : 'Record Adjustment'}
      </Button>
    </form>
  );
}
