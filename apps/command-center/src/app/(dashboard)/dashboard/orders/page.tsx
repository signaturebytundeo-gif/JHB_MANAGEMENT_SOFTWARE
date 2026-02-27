import { Suspense } from 'react';
import { getSales, getChannels, getProducts } from '@/app/actions/sales';
import { SaleForm } from '@/components/sales/SaleForm';
import { SaleList } from '@/components/sales/SaleList';

async function SalesContent() {
  const [sales, channels, products] = await Promise.all([
    getSales(),
    getChannels(),
    getProducts(),
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Sale Form */}
      <div className="lg:col-span-1">
        <div className="rounded-lg border bg-card p-6 sticky top-24">
          <h2 className="text-lg font-semibold mb-4">Log a Sale</h2>
          <SaleForm channels={channels} products={products} />
        </div>
      </div>

      {/* Right: Sales List */}
      <div className="lg:col-span-2">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Sales History</h2>
          <SaleList sales={sales} channels={channels} products={products} />
        </div>
      </div>
    </div>
  );
}

function SalesLoading() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <div className="rounded-lg border bg-card p-6 animate-pulse">
          <div className="h-6 bg-muted rounded w-32 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-11 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
      <div className="lg:col-span-2">
        <div className="rounded-lg border bg-card p-6 animate-pulse">
          <div className="h-6 bg-muted rounded w-40 mb-4" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Orders & Sales</h1>
        <p className="text-muted-foreground mt-2">
          Log sales by channel and track revenue across all platforms.
        </p>
      </div>

      <Suspense fallback={<SalesLoading />}>
        <SalesContent />
      </Suspense>
    </div>
  );
}
