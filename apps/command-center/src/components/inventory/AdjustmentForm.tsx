'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createAdjustment } from '@/app/actions/inventory';
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

const ADJUSTMENT_REASONS = [
  { value: 'DAMAGE', label: 'Damage' },
  { value: 'SHRINKAGE', label: 'Shrinkage' },
  { value: 'SAMPLING', label: 'Sampling' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'COUNT_CORRECTION', label: 'Count Correction' },
] as const;

interface AdjustmentFormProps {
  batches: Array<{ id: string; batchCode: string; productName: string }>;
  locations: Array<{ id: string; name: string }>;
}

export function AdjustmentForm({ batches, locations }: AdjustmentFormProps) {
  const [state, formAction, pending] = useActionState(createAdjustment, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success && !state.message?.includes('approval')) {
      // Auto-approved: reset form
      formRef.current?.reset();
    }
    // Pending approval: keep form data visible so user knows what was submitted
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      {/* Status messages */}
      {state?.message && !state.errors && (
        <div
          className={`rounded-md px-4 py-3 text-sm border ${
            state.success && state.message.includes('approval')
              ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400'
              : state.success
              ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
          }`}
        >
          {state.message}
        </div>
      )}

      {/* Batch */}
      <div className="space-y-2">
        <Label htmlFor="adj-batchId">Batch *</Label>
        <Select name="batchId" required>
          <SelectTrigger id="adj-batchId" className="text-base h-11">
            <SelectValue placeholder="Select batch" />
          </SelectTrigger>
          <SelectContent>
            {batches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.batchCode} — {b.productName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state?.errors?.batchId && (
          <p className="text-sm text-destructive">{state.errors.batchId[0]}</p>
        )}
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="adj-locationId">Location *</Label>
        <Select name="locationId" required>
          <SelectTrigger id="adj-locationId" className="text-base h-11">
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
          <p className="text-sm text-destructive">{state.errors.locationId[0]}</p>
        )}
      </div>

      {/* Quantity Change */}
      <div className="space-y-2">
        <Label htmlFor="adj-quantityChange">
          Quantity Change * <span className="text-muted-foreground font-normal">(positive = add, negative = remove)</span>
        </Label>
        <Input
          id="adj-quantityChange"
          name="quantityChange"
          type="number"
          inputMode="numeric"
          placeholder="e.g., -5 or 10"
          required
          className="text-base h-11"
          disabled={pending}
        />
        {state?.errors?.quantityChange && (
          <p className="text-sm text-destructive">{state.errors.quantityChange[0]}</p>
        )}
      </div>

      {/* Reason */}
      <div className="space-y-2">
        <Label htmlFor="adj-reason">Reason *</Label>
        <Select name="reason" required>
          <SelectTrigger id="adj-reason" className="text-base h-11">
            <SelectValue placeholder="Select reason" />
          </SelectTrigger>
          <SelectContent>
            {ADJUSTMENT_REASONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state?.errors?.reason && (
          <p className="text-sm text-destructive">{state.errors.reason[0]}</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="adj-notes">Notes (optional)</Label>
        <Textarea
          id="adj-notes"
          name="notes"
          rows={2}
          placeholder="Additional details..."
          className="text-base resize-none"
          disabled={pending}
        />
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="w-full h-11 bg-caribbean-green hover:bg-caribbean-green/90 text-white"
      >
        {pending ? 'Submitting...' : 'Submit Adjustment'}
      </Button>
    </form>
  );
}
