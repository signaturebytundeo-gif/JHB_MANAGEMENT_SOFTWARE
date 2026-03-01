'use client';

import { useState, type ReactNode } from 'react';

interface OrdersTabsProps {
  manualSales: ReactNode;
  websiteOrders: ReactNode;
}

export function OrdersTabs({ manualSales, websiteOrders }: OrdersTabsProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'website'>('manual');

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'manual'
              ? 'border-caribbean-green text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Manual Sales
        </button>
        <button
          onClick={() => setActiveTab('website')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'website'
              ? 'border-caribbean-green text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Website Orders
        </button>
      </div>

      {activeTab === 'manual' ? manualSales : websiteOrders}
    </div>
  );
}
