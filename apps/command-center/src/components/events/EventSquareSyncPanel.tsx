'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { syncSquareForEvent, type EventSquareSyncResult } from '@/app/actions/events';

interface EventSquareSyncPanelProps {
  eventId: string;
  eventName: string;
  eventDate: string;
  currentRevenue: number;
}

export function EventSquareSyncPanel({
  eventId,
  eventName,
  eventDate,
  currentRevenue,
}: EventSquareSyncPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<EventSquareSyncResult | null>(null);

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const handleSync = () => {
    startTransition(async () => {
      const res = await syncSquareForEvent(eventId);
      setResult(res);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Square Reconciliation
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Pull Square payments for {eventDate} and match to this event
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={isPending}
          className="px-4 py-2 bg-caribbean-green text-white text-sm font-medium rounded-md hover:bg-caribbean-green/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Syncing...' : 'Sync Square for this date'}
        </button>
      </div>

      {result && (
        <div className="space-y-3">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-3 bg-caribbean-black-light rounded-md">
              <p className="text-xs text-gray-400">Square Gross (inc. tax)</p>
              <p className="text-lg font-bold text-caribbean-gold">{fmt(result.squareTotal)}</p>
            </div>
            <div className="p-3 bg-caribbean-black-light rounded-md">
              <p className="text-xs text-gray-400">Sales Tax Collected</p>
              <p className="text-lg font-bold text-amber-400">{fmt(result.squareTax)}</p>
            </div>
            <div className="p-3 bg-caribbean-black-light rounded-md">
              <p className="text-xs text-gray-400">Net Sales (pre-tax)</p>
              <p className="text-lg font-bold text-green-400">{fmt(result.squareNetSales)}</p>
            </div>
          </div>

          {/* Reconciliation row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-3 bg-caribbean-black-light rounded-md">
              <p className="text-xs text-gray-400">Event Revenue</p>
              <p className="text-lg font-bold text-white">{fmt(result.eventTotal)}</p>
            </div>
            <div className="p-3 bg-caribbean-black-light rounded-md">
              <p className="text-xs text-gray-400">Difference</p>
              <p
                className={`text-lg font-bold ${
                  Math.abs(result.eventTotal - result.squareTotal) < 0.01
                    ? 'text-green-400'
                    : 'text-amber-400'
                }`}
              >
                {fmt(result.eventTotal - result.squareTotal)}
              </p>
            </div>
            <div className="p-3 bg-caribbean-black-light rounded-md">
              <p className="text-xs text-gray-400">Payments</p>
              <p className="text-lg font-bold text-white">{result.squarePayments}</p>
            </div>
          </div>

          {/* Sync details */}
          <div className="text-sm text-gray-300 space-y-1">
            {result.salesCreated > 0 && (
              <p className="text-green-400">
                + {result.salesCreated} sale{result.salesCreated !== 1 ? 's' : ''} synced from Square
                {result.salesNeedReview > 0 && (
                  <span className="text-amber-400">
                    {' '}({result.salesNeedReview} auto-matched — check ⚠ items below)
                  </span>
                )}
              </p>
            )}
            {result.duplicatesSkipped > 0 && (
              <p className="text-gray-500">
                {result.duplicatesSkipped} already synced (skipped)
              </p>
            )}
            {result.success &&
              result.salesCreated === 0 &&
              result.duplicatesSkipped > 0 && (
                <p className="text-green-400">
                  All Square payments already synced — event is up to date
                </p>
              )}
            {result.success && result.salesCreated > 0 && result.salesNeedReview === 0 && (
              <p className="text-green-400">
                All items matched perfectly — no review needed
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
