'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { SyncPlatform, SyncStatus } from '@prisma/client';

interface LastSync {
  status: SyncStatus;
  startedAt: Date;
  completedAt: Date | null;
  recordsFound: number;
  recordsCreated: number;
  recordsSkipped: number;
  errorMessage: string | null;
}

interface PlatformCardProps {
  platform: SyncPlatform;
  configured: boolean;
  missingVars: string[];
  lastSync?: LastSync;
  isSyncing: boolean;
  onSync: () => void;
}

const PLATFORM_LABELS: Record<SyncPlatform, string> = {
  SQUARE: 'Square',
  AMAZON: 'Amazon',
  ETSY: 'Etsy',
};

const PLATFORM_COLORS: Record<SyncPlatform, string> = {
  SQUARE: 'bg-black text-white',
  AMAZON: 'bg-orange-500 text-white',
  ETSY: 'bg-orange-600 text-white',
};

const SYNC_STATUS_BADGE: Record<SyncStatus, { label: string; className: string }> = {
  RUNNING: { label: 'Running', className: 'bg-blue-500 text-white' },
  SUCCESS: { label: 'Success', className: 'bg-green-500 text-white' },
  PARTIAL: { label: 'Partial', className: 'bg-yellow-500 text-white' },
  FAILED: { label: 'Failed', className: 'bg-red-500 text-white' },
};

export function PlatformCard({
  platform,
  configured,
  missingVars,
  lastSync,
  isSyncing,
  onSync,
}: PlatformCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{PLATFORM_LABELS[platform]}</CardTitle>
          <Badge className={configured ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}>
            {configured ? 'Connected' : 'Not Configured'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {configured ? (
          <div className="space-y-3">
            <Button
              size="sm"
              onClick={onSync}
              disabled={isSyncing}
              className="w-full bg-caribbean-green hover:bg-caribbean-green/90 text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>

            {lastSync && (
              <div className="text-xs space-y-1 text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Last sync:</span>
                  <Badge className={SYNC_STATUS_BADGE[lastSync.status].className}>
                    {SYNC_STATUS_BADGE[lastSync.status].label}
                  </Badge>
                </div>
                <div>
                  {formatDistanceToNow(new Date(lastSync.startedAt), { addSuffix: true })}
                </div>
                <div>
                  {lastSync.recordsCreated} imported, {lastSync.recordsSkipped} skipped
                </div>
                {lastSync.errorMessage && (
                  <div className="text-red-400 text-xs truncate" title={lastSync.errorMessage}>
                    {lastSync.errorMessage}
                  </div>
                )}
              </div>
            )}

            {!lastSync && (
              <p className="text-xs text-muted-foreground">No syncs yet</p>
            )}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Add these environment variables to connect:</p>
            <ul className="list-disc list-inside">
              {missingVars.map((v) => (
                <li key={v} className="font-mono">{v}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
