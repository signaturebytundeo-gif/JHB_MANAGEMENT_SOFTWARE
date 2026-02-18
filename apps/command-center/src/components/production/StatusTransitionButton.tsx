'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { updateBatchStatus } from '@/app/actions/production';
import { Button } from '@/components/ui/button';

interface StatusTransitionButtonProps {
  batchId: string;
  nextStatus: string;
  label: string;
  variant?: 'default' | 'destructive';
}

function SubmitButton({
  label,
  variant,
}: {
  label: string;
  variant?: 'default' | 'destructive';
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant}>
      {pending ? 'Updating...' : label}
    </Button>
  );
}

export function StatusTransitionButton({
  batchId,
  nextStatus,
  label,
  variant = 'default',
}: StatusTransitionButtonProps) {
  const [state, action] = useActionState(updateBatchStatus, undefined);

  return (
    <div className="space-y-2">
      <form action={action}>
        <input type="hidden" name="batchId" value={batchId} />
        <input type="hidden" name="status" value={nextStatus} />
        <SubmitButton label={label} variant={variant} />
      </form>
      {state?.message && (
        <div
          className={`text-sm ${state.success ? 'text-green-600' : 'text-red-600'}`}
        >
          {state.message}
        </div>
      )}
    </div>
  );
}
