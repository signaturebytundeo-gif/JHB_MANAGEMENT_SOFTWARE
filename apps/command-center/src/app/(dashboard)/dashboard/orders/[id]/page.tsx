import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ChevronLeft, Package, User, CreditCard, Truck, MapPin, ClipboardList } from 'lucide-react';
import { verifySession } from '@/lib/dal';
import { getWebsiteOrderById } from '@/app/actions/orders';
import { getOperatorOrderById } from '@/app/actions/operator-orders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { OrderStatusControls } from '@/components/orders/OrderStatusControls';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { OrderActions } from '@/components/orders/OrderActions';
import { PickPackList } from '@/components/orders/PickPackList';
import { getPickPackList } from '@/app/actions/operator-orders';

interface PageProps {
  params: Promise<{ id: string }>;
}

function parseItems(itemsJson: string): { name: string; qty: number; price?: number }[] {
  try {
    const parsed = JSON.parse(itemsJson);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => ({
        name: item.name || item.product || 'Unknown',
        qty: item.qty || item.quantity || 1,
        price: item.price ? Number(item.price) : undefined,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  NEW: { label: 'New', className: 'bg-caribbean-gold text-black' },
  PROCESSING: { label: 'Processing', className: 'bg-blue-500 text-white' },
  SHIPPED: { label: 'Shipped', className: 'bg-green-500 text-white' },
  DELIVERED: { label: 'Delivered', className: 'bg-emerald-500 text-white' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-500 text-white' },
};

export default async function OrderDetailPage({ params }: PageProps) {
  await verifySession();
  const { id } = await params;

  // Try operator order first (has orderNumber field)
  const operatorOrder = await getOperatorOrderById(id);
  if (operatorOrder) {
    // Fetch pick/pack data for CONFIRMED and later statuses
    const PICK_PACK_STATUSES = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'];
    const pickPackData = PICK_PACK_STATUSES.includes(operatorOrder.status)
      ? await getPickPackList(id)
      : null;
    return <OperatorOrderDetail order={operatorOrder} pickPackData={pickPackData} />;
  }

  const order = await getWebsiteOrderById(id);
  if (!order) notFound();

  const items = parseItems(order.items);
  const statusBadge = STATUS_BADGES[order.status] ?? { label: order.status, className: 'bg-muted text-foreground' };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Orders
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">{order.orderId}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(order.orderDate), 'MMMM d, yyyy')}
          </p>
        </div>
        <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
      </div>

      {/* Line Items Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Line Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                      No line items found
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.qty}</TableCell>
                      <TableCell className="text-right">
                        {item.price !== undefined ? `$${item.price.toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.price !== undefined
                          ? `$${(item.price * item.qty).toFixed(2)}`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {/* Summary rows */}
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={3} className="font-medium text-right text-muted-foreground">
                    Shipping
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${order.shippingCost.toFixed(2)}
                  </TableCell>
                </TableRow>
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={3} className="font-semibold text-right">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ${order.orderTotal.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Customer Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Name</div>
              <div className="mt-1">
                {order.customer.firstName} {order.customer.lastName}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Email</div>
              <div className="mt-1">{order.customer.email}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Phone</div>
              <div className="mt-1">{order.customer.phone ?? 'Not provided'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment & Shipping Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment &amp; Shipping
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Order Reference</div>
              <div className="mt-1 font-mono text-sm">{order.orderId}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Source</div>
              <div className="mt-1">{order.source ?? 'WEBSITE'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Order Total</div>
              <div className="mt-1 font-semibold">${order.orderTotal.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Shipping Cost</div>
              <div className="mt-1">${order.shippingCost.toFixed(2)}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-sm font-medium text-muted-foreground">Shipping Address</div>
              <div className="mt-1 text-sm text-muted-foreground italic">
                Not captured — address data is stored with Stripe, not in the order record
              </div>
            </div>
          </div>

          {/* Tracking info */}
          {order.trackingNumber && order.carrier && (
            <div className="pt-3 border-t">
              <div className="flex items-center gap-2 font-medium">
                <Truck className="h-4 w-4" />
                Tracking
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Carrier</div>
                  <div className="mt-1">{order.carrier}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Tracking Number</div>
                  <div className="mt-1 font-mono text-sm">{order.trackingNumber}</div>
                </div>
                {order.shippedAt && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Shipped</div>
                    <div className="mt-1">
                      {format(new Date(order.shippedAt), 'MMMM d, yyyy')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Order Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderStatusControls
            orderId={order.id}
            currentStatus={order.status}
            customerName={`${order.customer.firstName} ${order.customer.lastName}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Operator Order Detail ──────────────────────────────────────────────────────

import type { OperatorOrderDetail, PickPackList as PickPackListType } from '@/app/actions/operator-orders';

function OperatorOrderDetail({
  order,
  pickPackData,
}: {
  order: NonNullable<OperatorOrderDetail>;
  pickPackData?: PickPackListType | null;
}) {
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

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Orders
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold font-mono">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {order.orderType.replace('_', ' ')} Order ·{' '}
            Created {format(new Date(order.createdAt), 'MMMM d, yyyy')}
            {order.createdBy && ` by ${order.createdBy.name}`}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Line Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.lineItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.product.name}
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        ({item.product.sku})
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${item.totalPrice.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={3} className="font-semibold text-right">
                    Order Total
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ${order.totalAmount.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Customer (if linked) */}
      {order.customer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Name</div>
                <div className="mt-1">
                  {order.customer.firstName} {order.customer.lastName}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Email</div>
                <div className="mt-1">{order.customer.email}</div>
              </div>
              {order.customer.phone && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Phone</div>
                  <div className="mt-1">{order.customer.phone}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Order Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Channel</div>
              <div className="mt-1">{order.channel.name}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Location</div>
              <div className="mt-1">{order.location.name}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Payment Method</div>
              <div className="mt-1">{PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</div>
            </div>
            {order.notes && (
              <div className="sm:col-span-2">
                <div className="text-sm font-medium text-muted-foreground">Notes</div>
                <div className="mt-1 text-sm">{order.notes}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Catering Details */}
      {order.orderType === 'CATERING' && (
        <Card className="border-blue-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-500">
              <ClipboardList className="h-5 w-5" />
              Catering Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {order.depositAmount !== null && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Deposit Amount</div>
                  <div className="mt-1 font-semibold">${order.depositAmount.toFixed(2)}</div>
                </div>
              )}
              {order.eventDate && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Event Date</div>
                  <div className="mt-1">{format(new Date(order.eventDate), 'MMMM d, yyyy')}</div>
                </div>
              )}
              {order.balanceDueDate && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Balance Due Date</div>
                  <div className="mt-1">{format(new Date(order.balanceDueDate), 'MMMM d, yyyy')}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Farmers Market Details */}
      {order.orderType === 'FARMERS_MARKET' && (
        <Card className="border-yellow-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <MapPin className="h-5 w-5" />
              Farmer's Market Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.eventLocation && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Event Location</div>
                  <div className="mt-1">{order.eventLocation}</div>
                </div>
              )}
              {order.weatherNotes && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Weather Notes</div>
                  <div className="mt-1 text-sm">{order.weatherNotes}</div>
                </div>
              )}
              {order.footTrafficNotes && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Foot Traffic Notes</div>
                  <div className="mt-1 text-sm">{order.footTrafficNotes}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Actions — status transitions and FIFO confirmation */}
      {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
        <Card>
          <CardHeader>
            <CardTitle>Order Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderActions
              order={{
                id: order.id,
                status: order.status,
                approvalStatus: order.approvalStatus,
                totalAmount: order.totalAmount,
                approvedById: order.approvedById,
              }}
              pickPackData={pickPackData}
            />
          </CardContent>
        </Card>
      )}

      {/* Pick/Pack List — always visible for PROCESSING */}
      {order.status === 'PROCESSING' && pickPackData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Pick / Pack List
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PickPackList data={pickPackData} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
