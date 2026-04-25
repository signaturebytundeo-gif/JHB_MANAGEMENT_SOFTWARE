'use client';

import { useActionState, useEffect, useRef, useState, useCallback, useTransition } from 'react';
import { transferInventory, recordRestaurantConsumption } from '@/app/actions/inventory';
import { addLocationQuick, getActiveLocations } from '@/app/actions/locations';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface TransferFormProps {
  products: Array<{ id: string; name: string; sku: string; size: string }>;
  locations: Array<{ id: string; name: string; type?: string }>;
}

interface LastTransfer {
  quantity: string;
  productName: string;
  fromLocationName: string;
  toLocationName: string;
  toLocationType?: string;
  toLocationId: string;
  productId: string;
}

interface ConsumptionDialogProps {
  open: boolean;
  onClose: () => void;
  transfer: LastTransfer;
  onConsumptionRecorded: () => void;
}

const LOCATION_TYPE_OPTIONS = [
  { value: 'WAREHOUSE', label: 'Warehouse' },
  { value: 'MARKET', label: 'Farmers Market' },
  { value: 'RESTAURANT', label: 'Restaurant' },
  { value: 'DIRECT_SHIP', label: 'Direct Ship / Person' },
  { value: 'EVENT', label: 'Event' },
  { value: 'FULFILLMENT', label: 'Fulfillment Center' },
  { value: 'OTHER', label: 'Other' },
] as const;

const ADD_NEW_VALUE = '__add_new__';

/* ------------------------------------------------------------------ */
/* Inline Add-Location Mini-Form                                       */
/* ------------------------------------------------------------------ */

