import { Suspense } from 'react';
import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { getStockLevels, getInventoryAggregation } from '@/app/actions/inventory';
import { getInventorySummary, getTransactionLog, getLocations } from '@/app/actions/inventory';
import { getProducts } from '@/app/actions/sales';
import { StockLevelGrid } from '@/components/inventory/StockLevelGrid';
import { InventoryAggregationTable } from '@/components/inventory/InventoryAggregationTable';
import { InventoryPageClient } from './client';

async function StockLevelContent() {
  const stockData = await getStockLevels();
  const totalSKUs = stockData.length;
  const totalUnits = stockData.reduce((sum, row) => sum + row.total, 0);
  const criticalCount = stockData.filter((row) =>
    row.locations.some((l) => l.stockLevel === 'CRITICAL')
  ).length;
  const reorderCount = stockData.filter((row) =>
    row.locations.some((l) => l.stockLevel === 'REORDER')
  ).length;

  return (
    <div className="space-y-6">
      {/* Summary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total SKUs</p>
          <p className="text-2xl font-bold mt-1">{totalSKUs}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Units</p>
          <p className="text-2xl font-bold mt-1">{totalUnits.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Critical</p>
          <p className={`text-2xl font-bold mt-1 ${criticalCount > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
            {criticalCount}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Reorder</p>
          <p className={`text-2xl font-bold mt-1 ${reorderCount > 0 ? 'text-yellow-600 dark:text-yellow-400' : ''}`}>
            {reorderCount}
          </p>
        </div>
      </div>

      {/* Stock Level Grid */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Stock Levels by Location</h2>
        <StockLevelGrid data={stockData} />
      </div>
    </div>
  );
}

async function LegacyInventoryContent() {
  const [summary, transactionLog, products, locations] = await Promise.all([
    getInventorySummary(),
    getTransactionLog(),
    getProducts(),
    getLocations(),
  ]);

  return (
    <InventoryPageClient
      summary={summary}
      initialTransactionLog={transactionLog}
      products={products}
      locations={locations}
    />
  );
}

async function AggregationContent() {
  const data = await getInventoryAggregation();
  return <InventoryAggregationTable data={data} />;
}

function InventoryLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded-lg" />
        ))}
      </div>
      <div className="h-64 bg-muted rounded-lg" />
    </div>
  );
}

export default async function InventoryPage() {
  await verifySession();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
        <p className="text-muted-foreground mt-2">
          Real-time stock levels across all locations with color-coded alerts.
        </p>
      </div>

      {/* Sub-page navigation */}
      <nav className="flex flex-wrap gap-2 border-b border-border pb-3">
        <Link
          href="/dashboard/inventory"
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-foreground text-background"
        >
          Stock Levels
        </Link>
        <Link
          href="/dashboard/inventory/transfers"
          className="px-3 py-1.5 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Transfers
        </Link>
        <Link
          href="/dashboard/inventory/adjustments"
          className="px-3 py-1.5 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Adjustments
        </Link>
        <Link
          href="/dashboard/inventory/packaging"
          className="px-3 py-1.5 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Packaging
        </Link>
        <Link
          href="/dashboard/inventory/audit-trail"
          className="px-3 py-1.5 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Audit Trail
        </Link>
      </nav>

      {/* Phase 3 real-time stock level grid */}
      <Suspense fallback={<InventoryLoading />}>
        <StockLevelContent />
      </Suspense>

      {/* Phase 9 — Website Order Inventory aggregation */}
      <div className="pt-4 border-t border-border">
        <h2 className="text-lg font-semibold mb-2">Website Order Inventory</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Available units = released batches produced minus non-cancelled website orders
        </p>
        <Suspense fallback={<InventoryLoading />}>
          <AggregationContent />
        </Suspense>
      </div>

      {/* Legacy inventory management (transfers, adjustments, transaction log) */}
      <div className="pt-4 border-t border-border">
        <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
          Legacy Inventory Tools
        </h2>
        <Suspense fallback={<div className="h-64 bg-muted rounded-lg animate-pulse" />}>
          <LegacyInventoryContent />
        </Suspense>
      </div>
    </div>
  );
}
