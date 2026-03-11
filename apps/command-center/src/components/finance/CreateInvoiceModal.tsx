'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createInvoice, getUninvoicedOrders } from '@/app/actions/invoices';
import type { UninvoicedOrder } from '@/app/actions/invoices';

interface CreateInvoiceModalProps {
  onClose: () => void;
}

export function CreateInvoiceModal({ onClose }: CreateInvoiceModalProps) {
  const [state, formAction, isPending] = useActionState(createInvoice, undefined);
  const [orders, setOrders] = useState<UninvoicedOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<UninvoicedOrder | null>(null);

  // Fetch uninvoiced orders on mount
  useEffect(() => {
    getUninvoicedOrders().then((result) => {
      setOrders(result);
      setLoadingOrders(false);
    });
  }, []);

  // Handle success
  useEffect(() => {
    if (state?.success && state.invoiceId) {
      toast.success('Invoice created successfully');
      onClose();
    } else if (state?.message && !state.success) {
      toast.error(state.message);
    }
  }, [state, onClose]);

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId);
    const order = orders.find((o) => o.id === orderId) ?? null;
    setSelectedOrder(order);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-caribbean-green" />
            <h2 className="text-lg font-semibold">Generate Invoice</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form action={formAction} className="p-4 space-y-5">
          <input type="hidden" name="orderId" value={selectedOrderId} />

          {/* Order Picker */}
          <div className="space-y-2">
            <Label>Select Order</Label>
            {loadingOrders ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                Loading orders...
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                No uninvoiced orders found. Confirm an order first before generating an invoice.
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto rounded-lg border p-1">
                {orders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => handleOrderSelect(order.id)}
                    className={`w-full text-left rounded-md p-3 text-sm transition-colors ${
                      selectedOrderId === order.id
                        ? 'bg-caribbean-green/10 border border-caribbean-green/40'
                        : 'hover:bg-muted border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold">{order.orderNumber}</span>
                      <span className="font-medium">${order.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-muted-foreground">
                        {order.customer
                          ? `${order.customer.firstName} ${order.customer.lastName}`
                          : 'No customer'}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {format(new Date(order.orderDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {state?.errors?.orderId && (
              <p className="text-xs text-destructive">{state.errors.orderId[0]}</p>
            )}
          </div>

          {/* Selected Order Summary */}
          {selectedOrder && (
            <div className="rounded-lg bg-muted/40 border p-3 text-sm space-y-1">
              <p className="font-semibold text-foreground">Order Summary</p>
              <div className="flex justify-between text-muted-foreground">
                <span>Order #</span>
                <span className="font-mono">{selectedOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Customer</span>
                <span>
                  {selectedOrder.customer
                    ? `${selectedOrder.customer.firstName} ${selectedOrder.customer.lastName}`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Order Total</span>
                <span className="font-medium text-foreground">
                  ${selectedOrder.totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Order Date</span>
                <span>{format(new Date(selectedOrder.orderDate), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between text-muted-foreground pt-1 border-t">
                <span>Payment Terms</span>
                <span className="font-medium text-foreground">Net 30</span>
              </div>
            </div>
          )}

          {/* Tax Rate */}
          <div className="space-y-2">
            <Label htmlFor="taxRate">Tax Rate (%)</Label>
            <Input
              id="taxRate"
              name="taxRate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              defaultValue="0"
              className="h-11 text-base"
              placeholder="0"
            />
            {state?.errors?.taxRate && (
              <p className="text-xs text-destructive">{state.errors.taxRate[0]}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Payment instructions, special terms..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {state?.message && !state.success && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}

          <Button
            type="submit"
            disabled={isPending || !selectedOrderId}
            className="w-full bg-caribbean-green hover:bg-caribbean-green/90 text-white"
          >
            {isPending ? 'Generating...' : 'Generate Invoice'}
          </Button>
        </form>
      </div>
    </div>
  );
}
