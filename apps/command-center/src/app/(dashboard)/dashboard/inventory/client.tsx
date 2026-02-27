'use client';

import { useState, useTransition } from 'react';
import { LowStockAlerts } from '@/components/inventory/LowStockAlerts';
import { InventorySummaryTable } from '@/components/inventory/InventorySummaryTable';
import { StockAdjustmentForm } from '@/components/inventory/StockAdjustmentForm';
import { InventoryTransferForm } from '@/components/inventory/InventoryTransferForm';
import { TransactionLog, type TransactionRecord } from '@/components/inventory/TransactionLog';
import { getTransactionLog } from '@/app/actions/inventory';

interface InventoryItem {
  productId: string;
  productName: string;
  sku: string;
  size: string;
  currentStock: number;
  locationBreakdown: {
    locationId: string;
    locationName: string;
    stock: number;
  }[];
}

interface TransactionLogData {
  transactions: TransactionRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface InventoryPageClientProps {
  summary: InventoryItem[];
  initialTransactionLog: TransactionLogData;
  products: { id: string; name: string; sku: string; size: string }[];
  locations: { id: string; name: string }[];
}

type Tab = 'overview' | 'log';

export function InventoryPageClient({
  summary,
  initialTransactionLog,
  products,
  locations,
}: InventoryPageClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [threshold, setThreshold] = useState(10);
  const [transactionLog, setTransactionLog] = useState<TransactionLogData>(initialTransactionLog);
  const [isPending, startTransition] = useTransition();

  const handleFilterChange = (filters: {
    productId?: string;
    locationId?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
  }) => {
    startTransition(async () => {
      const result = await getTransactionLog({
        productId: filters.productId,
        locationId: filters.locationId,
        type: filters.type as any,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        page: filters.page,
      });
      setTransactionLog(result);
    });
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-caribbean-green text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Stock Overview
          </button>
          <button
            onClick={() => setActiveTab('log')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'log'
                ? 'border-caribbean-green text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Transaction Log
            {transactionLog.total > 0 && (
              <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {transactionLog.total}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Stock Overview Tab */}
      {activeTab === 'overview' && (
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
      )}

      {/* Transaction Log Tab */}
      {activeTab === 'log' && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Transaction History</h2>
          <div className={isPending ? 'opacity-50 pointer-events-none' : ''}>
            <TransactionLog
              transactions={transactionLog.transactions}
              total={transactionLog.total}
              page={transactionLog.page}
              pageSize={transactionLog.pageSize}
              totalPages={transactionLog.totalPages}
              products={products}
              locations={locations}
              onFilterChange={handleFilterChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}
