'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';
import { uploadDocument } from '@/app/actions/documents';
import type { DocumentUploadFormState } from '@/lib/validators/documents';
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

const CATEGORY_LABELS: Record<string, string> = {
  AGREEMENT: 'Agreement',
  INVOICE: 'Invoice',
  CERTIFICATION: 'Certification',
  SOP: 'SOP',
  MARKETING: 'Marketing',
  OTHER: 'Other',
};

type Customer = { id: string; firstName: string; lastName: string };
type OperatorOrder = { id: string; orderNumber: string };
type Batch = { id: string; batchCode: string };

interface DocumentUploadFormProps {
  customers: Customer[];
  orders: OperatorOrder[];
  batches: Batch[];
}

const initialState: DocumentUploadFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-caribbean-green hover:bg-caribbean-green/90 text-white"
    >
      {pending ? 'Uploading...' : 'Upload Document'}
    </Button>
  );
}

export function DocumentUploadForm({ customers, orders, batches }: DocumentUploadFormProps) {
  const [state, formAction] = useActionState(uploadDocument, initialState);
  const [linkedTo, setLinkedTo] = useState<string>('none');
  const [linkedId, setLinkedId] = useState<string>('');
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? 'Document uploaded');
      setKey((k) => k + 1);
      setLinkedTo('none');
      setLinkedId('');
    } else if (state.message && !state.success && !state.errors) {
      toast.error(state.message);
    }
  }, [state]);

  const linkedToOptions = [
    { value: 'none', label: 'None' },
    { value: 'customer', label: 'Customer' },
    { value: 'order', label: 'Order' },
    { value: 'batch', label: 'Batch' },
  ];

  return (
    <form key={key} action={formAction} className="space-y-4">
      {/* File */}
      <div className="space-y-1.5">
        <Label htmlFor="file">File *</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.txt"
          required
        />
        <p className="text-xs text-muted-foreground">
          Accepted: PDF, DOC, DOCX, XLS, XLSX, CSV, JPG, PNG, TXT (max 10 MB)
        </p>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Document Name *</Label>
        <Input
          id="name"
          name="name"
          placeholder="e.g., Supplier Agreement 2026"
          required
        />
        {state.errors?.name && (
          <p className="text-sm text-destructive">{state.errors.name[0]}</p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label htmlFor="category">Category *</Label>
        <Select name="category" required>
          <SelectTrigger id="category">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.errors?.category && (
          <p className="text-sm text-destructive">{state.errors.category[0]}</p>
        )}
      </div>

      {/* Link To */}
      <div className="space-y-1.5">
        <Label htmlFor="linkedTo">Link To (optional)</Label>
        <Select
          name="linkedTo"
          value={linkedTo}
          onValueChange={(val) => {
            setLinkedTo(val);
            setLinkedId('');
          }}
        >
          <SelectTrigger id="linkedTo">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            {linkedToOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Linked Record Select — conditional */}
      {linkedTo === 'customer' && (
        <div className="space-y-1.5">
          <Label htmlFor="linkedId-customer">Customer</Label>
          <Select
            name="linkedId"
            value={linkedId}
            onValueChange={setLinkedId}
            required
          >
            <SelectTrigger id="linkedId-customer">
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {linkedTo === 'order' && (
        <div className="space-y-1.5">
          <Label htmlFor="linkedId-order">Order</Label>
          <Select
            name="linkedId"
            value={linkedId}
            onValueChange={setLinkedId}
            required
          >
            <SelectTrigger id="linkedId-order">
              <SelectValue placeholder="Select order" />
            </SelectTrigger>
            <SelectContent>
              {orders.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.orderNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {linkedTo === 'batch' && (
        <div className="space-y-1.5">
          <Label htmlFor="linkedId-batch">Batch</Label>
          <Select
            name="linkedId"
            value={linkedId}
            onValueChange={setLinkedId}
            required
          >
            <SelectTrigger id="linkedId-batch">
              <SelectValue placeholder="Select batch" />
            </SelectTrigger>
            <SelectContent>
              {batches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.batchCode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* None selected — no hidden input needed; server defaults to 'none' */}

      {state.message && !state.success && !state.errors && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}

      <SubmitButton />
    </form>
  );
}