function AddLocationInline({
  onSave,
  onCancel,
}: {
  onSave: (loc: { id: string; name: string; type: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState('WAREHOUSE');
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    setError('');
    startSaving(async () => {
      try {
        const loc = await addLocationQuick(trimmed, type);
        toast.success('Location added ✓');
        onSave(loc);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to save');
      }
    });
  }

  return (
    <div className="rounded-md border border-border bg-card p-3 space-y-3">
      <p className="text-sm font-medium text-foreground">New Location</p>

      {/* Name */}
      <Input
        ref={nameRef}
        placeholder="Location name (e.g., Anthony - Atlanta)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="text-sm h-9"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
          }
        }}
      />

      {/* Type */}
      <Select value={type} onValueChange={setType}>
        <SelectTrigger className="text-sm h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LOCATION_TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={saving}
          onClick={handleSave}
          className="bg-caribbean-green hover:bg-caribbean-green/90 text-white text-xs h-8"
        >
          {saving ? 'Saving...' : 'Save & Select'}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Location Select with inline add                                     */
/* ------------------------------------------------------------------ */

function LocationSelect({
  id,
  name,
  label,
  placeholder,
  locations,
  excludeId,
  formKey,
  error,
  onValueChange,
  onLocationAdded,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  locations: Array<{ id: string; name: string; type?: string }>;
  excludeId?: string;
  formKey: number;
  error?: string;
  onValueChange: (v: string) => void;
  onLocationAdded: (loc: { id: string; name: string; type: string }) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedValue, setSelectedValue] = useState('');

  const filtered = excludeId ? locations.filter((l) => l.id !== excludeId) : locations;
  const noLocations = filtered.length === 0 && !!excludeId;

  function handleChange(v: string) {
    if (v === ADD_NEW_VALUE) {
      setShowAdd(true);
      return;
    }
    setSelectedValue(v);
    onValueChange(v);
  }

  function handleLocationSaved(loc: { id: string; name: string; type: string }) {
    setShowAdd(false);
    setSelectedValue(loc.id);
    onValueChange(loc.id);
    onLocationAdded(loc);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>

      {showAdd ? (
        <AddLocationInline
          onSave={handleLocationSaved}
          onCancel={() => setShowAdd(false)}
        />
      ) : (
        <>
          <Select
            key={`${name}-${formKey}`}
            name={name}
            required
            value={selectedValue || undefined}
            onValueChange={handleChange}
          >
            <SelectTrigger id={id} className="text-base h-11">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {noLocations ? (
                <SelectItem value="_none" disabled>
                  Select a source location first
                </SelectItem>
              ) : (
                filtered.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))
              )}
              {/* Separator + Add New */}
              <div className="border-t border-border my-1" />
              <SelectItem
                value={ADD_NEW_VALUE}
                className="text-caribbean-green font-medium"
              >
                + Add New Location
              </SelectItem>
            </SelectContent>
          </Select>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Restaurant Consumption Dialog                                       */
/* ------------------------------------------------------------------ */

function RestaurantConsumptionDialog({ open, onClose, transfer, onConsumptionRecorded }: ConsumptionDialogProps) {
  const [processing, startProcessing] = useTransition();
  const [showPartialInput, setShowPartialInput] = useState(false);
  const [quantityRemaining, setQuantityRemaining] = useState('');

  function handleResponse(type: 'sold_through' | 'no_consumption' | 'partial') {
    if (type === 'partial') {
      setShowPartialInput(true);
      return;
    }

    startProcessing(async () => {
      try {
        if (type === 'sold_through') {
          const result = await recordRestaurantConsumption(
            transfer.productId,
            transfer.toLocationId,
            'SOLD_THROUGH'
          );
          if (result.success) {
            toast.success('Consumption recorded: All previous stock sold through');
            onConsumptionRecorded();
          } else {
            toast.error(result.message || 'Failed to record consumption');
          }
        }
        // For 'no_consumption', we just close the dialog
        onClose();
      } catch (error) {
        toast.error('Failed to record consumption');
      }
    });
  }

  function handlePartialSubmit() {
    const remaining = parseInt(quantityRemaining);
    if (isNaN(remaining) || remaining < 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    startProcessing(async () => {
      try {
        const result = await recordRestaurantConsumption(
          transfer.productId,
          transfer.toLocationId,
          'PARTIAL_SOLD',
          remaining
        );
        if (result.success) {
          toast.success(`Consumption recorded: ${remaining} units remaining`);
          onConsumptionRecorded();
        } else {
          toast.error(result.message || 'Failed to record consumption');
        }
        onClose();
      } catch (error) {
        toast.error('Failed to record consumption');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Restaurant Stock Consumption</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You just restocked <strong>{transfer.productName}</strong> at{' '}
            <strong>{transfer.toLocationName}</strong>.
          </p>

          <p className="text-sm font-medium">
            Did the previous stock at this location sell through before this restock?
          </p>

          {!showPartialInput ? (
            <div className="space-y-3">
              <Button
                onClick={() => handleResponse('sold_through')}
                disabled={processing}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Yes - All Previous Stock Sold
              </Button>

              <Button
                onClick={() => handleResponse('partial')}
                disabled={processing}
                variant="outline"
                className="w-full"
              >
                Partially - Some Stock Remaining
              </Button>

              <Button
                onClick={() => handleResponse('no_consumption')}
                disabled={processing}
                variant="outline"
                className="w-full"
              >
                No - Previous Stock Still There
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="quantity-remaining">Quantity still remaining from previous stock:</Label>
                <Input
                  id="quantity-remaining"
                  type="number"
                  min="0"
                  value={quantityRemaining}
                  onChange={(e) => setQuantityRemaining(e.target.value)}
                  placeholder="Enter units remaining"
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handlePartialSubmit}
                  disabled={processing || !quantityRemaining}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {processing ? 'Recording...' : 'Record Consumption'}
                </Button>

                <Button
                  onClick={() => setShowPartialInput(false)}
                  disabled={processing}
                  variant="outline"
                >
                  Back
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Main TransferForm                                                   */
/* ------------------------------------------------------------------ */

export function TransferForm({ products, locations: initialLocations }: TransferFormProps) {
  const [state, formAction, pending] = useActionState(transferInventory, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [fromLocationId, setFromLocationId] = useState('');
  const [lastTransfer, setLastTransfer] = useState<LastTransfer | null>(null);
  const [formKey, setFormKey] = useState(0);
  const formValuesRef = useRef({ productId: '', fromLocationId: '', toLocationId: '', quantity: '' });
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConsumptionDialog, setShowConsumptionDialog] = useState(false);

  // Client-side locations list so new additions show immediately
  const [locations, setLocations] = useState(initialLocations);

  // Sync if server re-renders with different initial data
  useEffect(() => {
    setLocations(initialLocations);
  }, [initialLocations]);

  function handleLocationAdded(loc: { id: string; name: string; type: string }) {
    setLocations((prev) => {
      if (prev.some((l) => l.id === loc.id)) return prev;
      return [...prev, loc].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  useEffect(() => {
    if (state?.success) {
      const vals = formValuesRef.current;
      const product = products.find((p) => p.id === vals.productId);
      const fromLoc = locations.find((l) => l.id === vals.fromLocationId);
      const toLoc = locations.find((l) => l.id === vals.toLocationId);
      if (product && fromLoc && toLoc && vals.quantity) {
        const transferData = {
          quantity: vals.quantity,
          productName: `${product.name} (${product.sku})`,
          fromLocationName: fromLoc.name,
          toLocationName: toLoc.name,
          toLocationType: toLoc.type,
          toLocationId: toLoc.id,
          productId: product.id,
        };
        setLastTransfer(transferData);

        // Reset form
        formRef.current?.reset();
        setFromLocationId('');
        formValuesRef.current = { productId: '', fromLocationId: '', toLocationId: '', quantity: '' };
        setFormKey((k) => k + 1);

        // Check if destination is a restaurant - if so, show consumption dialog instead of success message
        if (toLoc.type === 'RESTAURANT') {
          setShowConsumptionDialog(true);
        } else {
          setShowSuccess(true);
        }
      }
    }
  }, [state, products, locations]);

  const clearSuccess = useCallback(() => {
    if (showSuccess) setShowSuccess(false);
  }, [showSuccess]);

  return (
    <>
      <form ref={formRef} action={formAction} className="space-y-5" onChange={clearSuccess}>
        {/* Error message */}
        {state?.message && !state.success && (
          <div className="rounded-md bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {state.message}
          </div>
        )}

        {/* Success summary */}
        {showSuccess && lastTransfer && (
          <div className="rounded-md bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-700 dark:text-green-400">
            Transferred {lastTransfer.quantity} units of {lastTransfer.productName} from{' '}
            {lastTransfer.fromLocationName} to {lastTransfer.toLocationName}.
          </div>
        )}

      {/* Product */}
      <div className="space-y-2">
        <Label htmlFor="tf-productId">Product *</Label>
        <SearchableSelect
          key={`product-${formKey}`}
          id="tf-productId"
          name="productId"
          value={undefined}
          onValueChange={(v) => {
            formValuesRef.current.productId = v;
            clearSuccess();
          }}
          placeholder="Select product"
          searchPlaceholder="Search catalog..."
          emptyMessage="No products found"
          options={products.map(p => ({
            value: p.id,
            label: `${p.name} (${p.sku}) — ${p.size}`,
            keywords: [p.sku, p.size].filter(Boolean) as string[],
          }))}
          className="text-base h-11"
        />
        {state?.errors?.productId && !state.success && (
          <p className="text-sm text-destructive">{state.errors.productId[0]}</p>
        )}
      </div>

      {/* From / To Location row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LocationSelect
          id="tf-fromLocationId"
          name="fromLocationId"
          label="From Location *"
          placeholder="Select source"
          locations={locations}
          formKey={formKey}
          error={state?.errors?.fromLocationId && !state.success ? state.errors.fromLocationId[0] : undefined}
          onValueChange={(v) => {
            setFromLocationId(v);
            formValuesRef.current.fromLocationId = v;
            clearSuccess();
          }}
          onLocationAdded={handleLocationAdded}
        />

        <LocationSelect
          id="tf-toLocationId"
          name="toLocationId"
          label="To Location *"
          placeholder="Select destination"
          locations={locations}
          excludeId={fromLocationId}
          formKey={formKey}
          error={state?.errors?.toLocationId && !state.success ? state.errors.toLocationId[0] : undefined}
          onValueChange={(v) => {
            formValuesRef.current.toLocationId = v;
            clearSuccess();
          }}
          onLocationAdded={handleLocationAdded}
        />
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

      {/* Restaurant Consumption Dialog */}
      {showConsumptionDialog && lastTransfer && (
        <RestaurantConsumptionDialog
          open={showConsumptionDialog}
          onClose={() => setShowConsumptionDialog(false)}
          transfer={lastTransfer}
          onConsumptionRecorded={() => {
            setShowConsumptionDialog(false);
            setShowSuccess(true); // Show success message after consumption is recorded
          }}
        />
      )}
    </>
  );
}
