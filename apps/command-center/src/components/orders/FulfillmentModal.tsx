'use client';

import { useState } from 'react';
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
import { fulfillOrder } from '@/app/actions/orders';
import { toast } from 'sonner';
import { X, Truck } from 'lucide-react';

const CARRIERS = ['UPS', 'USPS', 'FedEx', 'DHL', 'Other'];

interface FulfillmentModalProps {
  orderId: string;
  customerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function FulfillmentModal({
  orderId,
  customerName,
  onClose,
  onSuccess,
}: FulfillmentModalProps) {
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      const result = await fulfillOrder(orderId, {
        trackingNumber: trackingNumber.trim() || undefined,
        carrier: carrier || undefined,
        estimatedDelivery: estimatedDelivery.trim() || undefined,
      });

      if (result.success) {
        toast.success(result.message);
        onSuccess();
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-caribbean-green" />
            <h2 className="text-lg font-semibold">Ship Order</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Shipping order for <strong>{customerName}</strong>. Add tracking info below (optional) — the customer will receive a shipping confirmation email.
          </p>

          <div className="space-y-2">
            <Label htmlFor="carrier">Carrier</Label>
            <Select value={carrier} onValueChange={setCarrier}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select carrier" />
              </SelectTrigger>
              <SelectContent>
                {CARRIERS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trackingNumber">Tracking Number</Label>
            <Input
              id="trackingNumber"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. 1Z999AA10123456784"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedDelivery">Estimated Delivery (Optional)</Label>
            <Input
              id="estimatedDelivery"
              value={estimatedDelivery}
              onChange={(e) => setEstimatedDelivery(e.target.value)}
              placeholder="e.g. March 8-10, 2026"
              className="h-11"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-caribbean-green hover:bg-caribbean-green/90 text-white"
          >
            {isSubmitting ? 'Shipping...' : (trackingNumber.trim() ? 'Ship & Notify Customer' : 'Mark as Shipped')}
          </Button>
        </form>
      </div>
    </div>
  );
}
