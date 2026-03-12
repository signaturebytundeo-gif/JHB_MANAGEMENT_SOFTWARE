'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  createDistributorAgreement,
  updateDistributorAgreement,
} from '@/app/actions/crm-distributors';
import type { DistributorAgreementFormState } from '@/app/actions/crm-distributors';
import { X } from 'lucide-react';

interface DistributorAgreement {
  id: string;
  customerId: string;
  territory: string;
  commissionRate: number;
  startDate: Date;
  endDate: Date | null;
  status: string;
  notes: string | null;
}

interface DistributorFormProps {
  customers: { id: string; firstName: string; lastName: string; company: string | null }[];
  agreement?: DistributorAgreement;
  onClose: () => void;
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-caribbean-green text-white rounded-md text-sm font-medium hover:bg-caribbean-green/90 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending
        ? isEdit
          ? 'Updating...'
          : 'Creating...'
        : isEdit
          ? 'Update Agreement'
          : 'Create Agreement'}
    </button>
  );
}

const initialState: DistributorAgreementFormState = {};

export function DistributorForm({ customers, agreement, onClose }: DistributorFormProps) {
  const isEdit = !!agreement;
  const action = isEdit ? updateDistributorAgreement : createDistributorAgreement;
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(
        isEdit ? 'Distributor agreement updated successfully.' : 'Distributor agreement created successfully.'
      );
      onClose();
    }
  }, [state.success, isEdit, onClose]);

  const formatDateValue = (date: Date | null | undefined) => {
    if (!date) return '';
    return format(date, 'yyyy-MM-dd');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? 'Edit Distributor Agreement' : 'New Distributor Agreement'}
          </h2>
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

          {/* Hidden id in edit mode */}
          {isEdit && <input type="hidden" name="id" value={agreement.id} />}

          {/* Customer (only for create) */}
          {!isEdit && (
            <div className="space-y-1">
              <label htmlFor="customerId" className="text-sm font-medium text-foreground">
                Distributor Customer <span className="text-destructive">*</span>
              </label>
              <select
                id="customerId"
                name="customerId"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                <option value="">Select a distributor...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                    {c.company ? ` — ${c.company}` : ''}
                  </option>
                ))}
              </select>
              {state.errors?.customerId && (
                <p className="text-xs text-destructive">{state.errors.customerId[0]}</p>
              )}
            </div>
          )}

          {/* Territory */}
          <div className="space-y-1">
            <label htmlFor="territory" className="text-sm font-medium text-foreground">
              Territory <span className="text-destructive">*</span>
            </label>
            <input
              id="territory"
              name="territory"
              type="text"
              defaultValue={agreement?.territory ?? ''}
              placeholder="e.g., South Florida, Northeast US"
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ fontSize: '16px' }}
              required={!isEdit}
            />
            {state.errors?.territory && (
              <p className="text-xs text-destructive">{state.errors.territory[0]}</p>
            )}
          </div>

          {/* Commission Rate */}
          <div className="space-y-1">
            <label htmlFor="commissionRate" className="text-sm font-medium text-foreground">
              Commission Rate (%) <span className="text-destructive">*</span>
            </label>
            <input
              id="commissionRate"
              name="commissionRate"
              type="number"
              min="0"
              max="100"
              step="0.1"
              defaultValue={agreement?.commissionRate ?? ''}
              placeholder="e.g., 10"
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ fontSize: '16px' }}
              required={!isEdit}
            />
            {state.errors?.commissionRate && (
              <p className="text-xs text-destructive">{state.errors.commissionRate[0]}</p>
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
              defaultValue={formatDateValue(agreement?.startDate)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ fontSize: '16px' }}
              required={!isEdit}
            />
            {state.errors?.startDate && (
              <p className="text-xs text-destructive">{state.errors.startDate[0]}</p>
            )}
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label htmlFor="endDate" className="text-sm font-medium text-foreground">
              End Date <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              defaultValue={formatDateValue(agreement?.endDate)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Status (edit mode only) */}
          {isEdit && (
            <div className="space-y-1">
              <label htmlFor="status" className="text-sm font-medium text-foreground">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={agreement.status}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1">
            <label htmlFor="notes" className="text-sm font-medium text-foreground">
              Notes <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={agreement?.notes ?? ''}
              placeholder="Add any notes about this agreement..."
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
            <SubmitButton isEdit={isEdit} />
          </div>
        </form>
      </div>
    </div>
  );
}
