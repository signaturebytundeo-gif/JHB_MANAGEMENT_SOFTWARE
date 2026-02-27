'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { updateBatch } from '@/app/actions/production';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="bg-caribbean-green hover:bg-caribbean-green/90 text-white">
      {pending ? 'Saving...' : 'Save Changes'}
    </Button>
  );
}

interface EditBatchFormProps {
  batchId: string;
  totalUnits: number;
  notes: string | null;
  productionDate: Date;
}

export function EditBatchForm({ batchId, totalUnits, notes, productionDate }: EditBatchFormProps) {
  const [state, formAction] = useActionState(updateBatch, undefined);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message || 'Batch updated');
    }
  }, [state]);

  const dateValue = new Date(productionDate).toISOString().split('T')[0];

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="batchId" value={batchId} />

      {state?.message && !state?.success && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-md text-sm">
          {state.message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit-totalUnits">Total Units</Label>
          <Input
            id="edit-totalUnits"
            name="totalUnits"
            type="number"
            defaultValue={totalUnits}
            required
            className="h-11"
          />
          {state?.errors?.totalUnits && (
            <p className="text-sm text-red-500">{state.errors.totalUnits[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-productionDate">Production Date</Label>
          <Input
            id="edit-productionDate"
            name="productionDate"
            type="date"
            defaultValue={dateValue}
            required
            className="h-11"
          />
          {state?.errors?.productionDate && (
            <p className="text-sm text-red-500">{state.errors.productionDate[0]}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-notes">Notes</Label>
        <textarea
          id="edit-notes"
          name="notes"
          rows={3}
          defaultValue={notes || ''}
          placeholder="Optional notes..."
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
