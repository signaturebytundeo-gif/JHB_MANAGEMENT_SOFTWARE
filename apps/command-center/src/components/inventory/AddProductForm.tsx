'use client';

import { useActionState, useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { createProduct } from '@/app/actions/products';
import type { CreateProductFormState } from '@/app/actions/products';
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
import { useVoiceFill } from '@/lib/voice/use-voice-fill';
import { applyToNativeInputs } from '@/lib/voice/apply-to-inputs';

interface AddProductFormProps {
  locations: { id: string; name: string }[];
}

export function AddProductForm({ locations }: AddProductFormProps) {
  const [state, formAction, isPending] = useActionState<
    CreateProductFormState | undefined,
    FormData
  >(createProduct, undefined);
  const [selectedLocation, setSelectedLocation] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  // Voice integration — listens on "inventory" page key
  const { voiceFields, consumeVoice } = useVoiceFill('inventory');

  useEffect(() => {
    if (!voiceFields) return;
    if (voiceFields.locationId) setSelectedLocation(String(voiceFields.locationId));
    applyToNativeInputs(formRef.current, voiceFields);
    consumeVoice();
  }, [voiceFields, consumeVoice]);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message);
      formRef.current?.reset();
      setSelectedLocation('');
    } else if (state?.message && !state.success) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      data-voice-page="inventory"
      action={formAction}
      className="space-y-4"
    >
      {state?.message && !state.success && !state.errors && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-md text-sm">
          {state.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Product Name */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="name">Product Name *</Label>
          <Input
            id="name"
            name="name"
            placeholder="e.g., Pineapple Passion"
            required
            className="text-base h-11"
          />
          {state?.errors?.name && (
            <p className="text-sm text-red-500">{state.errors.name[0]}</p>
          )}
        </div>

        {/* SKU */}
        <div className="space-y-2">
          <Label htmlFor="sku">SKU *</Label>
          <Input
            id="sku"
            name="sku"
            placeholder="e.g., JHB-JC-PIN-PAS"
            required
            className="text-base h-11 uppercase"
          />
          {state?.errors?.sku && (
            <p className="text-sm text-red-500">{state.errors.sku[0]}</p>
          )}
        </div>

        {/* Size */}
        <div className="space-y-2">
          <Label htmlFor="size">Size / Variant *</Label>
          <Input
            id="size"
            name="size"
            placeholder="e.g., bottle, 5oz, 10oz"
            required
            className="text-base h-11"
          />
          {state?.errors?.size && (
            <p className="text-sm text-red-500">{state.errors.size[0]}</p>
          )}
        </div>

        {/* Retail Price */}
        <div className="space-y-2">
          <Label htmlFor="retailPrice">Retail Price ($) *</Label>
          <Input
            id="retailPrice"
            name="retailPrice"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue="7.99"
            required
            className="text-base h-11"
          />
          {state?.errors?.retailPrice && (
            <p className="text-sm text-red-500">{state.errors.retailPrice[0]}</p>
          )}
        </div>

        {/* Units Per Case */}
        <div className="space-y-2">
          <Label htmlFor="unitsPerCase">Units Per Case</Label>
          <Input
            id="unitsPerCase"
            name="unitsPerCase"
            type="number"
            min="1"
            placeholder="e.g., 12, 24"
            className="text-base h-11"
          />
        </div>

        {/* Starting Stock */}
        <div className="space-y-2">
          <Label htmlFor="startingStock">Starting Stock (units)</Label>
          <Input
            id="startingStock"
            name="startingStock"
            type="number"
            min="0"
            defaultValue="0"
            className="text-base h-11"
          />
        </div>

        {/* Stock Location */}
        <div className="space-y-2">
          <Label htmlFor="locationId">Stock Location</Label>
          <Select
            name="locationId"
            value={selectedLocation || undefined}
            onValueChange={setSelectedLocation}
          >
            <SelectTrigger id="locationId" className="h-11 text-base">
              <SelectValue placeholder="Select location (optional)" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Required if starting stock &gt; 0
          </p>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={2}
          placeholder="Optional product description..."
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      {/* Hidden fields with sensible defaults */}
      <input type="hidden" name="reorderPoint" value="24" />
      <input type="hidden" name="leadTimeDays" value="14" />

      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-12 text-base bg-caribbean-green hover:bg-caribbean-green/90 text-white"
      >
        {isPending ? 'Creating...' : 'Create Product'}
      </Button>
    </form>
  );
}
