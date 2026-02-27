'use client';

import { useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { deleteBatch } from '@/app/actions/production';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending} className="w-full">
      {pending ? 'Deleting...' : 'Confirm Delete'}
    </Button>
  );
}

interface DeleteBatchButtonProps {
  batchId: string;
}

export function DeleteBatchButton({ batchId }: DeleteBatchButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [state, formAction] = useActionState(deleteBatch, undefined);

  if (!showConfirm) {
    return (
      <Button
        variant="outline"
        className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
        onClick={() => setShowConfirm(true)}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete Batch
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50">
      <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-3">
        Are you sure you want to delete this batch? This action will soft-delete the batch record.
      </p>

      {state?.message && !state?.success && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-3 py-2 rounded-md text-sm mb-3">
          {state.message}
        </div>
      )}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="batchId" value={batchId} />

        <div className="space-y-2">
          <Label htmlFor="reason" className="text-red-800 dark:text-red-300">
            Reason for deletion
          </Label>
          <Input
            id="reason"
            name="reason"
            placeholder="e.g., Duplicate entry, data error..."
            required
            className="border-red-200 dark:border-red-800"
          />
          {state?.errors?.reason && (
            <p className="text-sm text-red-500">{state.errors.reason[0]}</p>
          )}
        </div>

        <div className="flex gap-2">
          <ConfirmButton />
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowConfirm(false)}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
