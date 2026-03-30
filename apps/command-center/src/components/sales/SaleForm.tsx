'use client';

import { useActionState, useState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { createSale } from '@/app/actions/sales';
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
import { PaymentMethod } from '@prisma/client';
import { toast } from 'sonner';

interface SaleFormProps {
  channels: { id: string; name: string }[];
  products: { id: string; name: string; sku: string }[];
  locations: { id: string; name: string; type: string }[];
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CREDIT_CARD: 'Credit Card',
  SQUARE: 'Square',
  STRIPE: 'Stripe',
  ZELLE: 'Zelle',
  CHECK: 'Check',
  NET_30: 'Net 30',
  AMAZON_PAY: 'Amazon Pay',
  OTHER: 'Other',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full h-12 text-base bg-caribbean-green hover:bg-caribbean-green/90 text-white"
    >
      {pending ? 'Logging...' : 'Log Sale'}
    </Button>
  );
}

export function SaleForm({ channels, products, locations }: SaleFormProps) {
  const [state, formAction] = useActionState(createSale, undefined);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    PaymentMethod.CASH
  );
  const [quantity, setQuantity] = useState(0);
  const [unitPrice, setUnitPrice] = useState(0);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [isPromo, setIsPromo] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message || 'Sale logged');
      formRef.current?.reset();
      setQuantity(0);
      setUnitPrice(0);
      setPaymentMethod(PaymentMethod.CASH);
      setSelectedChannel('');
      setNewChannelName('');
      setIsPromo(false);
    }
  }, [state]);

  const effectivePrice = isPromo ? 0 : unitPrice;
  const computedTotal = quantity * effectivePrice;
  const isNewChannel = selectedChannel === '__new__';

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state?.message && !state?.success && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-md text-sm">
          {state.message}
        </div>
      )}

      {/* Sale Date */}
      <div className="space-y-2">
        <Label htmlFor="saleDate">Sale Date</Label>
        <Input
          id="saleDate"
          name="saleDate"
          type="date"
          defaultValue={today}
          required
          className="text-base h-11"
        />
        {state?.errors?.saleDate && (
          <p className="text-sm text-red-500">{state.errors.saleDate[0]}</p>
        )}
      </div>

      {/* Channel with quick-add option */}
      <div className="space-y-2">
        <Label htmlFor="channelId">Sales Channel</Label>
        <Select
          name="channelId"
          required
          value={selectedChannel}
          onValueChange={setSelectedChannel}
        >
          <SelectTrigger id="channelId" className="h-11 text-base">
            <SelectValue placeholder="Select channel" />
          </SelectTrigger>
          <SelectContent>
            {channels.map((channel) => (
              <SelectItem key={channel.id} value={channel.id}>
                {channel.name}
              </SelectItem>
            ))}
            <SelectItem value="__new__" className="text-caribbean-green font-medium">
              + Add New Channel
            </SelectItem>
          </SelectContent>
        </Select>
        {isNewChannel && (
          <Input
            name="newChannelName"
            type="text"
            placeholder="e.g., Direct Sale, Pop-Up, Wholesale"
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            required
            className="text-base h-11 border-caribbean-green/50"
            autoFocus
          />
        )}
        {state?.errors?.channelId && (
          <p className="text-sm text-red-500">{state.errors.channelId[0]}</p>
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

      {/* Promo / Giveaway Toggle */}
      <div className="flex items-center gap-3 py-2">
        <button
          type="button"
          onClick={() => {
            setIsPromo(!isPromo);
            if (!isPromo) setUnitPrice(0);
          }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isPromo ? 'bg-amber-500' : 'bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              isPromo ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <div>
          <span className={`text-sm font-medium ${isPromo ? 'text-amber-500' : 'text-muted-foreground'}`}>
            Promo / Giveaway
          </span>
          {isPromo && (
            <p className="text-xs text-amber-500/70">$0.00 — tracked as giveaway, excluded from revenue</p>
          )}
        </div>
        <input type="hidden" name="isPromo" value={isPromo ? 'true' : 'false'} />
      </div>

      {/* Location — where the product is coming from */}
      <div className="space-y-2">
        <Label htmlFor="locationId">Pulled From (Location)</Label>
        <Select name="locationId">
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
          Selecting a location deducts inventory from that location.
        </p>
      </div>

      {/* Quantity + Unit Price (side by side) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            inputMode="numeric"
            placeholder="e.g., 24"
            required
            className="text-base h-11"
            onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
          />
          {state?.errors?.quantity && (
            <p className="text-sm text-red-500">{state.errors.quantity[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="unitPrice">Unit Price ($)</Label>
          {isPromo ? (
            <>
              <Input
                id="unitPrice-display"
                type="text"
                value="$0.00 (Promo)"
                disabled
                className="text-base h-11 text-amber-500 font-medium"
              />
              <input type="hidden" name="unitPrice" value="0" />
            </>
          ) : (
            <Input
              id="unitPrice"
              name="unitPrice"
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="e.g., 8.99"
              required
              className="text-base h-11"
              onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
            />
          )}
          {state?.errors?.unitPrice && (
            <p className="text-sm text-red-500">{state.errors.unitPrice[0]}</p>
          )}
        </div>
      </div>

      {/* Computed Total */}
      {isPromo && quantity > 0 ? (
        <div className="bg-amber-500/10 border border-amber-500/30 px-4 py-3 rounded-md">
          <p className="text-sm text-amber-500">Giveaway</p>
          <p className="text-2xl font-bold text-amber-500">
            {quantity} unit{quantity !== 1 ? 's' : ''} — $0.00
          </p>
        </div>
      ) : computedTotal > 0 ? (
        <div className="bg-caribbean-green/10 border border-caribbean-green/30 px-4 py-3 rounded-md">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold text-caribbean-green">
            ${computedTotal.toFixed(2)}
          </p>
        </div>
      ) : null}

      {/* Payment Method Toggle — hidden for promos */}
      {!isPromo && <div className="space-y-2">
        <Label>Payment Method</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.values(PaymentMethod).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={`h-10 px-2 rounded-md border-2 transition-all text-sm ${
                paymentMethod === method
                  ? 'border-caribbean-green bg-caribbean-green/10 text-caribbean-green font-medium'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              {PAYMENT_LABELS[method]}
            </button>
          ))}
        </div>
        <input type="hidden" name="paymentMethod" value={paymentMethod} />
      </div>}

      {/* Reference Number */}
      <div className="space-y-2">
        <Label htmlFor="referenceNumber">Reference # (Optional)</Label>
        <Input
          id="referenceNumber"
          name="referenceNumber"
          type="text"
          placeholder="e.g., INV-2025-001, Amazon Order #"
          className="text-base h-11"
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          placeholder="Any additional details..."
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
