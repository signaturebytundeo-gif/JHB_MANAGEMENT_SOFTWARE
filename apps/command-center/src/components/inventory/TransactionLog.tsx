'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CSVExportButton } from './CSVExportButton';

export interface TransactionRecord {
  id: string;
  productName: string;
  productSku: string;
  productSize: string;
  locationName: string;
  type: string;
  quantityChange: number;
  referenceId: string | null;
  reason: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

interface TransactionLogProps {
  transactions: TransactionRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  products: { id: string; name: string; sku: string; size: string }[];
  locations: { id: string; name: string }[];
  onFilterChange: (filters: {
    productId?: string;
    locationId?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
  }) => void;
}

const TYPE_LABELS: Record<string, string> = {
  BATCH_COMPLETION: 'Batch Completion',
  TRANSFER_IN: 'Transfer In',
  TRANSFER_OUT: 'Transfer Out',
  SALE_DEDUCTION: 'Sale Deduction',
  ADJUSTMENT: 'Adjustment',
};

const TYPE_COLORS: Record<string, string> = {
  BATCH_COMPLETION: 'bg-green-600 text-white',
  TRANSFER_IN: 'bg-blue-600 text-white',
  TRANSFER_OUT: 'bg-orange-600 text-white',
  SALE_DEDUCTION: 'bg-red-600 text-white',
  ADJUSTMENT: 'bg-yellow-600 text-white',
};

export function TransactionLog({
  transactions,
  total,
  page,
  pageSize,
  totalPages,
  products,
  locations,
  onFilterChange,
}: TransactionLogProps) {
  const [filters, setFilters] = useState({
    productId: '',
    locationId: '',
    type: '',
    dateFrom: '',
    dateTo: '',
  });

  const updateFilter = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange({
      productId: newFilters.productId || undefined,
      locationId: newFilters.locationId || undefined,
      type: newFilters.type || undefined,
      dateFrom: newFilters.dateFrom || undefined,
      dateTo: newFilters.dateTo || undefined,
      page: 1,
    });
  };

  const clearFilters = () => {
    setFilters({ productId: '', locationId: '', type: '', dateFrom: '', dateTo: '' });
    onFilterChange({ page: 1 });
  };

  const goToPage = (newPage: number) => {
    onFilterChange({
      productId: filters.productId || undefined,
      locationId: filters.locationId || undefined,
      type: filters.type || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      page: newPage,
    });
  };

  const hasFilters = Object.values(filters).some((v) => v !== '');

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Product</Label>
          <Select value={filters.productId} onValueChange={(v) => updateFilter('productId', v)}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="All products" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} — {p.size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Location</Label>
          <Select value={filters.locationId} onValueChange={(v) => updateFilter('locationId', v)}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={filters.type} onValueChange={(v) => updateFilter('type', v)}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => updateFilter('dateFrom', e.target.value)}
            className="w-[140px] h-9"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => updateFilter('dateTo', e.target.value)}
            className="w-[140px] h-9"
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
            Clear
          </Button>
        )}

        <div className="ml-auto">
          <CSVExportButton transactions={transactions} />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No transactions found.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {new Date(t.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${TYPE_COLORS[t.type] || ''} text-[10px] px-1.5`}>
                      {TYPE_LABELS[t.type] || t.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{t.productName}</div>
                    <div className="text-xs text-muted-foreground">{t.productSku} — {t.productSize}</div>
                  </TableCell>
                  <TableCell className="text-sm">{t.locationName}</TableCell>
                  <TableCell className="text-right">
                    <span className={`font-mono font-semibold ${
                      t.quantityChange >= 0 ? 'text-caribbean-green' : 'text-red-500'
                    }`}>
                      {t.quantityChange >= 0 ? '+' : ''}{t.quantityChange.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {t.referenceId ? t.referenceId.slice(0, 12) : '—'}
                  </TableCell>
                  <TableCell className="text-sm">{t.createdBy}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {t.reason || t.notes || '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
