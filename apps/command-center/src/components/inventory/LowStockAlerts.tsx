'use client';

import { AlertTriangle } from 'lucide-react';

interface InventoryItem {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
}

interface LowStockAlertsProps {
  items: InventoryItem[];
  threshold: number;
}

export function LowStockAlerts({ items, threshold }: LowStockAlertsProps) {
  const lowStockItems = items.filter((item) => item.currentStock < threshold);

  if (lowStockItems.length === 0) return null;

  return (
    <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950/50">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">
          Low Stock Alerts
        </h3>
        <span className="text-xs bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 px-2 py-0.5 rounded-full">
          {lowStockItems.length} product{lowStockItems.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-2">
        {lowStockItems.map((item) => (
          <div
            key={item.productId}
            className="flex items-center justify-between text-sm"
          >
            <div>
              <span className="font-medium text-yellow-900 dark:text-yellow-200">
                {item.productName}
              </span>
              <span className="text-yellow-700 dark:text-yellow-400 ml-2 text-xs">
                {item.sku}
              </span>
            </div>
            <span className={`font-mono font-semibold ${
              item.currentStock <= 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-yellow-700 dark:text-yellow-400'
            }`}>
              {item.currentStock.toLocaleString()} units
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2">
        Threshold: below {threshold} units
      </p>
    </div>
  );
}
