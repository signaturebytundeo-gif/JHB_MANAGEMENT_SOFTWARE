import { Suspense } from 'react';
import { getRecentStripeOrders, getShipments, getShippingLocations } from '@/app/actions/shipping';
import { ShippingPageClient } from './client';

async function ShippingContent() {
  const [stripeOrders, shipmentsData, locations] = await Promise.all([
    getRecentStripeOrders(),
    getShipments({ page: 1, limit: 25 }),
    getShippingLocations(),
  ]);

  return (
    <ShippingPageClient
      stripeOrders={stripeOrders}
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
