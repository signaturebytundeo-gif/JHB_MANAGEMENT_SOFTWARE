'use client';

import { useActionState, useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { updateSale } from '@/app/actions/sales';
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
import { X } from 'lucide-react';

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
      className="w-full bg-caribbean-green hover:bg-caribbean-green/90 text-white"
    >
      {pending ? 'Saving...' : 'Save Changes'}
    </Button>
  );
}

interface Sale {
  id: string;
  saleDate: string | Date;
  quantity: number;
  unitPrice: unknown;
  totalAmount: unknown;
  paymentMethod: string;
  referenceNumber: string | null;
  notes: string | null;
  channel: { id: string; name: string };
  product: { id: string; name: string; sku: string };
}

interface SaleEditModalProps {
  sale: Sale;
  channels: { id: string; name: string }[];
  products: { id: string; name: string }[];
  onClose: () => void;
}

export function SaleEditModal({ sale, channels, products, onClose }: SaleEditModalProps) {
  const [state, formAction] = useActionState(updateSale, undefined);
  const [paymentMethod, setPaymentMethod] = useState<string>(sale.paymentMethod);
  const [quantity, setQuantity] = useState(sale.quantity);
  const [unitPrice, setUnitPrice] = useState(Number(sale.unitPrice));

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message || 'Sale updated');
      onClose();
    }
  }, [state, onClose]);

  const computedTotal = quantity * unitPrice;
  const dateValue = new Date(sale.saleDate).toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Edit Sale</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form action={formAction} className="p-4 space-y-4">
          <input type="hidden" name="saleId" value={sale.id} />

          {state?.message && !state?.success && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-md text-sm">
              {state.message}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-saleDate">Sale Date</Label>
            <Input
              id="edit-saleDate"
              name="saleDate"
              type="date"
              defaultValue={dateValue}
              required
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-channelId">Sales Channel</Label>
            <Select name="channelId" defaultValue={sale.channel.id}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                {channels.map((ch) => (
                  <SelectItem key={ch.id} value={ch.id}>
                    {ch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-productId">Product</Label>
            <Select name="productId" defaultValue={sale.product.id}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">Quantity</Label>
              <Input
                id="edit-quantity"
                name="quantity"
                type="number"
                defaultValue={sale.quantity}
                required
                className="h-11"
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-unitPrice">Unit Price ($)</Label>
              <Input
                id="edit-unitPrice"
                name="unitPrice"
                type="number"
                step="0.01"
                defaultValue={Number(sale.unitPrice)}
                required
                className="h-11"
                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {computedTotal > 0 && (
            <div className="bg-caribbean-green/10 border border-caribbean-green/30 px-4 py-2 rounded-md">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-xl font-bold text-caribbean-green">
                ${computedTotal.toFixed(2)}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(PaymentMethod).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`h-9 px-2 rounded-md border-2 transition-all text-xs ${
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-referenceNumber">Reference # (Optional)</Label>
            <Input
              id="edit-referenceNumber"
              name="referenceNumber"
              type="text"
              defaultValue={sale.referenceNumber || ''}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes (Optional)</Label>
            <textarea
              id="edit-notes"
              name="notes"
              rows={2}
              defaultValue={sale.notes || ''}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
