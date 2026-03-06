import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ChevronLeft, Package, User, CreditCard, Truck } from 'lucide-react';
import { verifySession } from '@/lib/dal';
import { getWebsiteOrderById } from '@/app/actions/orders';
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
    </div>
  );
}
