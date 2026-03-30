'use client';

import { useState, type ReactNode } from 'react';

interface OrdersTabsProps {
  manualSales: ReactNode;
  websiteOrders: ReactNode;
  marketplaceSync: ReactNode;
  operatorOrders: ReactNode;
}

export function OrdersTabs({ manualSales, websiteOrders, marketplaceSync, operatorOrders }: OrdersTabsProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'website' | 'marketplace' | 'operator'>('manual');

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
        <button
          onClick={() => setActiveTab('marketplace')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'marketplace'
              ? 'border-caribbean-green text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Marketplace Sync
        </button>
        <button
          onClick={() => setActiveTab('operator')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'operator'
              ? 'border-caribbean-green text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Purchase Orders
        </button>
      </div>

      {activeTab === 'manual' && manualSales}
      {activeTab === 'website' && websiteOrders}
      {activeTab === 'marketplace' && marketplaceSync}
      {activeTab === 'operator' && operatorOrders}
    </div>
  );
}
