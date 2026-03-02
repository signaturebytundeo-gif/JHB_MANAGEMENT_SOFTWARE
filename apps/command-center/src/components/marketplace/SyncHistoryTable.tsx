'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { SyncPlatform, SyncStatus } from '@prisma/client';

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

interface SyncHistoryTableProps {
  syncs: SyncRecord[];
}

const STATUS_BADGE: Record<SyncStatus, { label: string; className: string }> = {
  RUNNING: { label: 'Running', className: 'bg-blue-500 text-white' },
  SUCCESS: { label: 'Success', className: 'bg-green-500 text-white' },
  PARTIAL: { label: 'Partial', className: 'bg-yellow-500 text-white' },
  FAILED: { label: 'Failed', className: 'bg-red-500 text-white' },
};

const PLATFORM_LABELS: Record<SyncPlatform, string> = {
  SQUARE: 'Square',
  AMAZON: 'Amazon',
  ETSY: 'Etsy',
};

export function SyncHistoryTable({ syncs }: SyncHistoryTableProps) {
  if (syncs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No sync history yet. Use the buttons above to start your first sync.
      </p>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Platform</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Completed</TableHead>
            <TableHead>Found</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Skipped</TableHead>
            <TableHead>Errors</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {syncs.map((sync) => {
            const badge = STATUS_BADGE[sync.status];
            return (
              <TableRow key={sync.id}>
                <TableCell className="text-sm font-medium">
                  {PLATFORM_LABELS[sync.platform]}
                </TableCell>
                <TableCell>
                  <Badge className={badge.className}>{badge.label}</Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {format(new Date(sync.startedAt), 'MMM d, h:mm a')}
                </TableCell>
                <TableCell className="text-sm">
                  {sync.completedAt
                    ? format(new Date(sync.completedAt), 'MMM d, h:mm a')
                    : '—'}
                </TableCell>
                <TableCell className="text-sm">{sync.recordsFound}</TableCell>
                <TableCell className="text-sm">{sync.recordsCreated}</TableCell>
                <TableCell className="text-sm">{sync.recordsSkipped}</TableCell>
                <TableCell className="text-sm text-red-400 max-w-[200px] truncate" title={sync.errorMessage ?? ''}>
                  {sync.errorMessage || '—'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
