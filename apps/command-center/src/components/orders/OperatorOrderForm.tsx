'use client';

import { useActionState, useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { createOperatorOrder } from '@/app/actions/operator-orders';
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

interface PricingTier {
  id: string;
  tierName: string;
  unitPrice: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  pricingTiers: PricingTier[];
}

interface Channel {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface LineItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

interface OperatorOrderFormProps {
  channels: Channel[];
  products: Product[];
  locations: Location[];
  customers: Customer[];
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

const ORDER_TYPES = ['STANDARD', 'CATERING', 'FARMERS_MARKET'] as const;
type OrderType = (typeof ORDER_TYPES)[number];

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  STANDARD: 'Standard',
  CATERING: 'Catering',
  FARMERS_MARKET: "Farmer's Market",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full h-12 text-base bg-caribbean-green hover:bg-caribbean-green/90 text-white"
    >
      {pending ? 'Creating Order...' : 'Create Order'}
    </Button>
  );
}

export function OperatorOrderForm({
  channels,
  products,
  locations,
  customers,
}: OperatorOrderFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(createOperatorOrder, undefined);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [orderType, setOrderType] = useState<OrderType>('STANDARD');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { productId: '', quantity: 1, unitPrice: 0 },
  ]);

  useEffect(() => {
    if (state?.success && state.orderId) {
      toast.success(state.message || 'Order created');
      router.push(`/dashboard/orders/${state.orderId}`);
    }
  }, [state, router]);

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { productId: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (field === 'productId') {
          // Auto-fill unit price from first pricing tier
          const product = products.find((p) => p.id === value);
          const unitPrice =
            product?.pricingTiers[0] ? Number(product.pricingTiers[0].unitPrice) : item.unitPrice;
          return { ...item, productId: value as string, unitPrice };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const runningTotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const lineItemsJson = JSON.stringify(
    lineItems.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    }))
  );

  return (
    <form action={formAction} className="space-y-6">
      {/* Server error */}
      {state?.message && !state?.success && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-md text-sm">
          {state.message}
        </div>
      )}

      {/* Hidden serialized line items */}
      <input type="hidden" name="lineItems" value={lineItemsJson} />
      <input type="hidden" name="paymentMethod" value={paymentMethod} />
      <input type="hidden" name="orderType" value={orderType} />

      {/* Order Type Toggle */}
      <div className="space-y-2">
        <Label>Order Type</Label>
        <div className="flex flex-wrap gap-2">
          {ORDER_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setOrderType(type)}
              className={`h-11 px-4 rounded-md border-2 transition-all text-sm font-medium ${
                orderType === type
                  ? 'border-caribbean-green bg-caribbean-green/10 text-caribbean-green'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              {ORDER_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Customer (optional) */}
      <div className="space-y-2">
        <Label htmlFor="customerId">Customer (Optional)</Label>
        <Select name="customerId">
          <SelectTrigger id="customerId" className="h-11 text-base">
            <SelectValue placeholder="No customer linked" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.firstName} {c.lastName} — {c.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Channel */}
      <div className="space-y-2">
        <Label htmlFor="channelId">Sales Channel</Label>
        <Select name="channelId" required>
          <SelectTrigger id="channelId" className="h-11 text-base">
            <SelectValue placeholder="Select channel" />
          </SelectTrigger>
          <SelectContent>
            {channels.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state?.errors?.channelId && (
          <p className="text-sm text-red-500">{state.errors.channelId[0]}</p>
        )}
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="locationId">Location</Label>
        <Select name="locationId" required>
          <SelectTrigger id="locationId" className="h-11 text-base">
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state?.errors?.locationId && (
          <p className="text-sm text-red-500">{state.errors.locationId[0]}</p>
        )}
      </div>

      {/* Payment Method */}
      <div className="space-y-2">
        <Label>Payment Method</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.values(PaymentMethod).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={`h-11 px-2 rounded-md border-2 transition-all text-sm ${
                paymentMethod === method
                  ? 'border-caribbean-green bg-caribbean-green/10 text-caribbean-green font-medium'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              {PAYMENT_LABELS[method]}
            </button>
          ))}
        </div>
        {state?.errors?.paymentMethod && (
          <p className="text-sm text-red-500">{state.errors.paymentMethod[0]}</p>
        )}
      </div>

      {/* Line Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Line Items</Label>
          <button
            type="button"
            onClick={addLineItem}
            className="flex items-center gap-1 text-sm text-caribbean-green hover:text-caribbean-green/80 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Line Item
          </button>
        </div>

        {lineItems.map((item, index) => (
          <div
            key={index}
            className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end rounded-md border p-3 bg-muted/30"
          >
            {/* Product */}
            <div className="space-y-1 col-span-4 sm:col-span-1">
              <Label className="text-xs">Product</Label>
              <Select
                value={item.productId}
                onValueChange={(val) => updateLineItem(index, 'productId', val)}
              >
                <SelectTrigger className="h-11 text-base">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-1">
              <Label className="text-xs">Qty</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                value={item.quantity}
                onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value, 10) || 1)}
                className="h-11 text-base w-20"
              />
            </div>

            {/* Unit Price */}
            <div className="space-y-1">
              <Label className="text-xs">Unit Price ($)</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                value={item.unitPrice}
                onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                className="h-11 text-base w-28"
              />
            </div>

            {/* Remove */}
            <div className="pb-0.5">
              <button
                type="button"
                onClick={() => removeLineItem(index)}
                disabled={lineItems.length === 1}
                className="h-11 w-11 flex items-center justify-center rounded-md border border-destructive/50 text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {state?.errors?.lineItems && (
          <p className="text-sm text-red-500">{state.errors.lineItems[0]}</p>
        )}

        {/* Running total */}
        {runningTotal > 0 && (
          <div className="bg-caribbean-green/10 border border-caribbean-green/30 px-4 py-3 rounded-md flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Order Total</span>
            <span className="text-xl font-bold text-caribbean-green">
              ${runningTotal.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Catering Fields */}
      {orderType === 'CATERING' && (
        <div className="space-y-4 p-4 rounded-md border border-blue-500/30 bg-blue-500/5">
          <h3 className="text-sm font-semibold text-blue-500">Catering Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="depositAmount">Deposit Amount ($)</Label>
              <Input
                id="depositAmount"
                name="depositAmount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                placeholder="e.g., 250.00"
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventDate">Event Date</Label>
              <Input
                id="eventDate"
                name="eventDate"
                type="date"
                className="h-11 text-base"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Balance due date will be automatically set to 7 days before the event date.
          </p>
        </div>
      )}

      {/* Farmers Market Fields */}
      {orderType === 'FARMERS_MARKET' && (
        <div className="space-y-4 p-4 rounded-md border border-yellow-500/30 bg-yellow-500/5">
          <h3 className="text-sm font-semibold text-yellow-600">Farmer's Market Details</h3>
          <div className="space-y-2">
            <Label htmlFor="eventLocation">Event Location</Label>
            <Input
              id="eventLocation"
              name="eventLocation"
              type="text"
              placeholder="e.g., Downtown Farmers Market, Booth 12"
              className="h-11 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weatherNotes">Weather Notes</Label>
            <textarea
              id="weatherNotes"
              name="weatherNotes"
              rows={2}
              placeholder="e.g., Sunny, 75°F — great turnout conditions"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="footTrafficNotes">Foot Traffic Notes</Label>
            <textarea
              id="footTrafficNotes"
              name="footTrafficNotes"
              rows={2}
              placeholder="e.g., High traffic 10am–1pm, slow afternoon"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          placeholder="Any additional order details..."
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
