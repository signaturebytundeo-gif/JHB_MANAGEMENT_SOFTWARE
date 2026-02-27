import { Suspense } from 'react';
import { getInventorySummary, getTransactionLog, getLocations } from '@/app/actions/inventory';
import { getProducts } from '@/app/actions/sales';
import { InventoryPageClient } from './client';

async function InventoryContent() {
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

function InventoryLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 bg-muted rounded-lg w-64" />
      <div className="h-20 bg-muted rounded-lg" />
      <div className="h-64 bg-muted rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-muted rounded-lg" />
        <div className="h-80 bg-muted rounded-lg" />
      </div>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
        <p className="text-muted-foreground mt-2">
          Monitor stock levels across all locations, manage transfers, and track all inventory transactions.
        </p>
      </div>

      <Suspense fallback={<InventoryLoading />}>
        <InventoryContent />
      </Suspense>
    </div>
  );
}
