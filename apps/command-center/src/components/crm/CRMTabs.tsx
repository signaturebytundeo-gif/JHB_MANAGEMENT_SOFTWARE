'use client';

import { useState, type ReactNode } from 'react';

interface CRMTabsProps {
  profiles: ReactNode;
  subscriptions: ReactNode;
  distributors: ReactNode;
  leads: ReactNode;
}

type TabId = 'profiles' | 'subscriptions' | 'distributors' | 'leads';

const TABS: { id: TabId; label: string }[] = [
  { id: 'profiles', label: 'Customer Profiles' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'distributors', label: 'Distributors' },
  { id: 'leads', label: 'Leads' },
];

export function CRMTabs({ profiles, subscriptions, distributors, leads }: CRMTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('profiles');

  const content: Record<TabId, ReactNode> = {
    profiles,
    subscriptions,
    distributors,
    leads,
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-caribbean-green text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {content[activeTab]}
    </div>
  );
}
