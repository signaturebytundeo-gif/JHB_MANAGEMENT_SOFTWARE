'use client';

import { useActionState, useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { createBatch } from '@/app/actions/production';
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
import { Card } from '@/components/ui/card';
import { AllocationFields } from './AllocationFields';
import { ProductionSource } from '@prisma/client';

interface BatchFormProps {
  products: { id: string; name: string; sku: string }[];
  coPackerPartners: { id: string; name: string }[];
  locations: { id: string; name: string }[];
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full h-12 text-base bg-caribbean-green hover:bg-caribbean-green/90 text-white"
    >
      {pending ? 'Creating...' : 'Create Batch'}
    </Button>
  );
}

export function BatchForm({
  products,
  coPackerPartners,
  locations,
}: BatchFormProps) {
  const [state, formAction] = useActionState(createBatch, undefined);
  const [productionSource, setProductionSource] = useState<ProductionSource>(
    ProductionSource.IN_HOUSE
  );
  const [showAllocations, setShowAllocations] = useState(false);
  const [totalUnits, setTotalUnits] = useState(0);

  // Get today's date in YYYY-MM-DD format for default value
  const today = new Date().toISOString().split('T')[0];

  return (
    <form action={formAction} className="space-y-4">
      {/* General error message */}
      {state?.message && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-md text-sm">
          {state.message}
        </div>
      )}

      {/* Production Date */}
      <div className="space-y-2">
        <Label htmlFor="productionDate">Production Date</Label>
        <Input
          id="productionDate"
          name="productionDate"
          type="date"
          defaultValue={today}
          required
          className="text-base h-11"
        />
        {state?.errors?.productionDate && (
          <p className="text-sm text-red-500">{state.errors.productionDate[0]}</p>
        )}
      </div>

      {/* Product */}
      <div className="space-y-2">
        <Label htmlFor="productId">Product</Label>
        <Select name="productId" required>
          <SelectTrigger id="productId" className="h-11 text-base">
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name} ({product.sku})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state?.errors?.productId && (
          <p className="text-sm text-red-500">{state.errors.productId[0]}</p>
        )}
      </div>

      {/* Production Source */}
      <div className="space-y-2">
        <Label>Production Source</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setProductionSource(ProductionSource.IN_HOUSE)}
            className={`h-11 px-4 rounded-md border-2 transition-all ${
              productionSource === ProductionSource.IN_HOUSE
                ? 'border-caribbean-green bg-caribbean-green/10 text-caribbean-green font-medium'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            In-House
          </button>
          <button
            type="button"
            onClick={() => setProductionSource(ProductionSource.CO_PACKER)}
            className={`h-11 px-4 rounded-md border-2 transition-all ${
              productionSource === ProductionSource.CO_PACKER
                ? 'border-caribbean-green bg-caribbean-green/10 text-caribbean-green font-medium'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            Co-Packer
          </button>
        </div>
        <input type="hidden" name="productionSource" value={productionSource} />
      </div>

      {/* Co-Packer Fields (conditional) */}
      {productionSource === ProductionSource.CO_PACKER && (
        <Card className="p-4 space-y-4 border-caribbean-green/20">
          <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300">
            Co-Packer Details
          </h3>

          {/* Partner */}
          <div className="space-y-2">
            <Label htmlFor="coPackerPartnerId">Partner</Label>
            <Select name="coPackerPartnerId" required>
              <SelectTrigger id="coPackerPartnerId" className="h-11 text-base">
                <SelectValue placeholder="Select co-packer" />
              </SelectTrigger>
              <SelectContent>
                {coPackerPartners.map((partner) => (
                  <SelectItem key={partner.id} value={partner.id}>
                    {partner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state?.errors?.coPackerPartnerId && (
              <p className="text-sm text-red-500">
                {state.errors.coPackerPartnerId[0]}
              </p>
            )}
          </div>

          {/* Partner Lot Number */}
          <div className="space-y-2">
            <Label htmlFor="coPackerLotNumber">Partner Lot Number</Label>
            <Input
              id="coPackerLotNumber"
              name="coPackerLotNumber"
              type="text"
              placeholder="e.g., CP-2024-001"
              className="text-base h-11"
            />
            {state?.errors?.coPackerLotNumber && (
              <p className="text-sm text-red-500">
                {state.errors.coPackerLotNumber[0]}
              </p>
            )}
          </div>

          {/* Receiving Date */}
          <div className="space-y-2">
            <Label htmlFor="coPackerReceivingDate">Receiving Date</Label>
            <Input
              id="coPackerReceivingDate"
              name="coPackerReceivingDate"
              type="date"
              defaultValue={today}
              className="text-base h-11"
            />
            {state?.errors?.coPackerReceivingDate && (
              <p className="text-sm text-red-500">
                {state.errors.coPackerReceivingDate[0]}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Total Units */}
      <div className="space-y-2">
        <Label htmlFor="totalUnits">Total Units</Label>
        <Input
          id="totalUnits"
          name="totalUnits"
          type="number"
          inputMode="numeric"
          placeholder="e.g., 500"
          required
          className="text-base h-11"
          onChange={(e) => setTotalUnits(parseInt(e.target.value, 10) || 0)}
        />
        {state?.errors?.totalUnits && (
          <p className="text-sm text-red-500">{state.errors.totalUnits[0]}</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Any additional information about this batch..."
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {state?.errors?.notes && (
          <p className="text-sm text-red-500">{state.errors.notes[0]}</p>
        )}
      </div>

      {/* Location Allocation (Optional) */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="showAllocations"
            checked={showAllocations}
            onChange={(e) => setShowAllocations(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="showAllocations" className="cursor-pointer">
            Allocate to Locations
          </Label>
        </div>

        {showAllocations && totalUnits > 0 && (
          <Card className="p-4 border-caribbean-green/20">
            <AllocationFields locations={locations} totalUnits={totalUnits} />
          </Card>
        )}

        {showAllocations && totalUnits === 0 && (
          <p className="text-sm text-gray-500">
            Enter total units first to allocate to locations
          </p>
        )}

        {state?.errors?.allocations && (
          <p className="text-sm text-red-500">{state.errors.allocations[0]}</p>
        )}
      </div>

      {/* Submit Button */}
      <SubmitButton />
    </form>
  );
}
