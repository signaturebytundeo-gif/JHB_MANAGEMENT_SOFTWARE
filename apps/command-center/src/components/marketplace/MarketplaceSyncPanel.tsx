'use client';

import { useState, useTransition } from 'react';
import { PlatformCard } from './PlatformCard';
import { SyncHistoryTable } from './SyncHistoryTable';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  syncSquarePayments,
  syncAmazonOrders,
  syncEtsyOrders,
  getMarketplaceStatus,
  getSyncHistory,
} from '@/app/actions/marketplace-sync';
import type { SyncPlatform, SyncStatus } from '@prisma/client';

interface PlatformStatusData {
  platform: SyncPlatform;
  configured: boolean;
  missingVars: string[];
  lastSync?: {
    status: SyncStatus;
    startedAt: Date;
    completedAt: Date | null;
    recordsFound: number;
    recordsCreated: number;
    recordsSkipped: number;
    errorMessage: string | null;
  };
}

interface SyncRecord {
  id: string;
  platform: SyncPlatform;
  status: SyncStatus;
  startedAt: Date;
  completedAt: Date | null;
  recordsFound: number;
  recordsCreated: number;
  recordsSkipped: number;
  errorMessage: string | null;
  triggeredBy: { id: string; name: string } | null;
}

interface MarketplaceSyncPanelProps {
  initialStatuses: PlatformStatusData[];
  initialHistory: SyncRecord[];
}

export function MarketplaceSyncPanel({
  initialStatuses,
  initialHistory,
}: MarketplaceSyncPanelProps) {
  const [statuses, setStatuses] = useState(initialStatuses);
  const [history, setHistory] = useState(initialHistory);
  const [syncingPlatforms, setSyncingPlatforms] = useState<Set<SyncPlatform>>(new Set());
  const [isPending, startTransition] = useTransition();

  const refreshData = () => {
    startTransition(async () => {
      const [newStatuses, newHistory] = await Promise.all([
        getMarketplaceStatus(),
        getSyncHistory(),
      ]);
      setStatuses(newStatuses);
      setHistory(newHistory as SyncRecord[]);
    });
  };

  const handleSync = async (platform: SyncPlatform) => {
    setSyncingPlatforms((prev) => new Set(prev).add(platform));

    try {
      let result;
      if (platform === 'SQUARE') {
        result = await syncSquarePayments();
      } else if (platform === 'AMAZON') {
        result = await syncAmazonOrders();
      } else {
        result = await syncEtsyOrders();
      }

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(`Sync failed: ${error.message}`);
    } finally {
      setSyncingPlatforms((prev) => {
        const next = new Set(prev);
        next.delete(platform);
        return next;
      });
      refreshData();
    }
  };

  const handleSyncAll = async () => {
    const configuredPlatforms = statuses
      .filter((s) => s.configured)
      .map((s) => s.platform);

    if (configuredPlatforms.length === 0) {
      toast.error('No platforms are configured');
      return;
    }

    for (const platform of configuredPlatforms) {
      await handleSync(platform);
    }
  };

  const isSyncingAny = syncingPlatforms.size > 0;

  return (
    <div className="space-y-6">
      {/* Platform Cards */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Marketplace Integrations</h2>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSyncAll}
          disabled={isSyncingAny}
          className="border-caribbean-gold"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isSyncingAny ? 'animate-spin' : ''}`} />
          Sync All
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statuses.map((status) => (
          <PlatformCard
            key={status.platform}
            platform={status.platform}
            configured={status.configured}
            missingVars={status.missingVars}
            lastSync={status.lastSync}
            isSyncing={syncingPlatforms.has(status.platform)}
            onSync={() => handleSync(status.platform)}
          />
        ))}
      </div>

      {/* Sync History */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Sync History</h2>
        <SyncHistoryTable syncs={history} />
      </div>
    </div>
  );
}
