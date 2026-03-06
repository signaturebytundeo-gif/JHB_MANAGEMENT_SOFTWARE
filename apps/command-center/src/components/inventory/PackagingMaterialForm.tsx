'use client';

import { useActionState, useEffect } from 'react';
import { createPackagingMaterial, updatePackagingMaterial } from '@/app/actions/packaging';
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

type PackagingMaterial = {
  id: string;
  name: string;
  type: string;
  supplier: string;
  currentQuantity: number;
  unit: string;
  reorderPoint: number;
  leadTimeDays: number;
  costPerUnit: number | { toString(): string } | null;
};

interface PackagingMaterialFormProps {
  editingMaterial?: PackagingMaterial;
  onCancel?: () => void;
}

export function PackagingMaterialForm({ editingMaterial, onCancel }: PackagingMaterialFormProps) {
  const isEdit = !!editingMaterial;

  // Bind the id for update action
  const updateAction = editingMaterial
    ? updatePackagingMaterial.bind(null, editingMaterial.id)
    : null;

  const [state, formAction, pending] = useActionState(
    isEdit ? updateAction! : createPackagingMaterial,
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message);
      if (!isEdit) {
        const form = document.getElementById('packaging-material-form') as HTMLFormElement;
        if (form) form.reset();
      } else {
        onCancel?.();
      }
    } else if (state?.message && !state.errors) {
      toast.error(state.message);
    }
  }, [state, isEdit, onCancel]);

  return (
    <form id="packaging-material-form" action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Material Name *</Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="5oz Glass Bottle"
            defaultValue={editingMaterial?.name}
            disabled={pending}
            required
            className="text-base h-11"
          />
          {state?.errors?.name && (
            <p className="text-sm text-destructive">{state.errors.name[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type *</Label>
          <Select name="type" defaultValue={editingMaterial?.type} disabled={pending} required>
            <SelectTrigger id="type" className="text-base h-11">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BOTTLE">Bottle</SelectItem>
              <SelectItem value="CAP">Cap</SelectItem>
              <SelectItem value="LABEL">Label</SelectItem>
              <SelectItem value="BOX">Box</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
          {state?.errors?.type && (
            <p className="text-sm text-destructive">{state.errors.type[0]}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="supplier">Supplier *</Label>
        <Input
          id="supplier"
          name="supplier"
          type="text"
          placeholder="Supplier name"
          defaultValue={editingMaterial?.supplier}
          disabled={pending}
          required
          className="text-base h-11"
        />
        {state?.errors?.supplier && (
          <p className="text-sm text-destructive">{state.errors.supplier[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="currentQuantity">Current Quantity *</Label>
          <Input
            id="currentQuantity"
            name="currentQuantity"
            type="number"
            inputMode="numeric"
            placeholder="500"
            defaultValue={editingMaterial?.currentQuantity}
            disabled={pending}
            required
            min={0}
            className="text-base h-11"
          />
          {state?.errors?.currentQuantity && (
            <p className="text-sm text-destructive">{state.errors.currentQuantity[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit">Unit *</Label>
          <Select name="unit" defaultValue={editingMaterial?.unit} disabled={pending} required>
            <SelectTrigger id="unit" className="text-base h-11">
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="units">Units</SelectItem>
              <SelectItem value="rolls">Rolls</SelectItem>
              <SelectItem value="sheets">Sheets</SelectItem>
              <SelectItem value="cases">Cases</SelectItem>
            </SelectContent>
          </Select>
          {state?.errors?.unit && (
            <p className="text-sm text-destructive">{state.errors.unit[0]}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="reorderPoint">Reorder Point *</Label>
          <Input
            id="reorderPoint"
            name="reorderPoint"
            type="number"
            inputMode="numeric"
            placeholder="200"
            defaultValue={editingMaterial?.reorderPoint}
            disabled={pending}
            required
            min={0}
            className="text-base h-11"
          />
          {state?.errors?.reorderPoint && (
            <p className="text-sm text-destructive">{state.errors.reorderPoint[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="leadTimeDays">Lead Time (days) *</Label>
          <Input
            id="leadTimeDays"
            name="leadTimeDays"
            type="number"
            inputMode="numeric"
            placeholder="14"
            defaultValue={editingMaterial?.leadTimeDays}
            disabled={pending}
            required
            min={1}
            className="text-base h-11"
          />
          {state?.errors?.leadTimeDays && (
            <p className="text-sm text-destructive">{state.errors.leadTimeDays[0]}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="costPerUnit">Cost Per Unit (optional)</Label>
        <Input
          id="costPerUnit"
          name="costPerUnit"
          type="number"
          inputMode="decimal"
          step="0.01"
          placeholder="0.45"
          defaultValue={
            editingMaterial?.costPerUnit != null
              ? editingMaterial.costPerUnit.toString()
              : undefined
          }
          disabled={pending}
          min={0}
          className="text-base h-11"
        />
        {state?.errors?.costPerUnit && (
          <p className="text-sm text-destructive">{state.errors.costPerUnit[0]}</p>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          className="bg-caribbean-green hover:bg-caribbean-green/90 h-11"
          disabled={pending}
        >
          {pending ? (isEdit ? 'Updating...' : 'Adding...') : isEdit ? 'Update Material' : 'Add Material'}
        </Button>
        {isEdit && onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending} className="h-11">
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
