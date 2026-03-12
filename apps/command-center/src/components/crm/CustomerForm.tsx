'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';
import { CustomerType } from '@prisma/client';
import { createCRMCustomer, updateCRMCustomer } from '@/app/actions/crm-customers';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FormState } from '@/lib/validators/crm-customers';

interface CustomerFormProps {
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    customerType: CustomerType;
    company: string | null;
    paymentTerms: string | null;
    creditLimit: number | null;
    billingAddress: string | null;
    shippingAddress: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    notes: string | null;
  };
  onClose?: () => void;
}

const CUSTOMER_TYPE_OPTIONS: { value: CustomerType; label: string }[] = [
  { value: 'RETAIL', label: 'Retail' },
  { value: 'WHOLESALE', label: 'Wholesale' },
  { value: 'DISTRIBUTOR', label: 'Distributor' },
  { value: 'RESTAURANT', label: 'Restaurant' },
  { value: 'SUBSCRIPTION', label: 'Subscription' },
  { value: 'EVENT', label: 'Event' },
];

const PAYMENT_TERMS_OPTIONS = [
  { value: 'net_30', label: 'Net 30' },
  { value: 'net_15', label: 'Net 15' },
  { value: 'cash', label: 'Cash' },
];

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 px-6 rounded-md bg-caribbean-green text-white text-sm font-medium hover:bg-caribbean-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Customer')}
    </button>
  );
}

const initialState: FormState = {};

export function CustomerForm({ customer, onClose }: CustomerFormProps) {
  const isEdit = !!customer;
  const action = isEdit ? updateCRMCustomer : createCRMCustomer;

  const [state, formAction] = useActionState<FormState, FormData>(action, initialState);

  useEffect(() => {
    if (state?.success) {
      toast.success(isEdit ? 'Customer updated successfully' : 'Customer created successfully');
      onClose?.();
    }
  }, [state?.success, isEdit, onClose]);

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={customer.id} />}

      {state?.message && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {state.message}
        </div>
      )}

      {/* Name Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            name="firstName"
            defaultValue={customer?.firstName ?? ''}
            placeholder="Jane"
            className="text-base"
          />
          {state?.errors?.firstName && (
            <p className="text-xs text-destructive">{state.errors.firstName[0]}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            name="lastName"
            defaultValue={customer?.lastName ?? ''}
            placeholder="Smith"
            className="text-base"
          />
          {state?.errors?.lastName && (
            <p className="text-xs text-destructive">{state.errors.lastName[0]}</p>
          )}
        </div>
      </div>

      {/* Email + Phone */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={customer?.email ?? ''}
            placeholder="jane@example.com"
            className="text-base"
          />
          {state?.errors?.email && (
            <p className="text-xs text-destructive">{state.errors.email[0]}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={customer?.phone ?? ''}
            placeholder="(305) 555-0100"
            className="text-base"
          />
        </div>
      </div>

      {/* Customer Type + Company */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="customerType">Customer Type *</Label>
          <Select name="customerType" defaultValue={customer?.customerType ?? 'RETAIL'}>
            <SelectTrigger id="customerType">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {CUSTOMER_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state?.errors?.customerType && (
            <p className="text-xs text-destructive">{state.errors.customerType[0]}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            name="company"
            defaultValue={customer?.company ?? ''}
            placeholder="Acme Corp"
            className="text-base"
          />
        </div>
      </div>

      {/* Payment Terms + Credit Limit */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="paymentTerms">Payment Terms</Label>
          <Select name="paymentTerms" defaultValue={customer?.paymentTerms ?? ''}>
            <SelectTrigger id="paymentTerms">
              <SelectValue placeholder="Select terms" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_TERMS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="creditLimit">Credit Limit ($)</Label>
          <Input
            id="creditLimit"
            name="creditLimit"
            type="number"
            min="0"
            step="0.01"
            defaultValue={customer?.creditLimit != null ? String(customer.creditLimit) : ''}
            placeholder="0.00"
            className="text-base"
          />
        </div>
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="billingAddress">Billing Address</Label>
          <Input
            id="billingAddress"
            name="billingAddress"
            defaultValue={customer?.billingAddress ?? ''}
            placeholder="123 Main St"
            className="text-base"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shippingAddress">Shipping Address</Label>
          <Input
            id="shippingAddress"
            name="shippingAddress"
            defaultValue={customer?.shippingAddress ?? ''}
            placeholder="123 Main St"
            className="text-base"
          />
        </div>
      </div>

      {/* City / State / Zip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            name="city"
            defaultValue={customer?.city ?? ''}
            placeholder="Miami"
            className="text-base"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            name="state"
            defaultValue={customer?.state ?? ''}
            placeholder="FL"
            maxLength={2}
            className="text-base"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="zip">ZIP Code</Label>
          <Input
            id="zip"
            name="zip"
            defaultValue={customer?.zip ?? ''}
            placeholder="33101"
            className="text-base"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={customer?.notes ?? ''}
          placeholder="Any additional notes..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        )}
        <SubmitButton isEdit={isEdit} />
      </div>
    </form>
  );
}
