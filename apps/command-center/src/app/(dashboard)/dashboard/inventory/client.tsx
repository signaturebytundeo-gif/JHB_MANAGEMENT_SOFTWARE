'use client';

import { useState } from 'react';
import { LowStockAlerts } from '@/components/inventory/LowStockAlerts';
import { InventorySummaryTable } from '@/components/inventory/InventorySummaryTable';
import { StockAdjustmentForm } from '@/components/inventory/StockAdjustmentForm';
import { InventoryTransferForm } from '@/components/inventory/InventoryTransferForm';

interface InventoryItem {
  productId: string;
  productName: string;
  sku: string;
  size: string;
  produced: number;
  sold: number;
  adjusted: number;
  currentStock: number;
  locationBreakdown: {
    locationId: string;
    locationName: string;
    allocated: number;
    adjusted: number;
    stock: number;
  }[];
}

interface InventoryPageClientProps {
  summary: InventoryItem[];
  products: { id: string; name: string }[];
  locations: { id: string; name: string }[];
}

export function InventoryPageClient({
  summary,
  products,
  locations,
}: InventoryPageClientProps) {
  const [threshold, setThreshold] = useState(100);

  return (
    <div className="space-y-6">
      <LowStockAlerts items={summary} threshold={threshold} />

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Stock Levels</h2>
        <InventorySummaryTable
          items={summary}
          threshold={threshold}
          onThresholdChange={setThreshold}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-card p-6">
          <StockAdjustmentForm products={products} locations={locations} />
        </div>
        <div className="rounded-lg border bg-card p-6">
          <InventoryTransferForm products={products} locations={locations} />
        </div>
      </div>
    </div>
  );
}
