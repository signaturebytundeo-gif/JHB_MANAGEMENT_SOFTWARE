'use client';

import { useState, useMemo, useTransition } from 'react';
import { format } from 'date-fns';
import { Download, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SaleEditModal } from './SaleEditModal';
import { deleteSales } from '@/app/actions/sales';
import { toast } from 'sonner';

interface Sale {
  id: string;
  saleDate: string | Date;
  quantity: number;
  unitPrice: unknown;
  totalAmount: unknown;
  paymentMethod: string;
  referenceNumber: string | null;
  notes: string | null;
  channel: { id: string; name: string };
  product: { id: string; name: string; sku: string };
  createdBy: { id: string; name: string };
}

interface SaleListProps {
  sales: Sale[];
  channels: { id: string; name: string }[];
  products: { id: string; name: string }[];
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CREDIT_CARD: 'Card',
  SQUARE: 'Square',
  STRIPE: 'Stripe',
  ZELLE: 'Zelle',
  CHECK: 'Check',
  NET_30: 'Net 30',
  AMAZON_PAY: 'Amazon',
  OTHER: 'Other',
};

export function SaleList({ sales, channels, products }: SaleListProps) {
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      if (channelFilter !== 'all' && sale.channel.id !== channelFilter) return false;
      if (productFilter !== 'all' && sale.product.id !== productFilter) return false;
      return true;
    });
  }, [sales, channelFilter, productFilter]);

  const totalRevenue = filteredSales.reduce(
    (sum, sale) => sum + Number(sale.totalAmount),
    0
  );

  // Channel revenue summary
  const revenueByChannel = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; count: number }>();
    filteredSales.forEach((sale) => {
      const existing = map.get(sale.channel.id);
      if (existing) {
        existing.revenue += Number(sale.totalAmount);
        existing.count += 1;
      } else {
        map.set(sale.channel.id, {
          name: sale.channel.name,
          revenue: Number(sale.totalAmount),
          count: 1,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  const exportCSV = () => {
    const headers = ['Date', 'Channel', 'Product', 'SKU', 'Qty', 'Unit Price', 'Total', 'Payment', 'Reference', 'Notes', 'Created By'];
    const rows = filteredSales.map((sale) => [
      format(new Date(sale.saleDate), 'yyyy-MM-dd'),
      sale.channel.name,
      sale.product.name,
      sale.product.sku,
      sale.quantity.toString(),
      Number(sale.unitPrice).toFixed(2),
      Number(sale.totalAmount).toFixed(2),
      PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod,
      sale.referenceNumber || '',
      sale.notes || '',
      sale.createdBy.name,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredSales.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSales.map((s) => s.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected sale${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`)) return;

    startTransition(async () => {
      const result = await deleteSales(Array.from(selectedIds));
      if (result.success) {
        toast.success(result.message);
        setSelectedIds(new Set());
      } else {
        toast.error(result.message || 'Failed to delete sales');
      }
    });
  };

  const editingSale = editingSaleId ? sales.find((s) => s.id === editingSaleId) : null;

  return (
    <div className="space-y-4">
      {/* Channel Revenue Summary */}
      {revenueByChannel.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {revenueByChannel.map((ch) => (
            <div
              key={ch.name}
              className="rounded-lg border bg-card p-3"
            >
              <div className="text-xs text-muted-foreground">{ch.name}</div>
              <div className="text-lg font-bold text-caribbean-green">
                ${ch.revenue.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                {ch.count} sale{ch.count !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters + Actions */}
      <div className="flex flex-wrap gap-3">
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-[180px] h-10">
            <SelectValue placeholder="All Channels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            {channels.map((ch) => (
              <SelectItem key={ch.id} value={ch.id}>
                {ch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={productFilter} onValueChange={setProductFilter}>
          <SelectTrigger className="w-[180px] h-10">
            <SelectValue placeholder="All Products" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={exportCSV} className="h-10">
          <Download className="h-4 w-4 mr-2" />
          CSV
        </Button>

        <div className="flex items-center ml-auto text-sm text-muted-foreground">
          {filteredSales.length} sale{filteredSales.length !== 1 ? 's' : ''} — Total:{' '}
          <span className="font-semibold text-caribbean-green ml-1">
            ${totalRevenue.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-4 py-2 border">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {isPending ? 'Deleting...' : 'Delete Selected'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear Selection
          </Button>
        </div>
      )}

      {/* Sales Table */}
      {filteredSales.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          No sales recorded yet. Use the form to log your first sale.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredSales.length && filteredSales.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Channel</th>
                  <th className="text-left p-3 font-medium">Product</th>
                  <th className="text-right p-3 font-medium">Qty</th>
                  <th className="text-right p-3 font-medium">Unit Price</th>
                  <th className="text-right p-3 font-medium">Total</th>
                  <th className="text-left p-3 font-medium">Payment</th>
                  <th className="text-left p-3 font-medium">Ref #</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={(e) => {
                      // Don't open edit if clicking checkbox
                      if ((e.target as HTMLElement).tagName === 'INPUT') return;
                      setEditingSaleId(sale.id);
                    }}
                  >
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(sale.id)}
                        onChange={() => toggleSelect(sale.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {format(new Date(sale.saleDate), 'MMM d, yyyy')}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="border-caribbean-gold/50 text-caribbean-gold">
                        {sale.channel.name}
                      </Badge>
                    </td>
                    <td className="p-3">{sale.product.name}</td>
                    <td className="p-3 text-right font-mono">{sale.quantity}</td>
                    <td className="p-3 text-right font-mono">
                      ${Number(sale.unitPrice).toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-caribbean-green">
                      ${Number(sale.totalAmount).toFixed(2)}
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary">
                        {PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {sale.referenceNumber || '\u2014'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingSale && (
        <SaleEditModal
          sale={editingSale}
          channels={channels}
          products={products}
          onClose={() => setEditingSaleId(null)}
        />
      )}
    </div>
  );
}
