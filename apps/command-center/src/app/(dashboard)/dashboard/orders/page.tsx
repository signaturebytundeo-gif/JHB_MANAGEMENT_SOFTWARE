import { Suspense } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getSales, getChannels, getProducts, getLocationsForSale } from '@/app/actions/sales';
import { getWebsiteOrders } from '@/app/actions/orders';
import { getMarketplaceStatus, getSyncHistory } from '@/app/actions/marketplace-sync';
import { getOperatorOrders } from '@/app/actions/operator-orders';
import { SaleForm } from '@/components/sales/SaleForm';
import { SaleList } from '@/components/sales/SaleList';
import { WebsiteOrderList } from '@/components/orders/WebsiteOrderList';
import { MarketplaceSyncPanel } from '@/components/marketplace/MarketplaceSyncPanel';
import { OperatorOrderList } from '@/components/orders/OperatorOrderList';
import { OrdersTabs } from './tabs';

async function SalesContent() {
  const [sales, channels, products, locations] = await Promise.all([
    getSales(),
    getChannels(),
    getProducts(),
    getLocationsForSale(),
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
      {/* Left: Sale Form */}
      <div className="lg:col-span-1">
        <div className="rounded-lg border bg-card p-4 lg:p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold mb-4">Log a Sale</h2>
          <SaleForm channels={channels} products={products} locations={locations} />
        </div>
      </div>

      {/* Right: Sales List */}
      <div className="lg:col-span-2">
        <div className="rounded-lg border bg-card p-4 lg:p-6">
          <h2 className="text-lg font-semibold mb-4">Sales History</h2>
          <SaleList sales={sales} channels={channels} products={products} />
        </div>
      </div>
    </div>
  );
}

async function WebsiteOrdersContent() {
  const result = await getWebsiteOrders();

  return (
    <div className="rounded-lg border bg-card p-4 lg:p-6">
      <h2 className="text-lg font-semibold mb-4">Website Orders</h2>
      <WebsiteOrderList
        initialOrders={result.orders as any}
        initialTotal={result.total}
        initialPage={result.page}
        initialTotalPages={result.totalPages}
      />
    </div>
  );
}

async function OperatorOrdersContent() {
  const orders = await getOperatorOrders();

  return (
    <div className="rounded-lg border bg-card p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Purchase Orders</h2>
        <Link
          href="/dashboard/orders/new"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-caribbean-green text-white text-sm font-medium hover:bg-caribbean-green/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Order
        </Link>
      </div>
      <OperatorOrderList orders={orders} />
    </div>
  );
}

async function MarketplaceSyncContent() {
  const [statuses, history] = await Promise.all([
    getMarketplaceStatus(),
    getSyncHistory(),
  ]);

  return (
    <div className="rounded-lg border bg-card p-6">
      <MarketplaceSyncPanel
        initialStatuses={statuses}
        initialHistory={history as any}
      />
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

function OrdersLoading() {
  return (
    <div className="rounded-lg border bg-card p-6 animate-pulse">
      <div className="h-6 bg-muted rounded w-40 mb-4" />
      <div className="h-48 bg-muted rounded" />
    </div>
  );
}

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Orders & Sales</h1>
          <p className="text-muted-foreground mt-2">
            Log sales by channel and track revenue across all platforms.
          </p>
        </div>
        <Link
          href="/dashboard/orders/new"
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-caribbean-green text-white text-sm font-medium hover:bg-caribbean-green/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Order
        </Link>
      </div>

      <OrdersTabs
        manualSales={
          <Suspense fallback={<SalesLoading />}>
            <SalesContent />
          </Suspense>
        }
        websiteOrders={
          <Suspense fallback={<OrdersLoading />}>
            <WebsiteOrdersContent />
          </Suspense>
        }
        marketplaceSync={
          <Suspense fallback={<OrdersLoading />}>
            <MarketplaceSyncContent />
          </Suspense>
        }
        operatorOrders={
          <Suspense fallback={<OrdersLoading />}>
            <OperatorOrdersContent />
          </Suspense>
        }
      />
    </div>
  );
}
