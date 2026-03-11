'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ARAgingReport as ARAgingReportType, ARAgingBucket } from '@/app/actions/invoices';

interface ARAgingReportProps {
  report: ARAgingReportType;
}

const BUCKET_LABELS: Record<ARAgingBucket, string> = {
  CURRENT: 'Current',
  '1_30': '1–30 Days',
  '31_60': '31–60 Days',
  '61_90': '61–90 Days',
  '90_PLUS': '90+ Days',
};

const BUCKET_CARD_STYLES: Record<ARAgingBucket, string> = {
  CURRENT: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800',
  '1_30': 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800',
  '31_60': 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800',
  '61_90': 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800',
  '90_PLUS': 'bg-red-100 border-red-300 dark:bg-red-950/40 dark:border-red-700',
};

const BUCKET_VALUE_STYLES: Record<ARAgingBucket, string> = {
  CURRENT: 'text-green-700 dark:text-green-400',
  '1_30': 'text-yellow-700 dark:text-yellow-400',
  '31_60': 'text-orange-700 dark:text-orange-400',
  '61_90': 'text-red-700 dark:text-red-400',
  '90_PLUS': 'text-red-800 dark:text-red-300',
};

const BUCKET_BADGE_STYLES: Record<ARAgingBucket, string> = {
  CURRENT: 'bg-green-100 text-green-700',
  '1_30': 'bg-yellow-100 text-yellow-700',
  '31_60': 'bg-orange-100 text-orange-700',
  '61_90': 'bg-red-100 text-red-700',
  '90_PLUS': 'bg-red-200 text-red-800',
};

const BUCKET_OPTIONS: Array<ARAgingBucket | ''> = [
  '', 'CURRENT', '1_30', '31_60', '61_90', '90_PLUS',
];

type SortKey = 'daysPastDue' | 'outstanding';

export function ARAgingReport({ report }: ARAgingReportProps) {
  const [bucketFilter, setBucketFilter] = useState<ARAgingBucket | ''>('');
  const [sortKey, setSortKey] = useState<SortKey>('daysPastDue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = report.items
    .filter((item) => !bucketFilter || item.bucket === bucketFilter)
    .sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortDir === 'asc' ? diff : -diff;
    });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const summaryBuckets: Array<{ key: ARAgingBucket; value: number }> = [
    { key: 'CURRENT', value: report.summary.current },
    { key: '1_30', value: report.summary.days1_30 },
    { key: '31_60', value: report.summary.days31_60 },
    { key: '61_90', value: report.summary.days61_90 },
    { key: '90_PLUS', value: report.summary.days90Plus },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {summaryBuckets.map(({ key, value }) => (
          <div
            key={key}
            className={`rounded-lg border p-4 ${BUCKET_CARD_STYLES[key]}`}
          >
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {BUCKET_LABELS[key]}
            </p>
            <p className={`text-lg font-bold ${BUCKET_VALUE_STYLES[key]}`}>
              ${value.toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {/* Grand Total */}
      {report.summary.grandTotal > 0 && (
        <div className="flex justify-end">
          <div className="text-sm text-muted-foreground">
            Total Outstanding:{' '}
            <span className="font-bold text-foreground text-base">
              ${report.summary.grandTotal.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Filters + Sort */}
      <div className="flex flex-wrap gap-2 items-center">
        {BUCKET_OPTIONS.map((b) => (
          <button
            key={b || 'all'}
            onClick={() => setBucketFilter(b as ARAgingBucket | '')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              bucketFilter === b
                ? 'bg-caribbean-green text-white'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {b ? BUCKET_LABELS[b] : 'All'}
          </button>
        ))}
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} item{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Detail Table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No outstanding invoices found
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Order #</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort('outstanding')}
                    className="hover:text-foreground transition-colors flex items-center gap-1 ml-auto"
                  >
                    Outstanding
                    {sortKey === 'outstanding' && (
                      <span className="text-caribbean-green">
                        {sortDir === 'desc' ? '↓' : '↑'}
                      </span>
                    )}
                  </button>
                </TableHead>
                <TableHead className="text-center">
                  <button
                    onClick={() => handleSort('daysPastDue')}
                    className="hover:text-foreground transition-colors flex items-center gap-1 mx-auto"
                  >
                    Days Past Due
                    {sortKey === 'daysPastDue' && (
                      <span className="text-caribbean-green">
                        {sortDir === 'desc' ? '↓' : '↑'}
                      </span>
                    )}
                  </button>
                </TableHead>
                <TableHead>Bucket</TableHead>
                <TableHead>Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-sm font-medium">{item.customerName}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {item.invoiceNumber}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {item.orderNumber}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    ${item.totalAmount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-green-600">
                    ${item.paidAmount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold">
                    ${item.outstanding.toFixed(2)}
                    {item.lateFeeAmount > 0 && (
                      <div className="text-xs text-red-500 font-normal">
                        +${item.lateFeeAmount.toFixed(2)} late fee
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {item.daysPastDue > 0 ? (
                      <span className={item.daysPastDue > 90 ? 'text-red-700 font-bold' : item.daysPastDue > 60 ? 'text-red-600 font-medium' : item.daysPastDue > 30 ? 'text-orange-600' : 'text-yellow-600'}>
                        {item.daysPastDue}
                      </span>
                    ) : (
                      <span className="text-green-600">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${BUCKET_BADGE_STYLES[item.bucket]}`}
                    >
                      {BUCKET_LABELS[item.bucket]}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.dueDate ? format(new Date(item.dueDate), 'MMM d, yyyy') : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
