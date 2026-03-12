'use client';

import { useActionState, useEffect, useRef, useState, useCallback } from 'react';
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
  // Key to force re-mount of Select components (which are uncontrolled)
  const [formKey, setFormKey] = useState(0);
  // Track form values for the success summary
  const formValuesRef = useRef({ productId: '', fromLocationId: '', toLocationId: '', quantity: '' });
  // Track whether success message should show (auto-dismiss on next interaction)
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (state?.success) {
      // Capture summary before reset
      const vals = formValuesRef.current;
      const product = products.find((p) => p.id === vals.productId);
      const fromLoc = locations.find((l) => l.id === vals.fromLocationId);
      const toLoc = locations.find((l) => l.id === vals.toLocationId);
      if (product && fromLoc && toLoc && vals.quantity) {
        setLastTransfer({
          quantity: vals.quantity,
          productName: `${product.name} (${product.sku})`,
          fromLocationName: fromLoc.name,
          toLocationName: toLoc.name,
        });
      }
      // Reset form: bump key to re-mount Selects, reset native inputs
      formRef.current?.reset();
      setFromLocationId('');
      formValuesRef.current = { productId: '', fromLocationId: '', toLocationId: '', quantity: '' };
      setFormKey((k) => k + 1);
      setShowSuccess(true);
    }
  }, [state, products, locations]);

  // Clear success message when user starts interacting with the form again
  const clearSuccess = useCallback(() => {
    if (showSuccess) setShowSuccess(false);
  }, [showSuccess]);

  // Filter destination locations to exclude the currently selected source
  const destinationLocations = locations.filter((loc) => loc.id !== fromLocationId);

  return (
    <form ref={formRef} action={formAction} className="space-y-5" onChange={clearSuccess}>
      {/* Error message — only show when there's a real error (not after success) */}
      {state?.message && !state.success && (
        <div className="rounded-md bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {state.message}
        </div>
      )}

      {/* Success summary — auto-clears on next interaction */}
      {showSuccess && lastTransfer && (
        <div className="rounded-md bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          Transferred {lastTransfer.quantity} units of {lastTransfer.productName} from{' '}
          {lastTransfer.fromLocationName} to {lastTransfer.toLocationName}.
        </div>
      )}

      {/* Product */}
      <div className="space-y-2">
        <Label htmlFor="tf-productId">Product *</Label>
        <Select
          key={`product-${formKey}`}
          name="productId"
          required
          onValueChange={(v) => {
            formValuesRef.current.productId = v;
            clearSuccess();
          }}
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
        {state?.errors?.productId && !state.success && (
          <p className="text-sm text-destructive">{state.errors.productId[0]}</p>
        )}
      </div>

      {/* From / To Location row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* From Location */}
        <div className="space-y-2">
          <Label htmlFor="tf-fromLocationId">From Location *</Label>
          <Select
            key={`from-${formKey}`}
            name="fromLocationId"
            required
            onValueChange={(v) => {
              setFromLocationId(v);
              formValuesRef.current.fromLocationId = v;
              clearSuccess();
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
          {state?.errors?.fromLocationId && !state.success && (
            <p className="text-sm text-destructive">{state.errors.fromLocationId[0]}</p>
          )}
        </div>

        {/* To Location */}
        <div className="space-y-2">
          <Label htmlFor="tf-toLocationId">To Location *</Label>
          <Select
            key={`to-${formKey}`}
            name="toLocationId"
            required
            onValueChange={(v) => {
              formValuesRef.current.toLocationId = v;
              clearSuccess();
            }}
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
          {state?.errors?.toLocationId && !state.success && (
            <p className="text-sm text-destructive">{state.errors.toLocationId[0]}</p>
          )}
        </div>
      </div>

      {/* Quantity */}
      <div className="space-y-2">
        <Label htmlFor="tf-quantity">Quantity *</Label>
        <Input
          key={`qty-${formKey}`}
          id="tf-quantity"
          name="quantity"
          type="number"
          inputMode="numeric"
          placeholder="e.g., 50"
          required
          min={1}
          className="text-base h-11"
          onChange={(e) => {
            formValuesRef.current.quantity = e.target.value;
            clearSuccess();
          }}
        />
        {state?.errors?.quantity && !state.success && (
          <p className="text-sm text-destructive">{state.errors.quantity[0]}</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="tf-notes">Notes (optional)</Label>
        <Textarea
          key={`notes-${formKey}`}
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
