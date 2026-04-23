'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { assignSalesToEvent, unassignSalesFromEvent } from '@/app/actions/events';

interface SaleItem {
  id: string;
  saleDate: Date;
  quantity: number;
  totalAmount: number;
  product: { id: string; name: string };
  paymentMethod?: string;
  notes: string | null;
}

interface AssignSalesPanelProps {
  eventId: string;
  unassignedSales: SaleItem[];
  assignedSales: SaleItem[];
  eventDate?: Date;
}

export function AssignSalesPanel({
  eventId,
  unassignedSales,
  assignedSales,
  eventDate,
}: AssignSalesPanelProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [dateFilter, setDateFilter] = useState('');

  // Filter unassigned sales based on date filter
  const filteredSales = dateFilter
    ? unassignedSales.filter((sale) => {
        const saleDate = new Date(sale.saleDate).toISOString().split('T')[0];
        return saleDate === dateFilter;
      })
    : unassignedSales;

  // Find sales that match the event date
  const dateMarchingSales = eventDate
    ? unassignedSales.filter((sale) => {
        const saleDate = new Date(sale.saleDate).toISOString().split('T')[0];
        const eventDateStr = new Date(eventDate).toISOString().split('T')[0];
        return saleDate === eventDateStr;
      })
    : [];

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredSales.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSales.map((s) => s.id)));
    }
  };

  const autoAssignByDate = () => {
    if (dateMarchingSales.length === 0) return;
    setSelectedIds(new Set(dateMarchingSales.map((s) => s.id)));
    // Auto-assign immediately
    startTransition(async () => {
      const result = await assignSalesToEvent(eventId, dateMarchingSales.map((s) => s.id));
      if (result.success) {
        toast.success(`Auto-assigned ${dateMarchingSales.length} sales by date match`);
        setSelectedIds(new Set());
      } else {
        toast.error(result.message);
      }
    });
  };

  const clearDateFilter = () => {
    setDateFilter('');
  };

  const handleAssign = () => {
    if (selectedIds.size === 0) return;
    startTransition(async () => {
      const result = await assignSalesToEvent(eventId, Array.from(selectedIds));
      if (result.success) {
        toast.success(result.message);
        setSelectedIds(new Set());
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleUnassign = (saleIds: string[]) => {
    startTransition(async () => {
      const result = await unassignSalesFromEvent(saleIds);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  };

  return (
    <div className="space-y-6">
      {/* Assigned Sales */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">
          Assigned Sales ({assignedSales.length})
        </h3>
        {assignedSales.length === 0 ? (
          <p className="text-sm text-gray-500">No sales assigned to this event yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-caribbean-gold/20 text-left text-gray-400">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">Payment</th>
                  <th className="pb-2 font-medium text-right">Qty</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                  <th className="pb-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {assignedSales.map((sale) => {
                  const needsReview = sale.notes?.startsWith('⚠ Review');
                  return (
                  <tr key={sale.id} className={`border-b ${needsReview ? 'border-amber-500/30 bg-amber-500/5' : 'border-caribbean-gold/10'}`}>
                    <td className="py-2 text-gray-300">
                      {needsReview && <span className="text-amber-400 mr-1" title="Auto-matched — please verify">⚠</span>}
                      {fmtDate(sale.saleDate)}
                    </td>
                    <td className="py-2">
                      <span className="text-white">{sale.product.name}</span>
                      {sale.notes && (
                        <p className={`text-xs mt-0.5 truncate max-w-[250px] ${needsReview ? 'text-amber-400/70' : 'text-gray-500'}`}>{sale.notes}</p>
                      )}
                    </td>
                    <td className="py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        sale.paymentMethod === 'SQUARE' ? 'bg-blue-500/20 text-blue-400' :
                        sale.paymentMethod === 'CASH' ? 'bg-green-500/20 text-green-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {sale.paymentMethod ?? 'CASH'}
                      </span>
                    </td>
                    <td className="py-2 text-right text-gray-300">{sale.quantity}</td>
                    <td className="py-2 text-right text-green-400">{fmt(sale.totalAmount)}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => handleUnassign([sale.id])}
                        disabled={isPending}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unassigned Sales */}
      {unassignedSales.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">
              Unassigned Square Sales ({filteredSales.length}{dateFilter ? ` of ${unassignedSales.length}` : ''})
            </h3>
          </div>

          {/* Date Filter and Auto-Assign Controls */}
          <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-caribbean-black/30 rounded-md">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400">Filter by date:</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-2 py-1 bg-caribbean-black border border-caribbean-gold/20 rounded text-xs text-white"
              />
              {dateFilter && (
                <button
                  onClick={clearDateFilter}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {dateMarchingSales.length > 0 && (
                <button
                  onClick={autoAssignByDate}
                  disabled={isPending}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Auto-assign {dateMarchingSales.length} by Date
                </button>
              )}
              <button
                onClick={selectAll}
                className="text-xs text-caribbean-gold hover:underline"
              >
                {selectedIds.size === filteredSales.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={handleAssign}
                disabled={isPending || selectedIds.size === 0}
                className="px-3 py-1 bg-caribbean-green text-white text-xs rounded hover:bg-caribbean-green/90 disabled:opacity-50"
              >
                {isPending ? 'Assigning...' : `Assign ${selectedIds.size} Selected`}
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-caribbean-gold/20 text-left text-gray-400">
                  <th className="pb-2 w-8"></th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium text-right">Qty</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="border-b border-caribbean-gold/10 cursor-pointer hover:bg-caribbean-green/5"
                    onClick={() => toggleId(sale.id)}
                  >
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(sale.id)}
                        onChange={() => toggleId(sale.id)}
                        className="rounded border-caribbean-gold/30"
                      />
                    </td>
                    <td className="py-2 text-gray-300">{fmtDate(sale.saleDate)}</td>
                    <td className="py-2">
                      <span className="text-white">{sale.product.name}</span>
                      {sale.notes && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{sale.notes}</p>
                      )}
                    </td>
                    <td className="py-2 text-right text-gray-300">{sale.quantity}</td>
                    <td className="py-2 text-right text-green-400">{fmt(sale.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
