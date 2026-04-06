import { Suspense } from 'react';
import { getRecentStripeOrders, getShipments, getShippingLocations } from '@/app/actions/shipping';
import { db } from '@/lib/db';
import { ShippingPageClient } from './client';
import type { StripeOrderData } from '@/app/actions/shipping';

async function getUnshippedMarketplaceOrders(): Promise<StripeOrderData[]> {
  try {
    const orders = await db.websiteOrder.findMany({
      where: {
        status: { in: ['NEW', 'PROCESSING'] },
        source: { in: ['AMAZON', 'ETSY', 'WEBSITE'] },
      },
      include: { customer: { select: { firstName: true, lastName: true, email: true, phone: true } } },
      orderBy: { orderDate: 'desc' },
      take: 50,
    });

    return orders.map((o) => ({
      paymentIntentId: o.orderId,
      customerName: `${o.customer?.firstName || ''} ${o.customer?.lastName || ''}`.trim() || 'Customer',
      customerEmail: o.customer?.email || null,
      amount: Number(o.orderTotal),
      shippingAddress: o.shippingAddressLine1 ? {
        line1: o.shippingAddressLine1,
        line2: o.shippingAddressLine2 || undefined,
        city: o.shippingCity || '',
        state: o.shippingState || '',
        zip: o.shippingZip || '',
        country: o.shippingCountry || 'US',
      } : null,
      items: (() => {
        try {
          const parsed = JSON.parse(o.items as string);
          return parsed
            .map((i: any) => {
              const name = i.name || i.title || i.description || 'Item';
              const qty = i.qty ?? i.quantity ?? 1;
              return `${name} ×${qty}`;
            })
            .filter(Boolean)
            .join(', ');
        } catch {
          // If it starts with [ or { it's unparseable JSON — hide it
          const raw = o.items as string;
          if (typeof raw === 'string' && (raw.startsWith('[') || raw.startsWith('{'))) return null;
          return raw || null;
        }
      })(),
      createdAt: o.orderDate.toISOString(),
      source: o.source || 'WEBSITE',
    }));
  } catch {
    return [];
  }
}

async function ShippingContent() {
  const [stripeOrders, marketplaceOrders, shipmentsData, locations] = await Promise.all([
    getRecentStripeOrders(),
    getUnshippedMarketplaceOrders(),
    getShipments({ page: 1, limit: 25 }),
    getShippingLocations(),
  ]);

  // Merge Stripe + marketplace orders, dedup by ID
  const seenIds = new Set(stripeOrders.map((o) => o.paymentIntentId));
  const allPending = [
    ...stripeOrders,
    ...marketplaceOrders.filter((o) => !seenIds.has(o.paymentIntentId)),
  ];

  return (
    <ShippingPageClient
      stripeOrders={allPending}
      locations={locations}
      shipments={shipmentsData.shipments as any}
      shipmentsTotal={shipmentsData.total}
      shipmentsPage={shipmentsData.page}
      shipmentsTotalPages={shipmentsData.totalPages}
    />
  );
}

function ShippingLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 bg-muted rounded-lg w-80" />
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function ShippingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Shipping</h1>
        <p className="text-muted-foreground mt-2">
          Create UPS shipping labels, track orders from jamaicahousebrand.com, and manage shipments.
        </p>
      </div>

      <Suspense fallback={<ShippingLoading />}>
        <ShippingContent />
      </Suspense>
    </div>
  );
}
