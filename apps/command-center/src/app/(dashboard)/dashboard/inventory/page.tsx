import { Suspense } from 'react';
import { getInventorySummary, getLocations } from '@/app/actions/inventory';
import { getProducts } from '@/app/actions/sales';
import { LowStockAlerts } from '@/components/inventory/LowStockAlerts';
import { InventorySummaryTable } from '@/components/inventory/InventorySummaryTable';
import { StockAdjustmentForm } from '@/components/inventory/StockAdjustmentForm';
import { InventoryTransferForm } from '@/components/inventory/InventoryTransferForm';
import { InventoryPageClient } from './client';

async function InventoryContent() {
  const [summary, products, locations] = await Promise.all([
    getInventorySummary(),
    getProducts(),
    getLocations(),
  ]);

  return (
    <InventoryPageClient
      summary={summary}
      products={products}
      locations={locations}
    />
  );
}

function InventoryLoading() {
  return (
    <div className="space-y-6 animate-pulse">
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
          Monitor stock levels across all locations and manage transfers.
        </p>
      </div>

      <Suspense fallback={<InventoryLoading />}>
        <InventoryContent />
      </Suspense>
    </div>
  );
}
