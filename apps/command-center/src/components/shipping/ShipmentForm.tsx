'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { createAndShipLabel } from '@/app/actions/shipping';
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
import { UPS_SERVICES } from '@/lib/ups';
import type { StripeOrderData } from '@/app/actions/shipping';
import { Download } from 'lucide-react';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC','PR','VI','GU','AS','MP',
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-caribbean-green hover:bg-caribbean-green/90 text-white h-12 text-base"
    >
      {pending ? 'Generating Label...' : 'Generate Shipping Label'}
    </Button>
  );
}

interface ShipmentFormProps {
  locations: { id: string; name: string; type: string; address: string | null }[];
  prefillOrder?: StripeOrderData | null;
  onSuccess?: () => void;
}

export function ShipmentForm({ locations, prefillOrder, onSuccess }: ShipmentFormProps) {
  const [state, formAction] = useActionState(createAndShipLabel, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message || 'Label created successfully');
      onSuccess?.();
    } else if (state?.message && !state?.success) {
      toast.error(state.message);
    }
  }, [state, onSuccess]);

  // If label was just created, show it
  if (state?.success && state.labelData) {
    return (
      <div className="space-y-4">
        <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-md text-sm">
          Label created! Tracking: <strong>{state.trackingNumber}</strong>
        </div>
        <div className="flex flex-col items-center gap-4">
          <img
            src={`data:image/png;base64,${state.labelData}`}
            alt="Shipping Label"
            className="max-w-sm border rounded-lg"
          />
          <Button
            onClick={() => {
              const link = document.createElement('a');
              link.href = `data:image/png;base64,${state.labelData}`;
              link.download = `label-${state.trackingNumber}.png`;
              link.click();
            }}
            className="bg-caribbean-green hover:bg-caribbean-green/90 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Label
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              formRef.current?.reset();
              window.location.reload();
            }}
            className="border-caribbean-gold text-caribbean-gold hover:bg-caribbean-green/10"
          >
            Create Another Label
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      {state?.message && !state?.success && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-md text-sm">
          {state.message}
        </div>
      )}

      {/* Hidden fields for Stripe order reference */}
      {prefillOrder && (
        <>
          <input type="hidden" name="stripePaymentIntentId" value={prefillOrder.paymentIntentId} />
          <input type="hidden" name="items" value={prefillOrder.items} />
          <div className="bg-caribbean-green/10 border border-caribbean-green/30 px-4 py-3 rounded-md text-sm text-caribbean-gold">
            Pre-filled from Stripe order — ${prefillOrder.amount.toFixed(2)}
            {prefillOrder.items && (
              <p className="text-muted-foreground mt-1 text-xs">{prefillOrder.items}</p>
            )}
          </div>
        </>
      )}

      {/* Recipient Section */}
      <div>
        <h3 className="text-sm font-semibold text-caribbean-gold mb-3">Recipient Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="recipientName">Recipient Name *</Label>
            <Input
              id="recipientName"
              name="recipientName"
              required
              defaultValue={prefillOrder?.customerName || ''}
              className="h-11"
            />
            {state?.errors?.recipientName && (
              <p className="text-sm text-red-500">{state.errors.recipientName[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipientEmail">Email</Label>
            <Input
              id="recipientEmail"
              name="recipientEmail"
              type="email"
              defaultValue={prefillOrder?.customerEmail || ''}
              className="h-11"
            />
            {state?.errors?.recipientEmail && (
              <p className="text-sm text-red-500">{state.errors.recipientEmail[0]}</p>
            )}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="recipientPhone">Phone</Label>
            <Input
              id="recipientPhone"
              name="recipientPhone"
              defaultValue=""
              className="h-11"
            />
          </div>
        </div>
      </div>

      {/* Address Section */}
      <div>
        <h3 className="text-sm font-semibold text-caribbean-gold mb-3">Shipping Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="addressLine1">Address Line 1 *</Label>
            <Input
              id="addressLine1"
              name="addressLine1"
              required
              defaultValue={prefillOrder?.shippingAddress?.line1 || ''}
              className="h-11"
            />
            {state?.errors?.addressLine1 && (
              <p className="text-sm text-red-500">{state.errors.addressLine1[0]}</p>
            )}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="addressLine2">Address Line 2</Label>
            <Input
              id="addressLine2"
              name="addressLine2"
              defaultValue={prefillOrder?.shippingAddress?.line2 || ''}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              name="city"
              required
              defaultValue={prefillOrder?.shippingAddress?.city || ''}
              className="h-11"
            />
            {state?.errors?.city && (
              <p className="text-sm text-red-500">{state.errors.city[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State *</Label>
            <Select name="state" defaultValue={prefillOrder?.shippingAddress?.state || ''} required>
              <SelectTrigger id="state" className="h-11">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((st) => (
                  <SelectItem key={st} value={st}>
                    {st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state?.errors?.state && (
              <p className="text-sm text-red-500">{state.errors.state[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="zip">ZIP Code *</Label>
            <Input
              id="zip"
              name="zip"
              required
              defaultValue={prefillOrder?.shippingAddress?.zip || ''}
              className="h-11"
            />
            {state?.errors?.zip && (
              <p className="text-sm text-red-500">{state.errors.zip[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <input type="hidden" name="country" value="US" />
            <Label>Country</Label>
            <Input value="United States" disabled className="h-11" />
          </div>
        </div>
      </div>

      {/* Package Section */}
      <div>
        <h3 className="text-sm font-semibold text-caribbean-gold mb-3">Package Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (lbs) *</Label>
            <Input
              id="weight"
              name="weight"
              type="number"
              step="0.1"
              min="0.1"
              required
              className="h-11"
            />
            {state?.errors?.weight && (
              <p className="text-sm text-red-500">{state.errors.weight[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="length">Length (in)</Label>
            <Input
              id="length"
              name="length"
              type="number"
              step="0.1"
              min="0.1"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="width">Width (in)</Label>
            <Input
              id="width"
              name="width"
              type="number"
              step="0.1"
              min="0.1"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">Height (in)</Label>
            <Input
              id="height"
              name="height"
              type="number"
              step="0.1"
              min="0.1"
              className="h-11"
            />
          </div>
        </div>
      </div>

      {/* Shipment Options */}
      <div>
        <h3 className="text-sm font-semibold text-caribbean-gold mb-3">Shipment Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="shipFromLocationId">Ship From *</Label>
            <Select name="shipFromLocationId" required>
              <SelectTrigger id="shipFromLocationId" className="h-11">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state?.errors?.shipFromLocationId && (
              <p className="text-sm text-red-500">{state.errors.shipFromLocationId[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="serviceCode">Service</Label>
            <Select name="serviceCode" defaultValue="03">
              <SelectTrigger id="serviceCode" className="h-11">
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {UPS_SERVICES.map((svc) => (
                  <SelectItem key={svc.code} value={svc.code}>
                    {svc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="orderNotes">Order Notes</Label>
        <Input
          id="orderNotes"
          name="orderNotes"
          placeholder="Optional notes about this shipment"
          className="h-11"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
