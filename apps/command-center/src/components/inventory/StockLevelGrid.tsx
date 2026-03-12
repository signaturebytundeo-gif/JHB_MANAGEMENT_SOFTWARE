'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { InventoryAlertBadge } from '@/components/inventory/InventoryAlertBadge';
import type { StockLevel } from '@/lib/utils/reorder-point';

type StockLevelData = {
  product: { id: string; name: string; sku: string; size: string; reorderPoint: number };
  locations: Array<{
    location: { id: string; name: string; type: string };
    quantity: number;
    stockLevel: StockLevel;
  }>;
  total: number;
}[];

type StockLevelFilter = 'ALL' | 'CRITICAL' | 'REORDER' | 'HEALTHY';
type SortKey = 'name' | 'total';

interface StockLevelGridProps {
  data: StockLevelData;
}

export function StockLevelGrid({ data }: StockLevelGridProps) {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<StockLevelFilter>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortAsc, setSortAsc] = useState(false);

  // Derive unique locations from data (preserving order)
  const locations = useMemo(() => {
    if (data.length === 0) return [];
    return data[0].locations.map((l) => l.location);
  }, [data]);

  // Filter and sort
  const filtered = useMemo(() => {
    let rows = data;

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (row) =>
          row.product.name.toLowerCase().includes(q) ||
          row.product.sku.toLowerCase().includes(q)
      );
    }

    // Stock level filter — show row if ANY location matches the level
    if (levelFilter !== 'ALL') {
      rows = rows.filter((row) =>
        row.locations.some((l) => l.stockLevel === levelFilter)
      );
    }

    // Sort
    rows = [...rows].sort((a, b) => {
      let diff = 0;
      if (sortKey === 'name') {
        diff = a.product.name.localeCompare(b.product.name);
      } else {
        diff = a.total - b.total;
      }
      return sortAsc ? diff : -diff;
    });

    return rows;
  }, [data, search, levelFilter, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  // Summary counts
  const criticalCount = data.filter((row) =>
    row.locations.some((l) => l.stockLevel === 'CRITICAL')
  ).length;
  const reorderCount = data.filter((row) =>
    row.locations.some((l) => l.stockLevel === 'REORDER')
  ).length;

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">
          No inventory data. Create batches and allocate to locations in Production.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary pills */}
      {(criticalCount > 0 || reorderCount > 0) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {criticalCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 font-semibold text-red-800 dark:bg-red-900/30 dark:text-red-400">
              {criticalCount} critical
            </span>
          )}
          {reorderCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 font-semibold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
              {reorderCount} reorder
            </span>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search product or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-1">
          {(['ALL', 'CRITICAL', 'REORDER', 'HEALTHY'] as StockLevelFilter[]).map((level) => (
            <button
              key={level}
              onClick={() => setLevelFilter(level)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                levelFilter === level
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {level === 'ALL' ? 'All' : level.charAt(0) + level.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="min-w-[200px] cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => toggleSort('name')}
              >
                Product {sortKey === 'name' ? (sortAsc ? '↑' : '↓') : ''}
              </TableHead>
              {locations.map((loc) => (
                <TableHead key={loc.id} className="text-center min-w-[100px]">
                  {loc.name}
                </TableHead>
              ))}
              <TableHead
                className="text-center min-w-[80px] cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => toggleSort('total')}
              >
                Total {sortKey === 'total' ? (sortAsc ? '↑' : '↓') : ''}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={locations.length + 2}
                  className="text-center py-8 text-muted-foreground text-sm"
                >
                  No products match the current filter.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.product.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{row.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.product.sku} &middot; {row.product.size}
                      </p>
                    </div>
                  </TableCell>
                  {row.locations.map((l) => (
                    <TableCell key={l.location.id} className="text-center">
                      <InventoryAlertBadge
                        currentStock={l.quantity}
                        stockLevel={l.stockLevel}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    <span className="font-mono font-semibold text-sm">
                      {row.total.toLocaleString()}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card layout */}
      <div className="lg:hidden space-y-3">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No products match the current filter.
          </p>
        ) : (
          filtered.map((row) => (
            <div
              key={row.product.id}
              className="rounded-lg border bg-card p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{row.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.product.sku} &middot; {row.product.size}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-mono font-semibold text-sm">
                    {row.total.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                {row.locations
                  .filter((l) => l.quantity > 0)
                  .map((l) => (
                  <div
                    key={l.location.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground text-xs">{l.location.name}</span>
                    <InventoryAlertBadge
                      currentStock={l.quantity}
                      stockLevel={l.stockLevel}
                    />
                  </div>
                ))}
                {row.locations.every((l) => l.quantity === 0) && (
                  <p className="text-xs text-muted-foreground">No stock at any location</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
