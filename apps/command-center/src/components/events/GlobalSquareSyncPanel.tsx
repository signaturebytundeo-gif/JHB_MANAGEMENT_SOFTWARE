'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { globalSquareSync, autoAssignAllSalesByDate, type GlobalSquareSyncResult } from '@/app/actions/events';
import { Button } from '@/components/ui/button';
import { CalendarIcon, DollarSign, CheckCircle, XCircle, Zap } from 'lucide-react';

export function GlobalSquareSyncPanel() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<GlobalSquareSyncResult | null>(null);
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default to last 30 days
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split('T')[0]; // Default to today
  });

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const handleGlobalSync = () => {
    startTransition(async () => {
      const res = await globalSquareSync(dateFrom, dateTo);
      setResult(res);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleAutoAssign = () => {
    startTransition(async () => {
      const res = await autoAssignAllSalesByDate();
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <div className="rounded-lg border-2 border-caribbean-green bg-gradient-to-r from-caribbean-green/10 to-blue-600/10 p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-caribbean-green animate-pulse" />
          <h3 className="font-bold text-lg text-white">🚀 Square Sync & Auto-Assign</h3>
        </div>
      </div>

      {/* Description */}
      <div className="bg-caribbean-black/50 p-4 rounded-lg mb-4">
        <p className="text-caribbean-gold font-medium mb-2">⚡ NEW AUTOMATED WORKFLOW:</p>
        <p className="text-sm text-gray-300">
          1. <strong>Sync</strong> pulls latest Square transactions → 2. <strong>Auto-assign</strong> matches them to events by date
        </p>
        <p className="text-xs text-gray-400 mt-1">💡 Requires MANAGER/ADMIN role</p>
      </div>

      {/* Date Range Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="text-sm font-medium">From Date</label>
          <div className="relative">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background"
              disabled={isPending}
            />
            <CalendarIcon className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">To Date</label>
          <div className="relative">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background"
              disabled={isPending}
            />
            <CalendarIcon className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <div className="flex items-end gap-2">
          <Button
            onClick={handleGlobalSync}
            disabled={isPending || !dateFrom || !dateTo}
            className="flex-1 bg-caribbean-green hover:bg-caribbean-green/90"
          >
            {isPending ? 'Syncing...' : 'Sync All Square Transactions'}
          </Button>
          <Button
            onClick={handleAutoAssign}
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isPending ? 'Assigning...' : 'Auto-assign by Date'}
          </Button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-muted rounded-md text-center">
              <p className="text-xs text-muted-foreground">Total Payments</p>
              <p className="text-lg font-bold">{result.totalPayments}</p>
            </div>
            <div className="p-3 bg-muted rounded-md text-center">
              <p className="text-xs text-muted-foreground">Events Matched</p>
              <p className="text-lg font-bold text-green-600">{result.eventsMatched}</p>
            </div>
            <div className="p-3 bg-muted rounded-md text-center">
              <p className="text-xs text-muted-foreground">Sales Created</p>
              <p className="text-lg font-bold text-blue-600">{result.salesCreated}</p>
            </div>
            <div className="p-3 bg-muted rounded-md text-center">
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className="text-lg font-bold text-caribbean-green">{fmt(result.totalSquareAmount)}</p>
            </div>
          </div>

          {/* Date Range */}
          <div className="text-sm text-muted-foreground">
            <strong>Date Range:</strong> {result.dateRange}
          </div>

          {/* Event Details */}
          {result.eventDetails.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Events Synced</h4>
              <div className="space-y-2">
                {result.eventDetails.map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium">{event.eventName}</p>
                        <p className="text-sm text-muted-foreground">{event.eventDate}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{fmt(event.squareAmount)}</p>
                      <p className="text-sm text-muted-foreground">{event.salesCreated} sales</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unmatched Payments Warning */}
          {result.unmatchedPayments > 0 && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <XCircle className="h-4 w-4 text-orange-600" />
              <div className="text-sm">
                <p className="font-medium text-orange-800">
                  {result.unmatchedPayments} payments couldn't be matched
                </p>
                <p className="text-orange-700">
                  These payments occurred on dates without corresponding events.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}