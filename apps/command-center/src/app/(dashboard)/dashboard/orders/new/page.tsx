import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { OperatorOrderForm } from '@/components/orders/OperatorOrderForm';

export default async function NewOperatorOrderPage() {
  const [channels, products, locations, customers] = await Promise.all([
    db.salesChannel.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    db.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        pricingTiers: {
          orderBy: { tierName: 'asc' },
        },
      },
    }),
    db.location.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    db.customer.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }),
  ]);

  const formattedProducts = products.map((p) => ({
    ...p,
    pricingTiers: p.pricingTiers.map((t) => ({
      ...t,
      unitPrice: Number(t.unitPrice),
    })),
  }));

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
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
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">New Purchase Order</h1>
        <p className="text-muted-foreground mt-1">
          Create a purchase order with multi-line-item support.
        </p>
      </div>

      {/* Form Card */}
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <OperatorOrderForm
          channels={channels}
          products={formattedProducts}
          locations={locations}
          customers={customers}
        />
      </div>
    </div>
  );
}
