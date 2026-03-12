'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';
import { createSubscriptionMember } from '@/app/actions/crm-subscriptions';
import type { SubscriptionMemberFormState } from '@/app/actions/crm-subscriptions';
import { X } from 'lucide-react';

interface SubscriptionMemberFormProps {
  customers: { id: string; firstName: string; lastName: string }[];
  plans: { id: string; name: string; billingCycle: string; price: number }[];
  onClose: () => void;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-caribbean-green text-white rounded-md text-sm font-medium hover:bg-caribbean-green/90 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? 'Creating...' : 'Create Subscription'}
    </button>
  );
}

const initialState: SubscriptionMemberFormState = {};

export function SubscriptionMemberForm({ customers, plans, onClose }: SubscriptionMemberFormProps) {
  const [state, formAction] = useActionState(createSubscriptionMember, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success('Subscription member created successfully.');
      onClose();
    }
  }, [state.success, onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-foreground">Add Subscription Member</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form action={formAction} className="p-6 space-y-4">
          {state.message && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {state.message}
            </div>
          )}

          {/* Customer */}
          <div className="space-y-1">
            <label htmlFor="customerId" className="text-sm font-medium text-foreground">
              Customer <span className="text-destructive">*</span>
            </label>
            <select
              id="customerId"
              name="customerId"
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            >
              <option value="">Select a customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
            {state.errors?.customerId && (
              <p className="text-xs text-destructive">{state.errors.customerId[0]}</p>
            )}
          </div>

          {/* Plan */}
          <div className="space-y-1">
            <label htmlFor="planId" className="text-sm font-medium text-foreground">
              Subscription Plan <span className="text-destructive">*</span>
            </label>
            <select
              id="planId"
              name="planId"
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            >
              <option value="">Select a plan...</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ${p.price.toFixed(2)} / {p.billingCycle}
                </option>
              ))}
            </select>
            {state.errors?.planId && (
              <p className="text-xs text-destructive">{state.errors.planId[0]}</p>
            )}
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label htmlFor="startDate" className="text-sm font-medium text-foreground">
              Start Date <span className="text-destructive">*</span>
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ fontSize: '16px' }}
              required
            />
            {state.errors?.startDate && (
              <p className="text-xs text-destructive">{state.errors.startDate[0]}</p>
            )}
          </div>

          {/* Renewal Date */}
          <div className="space-y-1">
            <label htmlFor="renewalDate" className="text-sm font-medium text-foreground">
              Renewal Date <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <input
              id="renewalDate"
              name="renewalDate"
              type="date"
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label htmlFor="notes" className="text-sm font-medium text-foreground">
              Notes <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Add any notes about this subscription..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-input rounded-md text-sm font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  );
}
