'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { transferInventory } from '@/app/actions/inventory';
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
import { Textarea } from '@/components/ui/textarea';

interface TransferFormProps {
  products: Array<{ id: string; name: string; sku: string; size: string }>;
  locations: Array<{ id: string; name: string }>;
}

interface LastTransfer {
  quantity: string;
  productName: string;
  fromLocationName: string;
  toLocationName: string;
}

export function TransferForm({ products, locations }: TransferFormProps) {
  const [state, formAction, pending] = useActionState(transferInventory, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [fromLocationId, setFromLocationId] = useState('');
  const [lastTransfer, setLastTransfer] = useState<LastTransfer | null>(null);
  const [formValues, setFormValues] = useState<{
    productId: string;
    fromLocationId: string;
    toLocationId: string;
    quantity: string;
  }>({ productId: '', fromLocationId: '', toLocationId: '', quantity: '' });

  useEffect(() => {
    if (state?.success) {
      // Capture summary before reset
      const product = products.find((p) => p.id === formValues.productId);
      const fromLoc = locations.find((l) => l.id === formValues.fromLocationId);
      const toLoc = locations.find((l) => l.id === formValues.toLocationId);
      if (product && fromLoc && toLoc && formValues.quantity) {
        setLastTransfer({
          quantity: formValues.quantity,
          productName: `${product.name} (${product.sku})`,
          fromLocationName: fromLoc.name,
          toLocationName: toLoc.name,
        });
      }
      formRef.current?.reset();
      setFromLocationId('');
      setFormValues({ productId: '', fromLocationId: '', toLocationId: '', quantity: '' });
    }
  }, [state, products, locations, formValues]);

  // Filter destination locations to exclude the currently selected source
  const destinationLocations = locations.filter((loc) => loc.id !== fromLocationId);

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      {/* Error message */}
      {state?.message && !state.success && (
        <div className="rounded-md bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {state.message}
        </div>
      )}

      {/* Success summary */}
      {state?.success && lastTransfer && (
        <div className="rounded-md bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          Transferred {lastTransfer.quantity} units of {lastTransfer.productName} from{' '}
          {lastTransfer.fromLocationName} to {lastTransfer.toLocationName}.
        </div>
      )}

      {/* Product */}
      <div className="space-y-2">
        <Label htmlFor="tf-productId">Product *</Label>
        <Select
          name="productId"
          required
          onValueChange={(v) => setFormValues((prev) => ({ ...prev, productId: v }))}
        >
          <SelectTrigger id="tf-productId" className="text-base h-11">
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
          <p className="text-sm text-destructive">{state.errors.productId[0]}</p>
        )}
      </div>

      {/* From / To Location row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* From Location */}
        <div className="space-y-2">
          <Label htmlFor="tf-fromLocationId">From Location *</Label>
          <Select
            name="fromLocationId"
            required
            onValueChange={(v) => {
              setFromLocationId(v);
              setFormValues((prev) => ({ ...prev, fromLocationId: v }));
            }}
          >
            <SelectTrigger id="tf-fromLocationId" className="text-base h-11">
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
          {state?.errors?.fromLocationId && (
            <p className="text-sm text-destructive">{state.errors.fromLocationId[0]}</p>
          )}
        </div>

        {/* To Location */}
        <div className="space-y-2">
          <Label htmlFor="tf-toLocationId">To Location *</Label>
          <Select
            name="toLocationId"
            required
            onValueChange={(v) => setFormValues((prev) => ({ ...prev, toLocationId: v }))}
          >
            <SelectTrigger id="tf-toLocationId" className="text-base h-11">
              <SelectValue placeholder="Select destination" />
            </SelectTrigger>
            <SelectContent>
              {destinationLocations.length > 0 ? (
                destinationLocations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="_none" disabled>
                  Select a source location first
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {state?.errors?.toLocationId && (
            <p className="text-sm text-destructive">{state.errors.toLocationId[0]}</p>
          )}
        </div>
      </div>

      {/* Quantity */}
      <div className="space-y-2">
        <Label htmlFor="tf-quantity">Quantity *</Label>
        <Input
          id="tf-quantity"
          name="quantity"
          type="number"
          inputMode="numeric"
          placeholder="e.g., 50"
          required
          min={1}
          className="text-base h-11"
          onChange={(e) => setFormValues((prev) => ({ ...prev, quantity: e.target.value }))}
        />
        {state?.errors?.quantity && (
          <p className="text-sm text-destructive">{state.errors.quantity[0]}</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="tf-notes">Notes (optional)</Label>
        <Textarea
          id="tf-notes"
          name="notes"
          rows={2}
          placeholder="Reason for transfer..."
          className="text-base resize-none"
          disabled={pending}
        />
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="w-full h-11 bg-caribbean-green hover:bg-caribbean-green/90 text-white"
      >
        {pending ? 'Transferring...' : 'Transfer Inventory'}
      </Button>
    </form>
  );
}
