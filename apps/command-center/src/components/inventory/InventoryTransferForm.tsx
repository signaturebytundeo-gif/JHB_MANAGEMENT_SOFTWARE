'use client';

import { useActionState, useEffect, useRef, useState, useCallback } from 'react';
import { createInventoryTransfer } from '@/app/actions/inventory';
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

interface InventoryTransferFormProps {
  products: { id: string; name: string; sku: string; size: string }[];
  locations: { id: string; name: string }[];
}

export function InventoryTransferForm({ products, locations }: InventoryTransferFormProps) {
  const [state, formAction, pending] = useActionState(createInventoryTransfer, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [formKey, setFormKey] = useState(0);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message || 'Transfer completed');
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
      <h3 className="font-semibold">Inventory Transfer</h3>

      {showError && state?.message && !state?.success && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-md text-sm">
          {state.message}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="xfer-productId">Product</Label>
        <SearchableSelect
          key={`p-${formKey}`}
          id="xfer-productId"
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
        <Label htmlFor="xfer-fromLocationId">From Location</Label>
        <Select key={`f-${formKey}`} name="fromLocationId" required onValueChange={clearError}>
          <SelectTrigger id="xfer-fromLocationId" className="h-11">
            <SelectValue placeholder="Select source" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showError && state?.errors?.fromLocationId && (
          <p className="text-sm text-red-500">{state.errors.fromLocationId[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="xfer-toLocationId">To Location</Label>
        <Select key={`t-${formKey}`} name="toLocationId" required onValueChange={clearError}>
          <SelectTrigger id="xfer-toLocationId" className="h-11">
            <SelectValue placeholder="Select destination" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showError && state?.errors?.toLocationId && (
          <p className="text-sm text-red-500">{state.errors.toLocationId[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="xfer-quantity">Quantity</Label>
        <Input
          key={`q-${formKey}`}
          id="xfer-quantity"
          name="quantity"
          type="number"
          placeholder="e.g., 50"
          required
          min={1}
          className="h-11"
        />
        {showError && state?.errors?.quantity && (
          <p className="text-sm text-red-500">{state.errors.quantity[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="xfer-notes">Notes (Optional)</Label>
        <textarea
          key={`n-${formKey}`}
          id="xfer-notes"
          name="notes"
          rows={2}
          placeholder="Transfer details..."
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="w-full bg-caribbean-green hover:bg-caribbean-green/90 text-white"
      >
        {pending ? 'Transferring...' : 'Transfer Inventory'}
      </Button>
    </form>
  );
}
