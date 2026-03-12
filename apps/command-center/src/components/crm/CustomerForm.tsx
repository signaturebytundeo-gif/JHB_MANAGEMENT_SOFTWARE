'use client';

// Stub — full implementation in Task 2
import type { CustomerType } from '@prisma/client';

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

export function CustomerForm({ customer: _customer, onClose: _onClose }: CustomerFormProps) {
  return <div>Loading form...</div>;
}
