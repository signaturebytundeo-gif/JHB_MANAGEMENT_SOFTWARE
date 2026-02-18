'use client';

import { useActionState, useEffect } from 'react';
import { createRawMaterial } from '@/app/actions/raw-materials';
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
import { toast } from 'sonner';

export function RawMaterialForm() {
  const [state, formAction, pending] = useActionState(createRawMaterial, undefined);

  // Show success/error toasts
  useEffect(() => {
    if (state?.success) {
      toast.success(state.message);
      // Reset form on success
      const form = document.getElementById('raw-material-form') as HTMLFormElement;
      if (form) {
        form.reset();
      }
    } else if (state?.message) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form id="raw-material-form" action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Material Name *</Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Habanero Peppers"
            disabled={pending}
            required
            className="text-base h-11"
          />
          {state?.errors?.name && (
            <p className="text-sm text-destructive">{state.errors.name[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplier">Supplier *</Label>
          <Input
            id="supplier"
            name="supplier"
            type="text"
            placeholder="Local Farms Co."
            disabled={pending}
            required
            className="text-base h-11"
          />
          {state?.errors?.supplier && (
            <p className="text-sm text-destructive">{state.errors.supplier[0]}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="lotNumber">Lot Number *</Label>
          <Input
            id="lotNumber"
            name="lotNumber"
            type="text"
            placeholder="LOT-2024-001"
            disabled={pending}
            required
            className="text-base h-11"
          />
          {state?.errors?.lotNumber && (
            <p className="text-sm text-destructive">{state.errors.lotNumber[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="receivedDate">Received Date *</Label>
          <Input
            id="receivedDate"
            name="receivedDate"
            type="date"
            disabled={pending}
            required
            className="text-base h-11"
          />
          {state?.errors?.receivedDate && (
            <p className="text-sm text-destructive">{state.errors.receivedDate[0]}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expirationDate">Expiration Date *</Label>
          <Input
            id="expirationDate"
            name="expirationDate"
            type="date"
            disabled={pending}
            required
            className="text-base h-11"
          />
          {state?.errors?.expirationDate && (
            <p className="text-sm text-destructive">{state.errors.expirationDate[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="100"
            disabled={pending}
            required
            className="text-base h-11"
          />
          {state?.errors?.quantity && (
            <p className="text-sm text-destructive">{state.errors.quantity[0]}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="unit">Unit *</Label>
        <Select name="unit" disabled={pending} required>
          <SelectTrigger id="unit" className="text-base h-11">
            <SelectValue placeholder="Select unit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="kg">Kilograms (kg)</SelectItem>
            <SelectItem value="lbs">Pounds (lbs)</SelectItem>
            <SelectItem value="liters">Liters</SelectItem>
            <SelectItem value="gallons">Gallons</SelectItem>
            <SelectItem value="units">Units</SelectItem>
            <SelectItem value="cases">Cases</SelectItem>
          </SelectContent>
        </Select>
        {state?.errors?.unit && (
          <p className="text-sm text-destructive">{state.errors.unit[0]}</p>
        )}
      </div>

      <Button
        type="submit"
        className="bg-caribbean-green hover:bg-caribbean-green/90 h-11"
        disabled={pending}
      >
        {pending ? 'Adding...' : 'Add Raw Material'}
      </Button>
    </form>
  );
}
