'use client';

import { useState, useMemo, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { InventoryAlertBadge } from '@/components/inventory/InventoryAlertBadge';
import type { EnhancedStockLevelRow } from '@/app/actions/inventory';
import { fulfillOnlineOrder } from '@/app/actions/inventory';
import { toast } from 'sonner';
import { Calendar, Clock, TrendingDown, Package } from 'lucide-react';

type StockLevelFilter = 'ALL' | 'CRITICAL' | 'REORDER' | 'HEALTHY' | 'STALE';
type SortKey = 'name' | 'total' | 'daysSinceRestock';

interface EnhancedStockLevelGridProps {
  data: EnhancedStockLevelRow[];
}

interface SummaryBannerProps {
  staleLocationsCount: number;
  lowWarehouseStockCount: number;
  staleLocations: Array<{
    locationName: string;
    productName: string;
    daysSinceRestock: number;
  }>;
}

function SummaryBanner({ staleLocationsCount, lowWarehouseStockCount, staleLocations }: SummaryBannerProps) {
  if (staleLocationsCount === 0 && lowWarehouseStockCount === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
        <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
          <Package className="h-4 w-4" />
          <span className="text-sm font-medium">All inventory levels are healthy</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {lowWarehouseStockCount > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <TrendingDown className="h-4 w-4" />
            <span className="text-sm font-medium">
              {lowWarehouseStockCount} SKU{lowWarehouseStockCount !== 1 ? 's' : ''} below reorder threshold in main warehouse
            </span>
          </div>
        </div>
      )}

      {staleLocationsCount > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">
                {staleLocationsCount} location{staleLocationsCount !== 1 ? 's' : ''} haven't been restocked in 14+ days
              </span>
            </div>
            {staleLocations.slice(0, 3).map((item, idx) => (
              <div key={idx} className="text-xs text-yellow-700 dark:text-yellow-300">
                {item.locationName} - {item.productName} ({item.daysSinceRestock} days)
              </div>
            ))}
            {staleLocations.length > 3 && (
              <div className="text-xs text-yellow-600 dark:text-yellow-400">
                ...and {staleLocations.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickActionButton({
  productId,
  productName,
  onActionComplete
}: {
  productId: string;
  productName: string;
  onActionComplete: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleQuickFulfillment() {
    startTransition(async () => {
      const orderRef = `Quick Sale ${new Date().toLocaleDateString()}`;
      const result = await fulfillOnlineOrder(productId, 1, orderRef);

      if (result.success) {
        toast.success(`Recorded sale of 1 unit: ${productName}`);
        onActionComplete();
      } else {
        toast.error(result.message || 'Failed to record sale');
      }
    });
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleQuickFulfillment}
      disabled={isPending}
      className="h-7 text-xs"
    >
      {isPending ? 'Recording...' : 'Log Sale'}
    </Button>
  );
}

export function EnhancedStockLevelGrid({ data }: EnhancedStockLevelGridProps) {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<StockLevelFilter>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortAsc, setSortAsc] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Calculate summary data
  const summaryData = useMemo(() => {
    const staleLocations = data.flatMap(product =>
      product.locations.filter(loc =>
        loc.location.type === 'RESTAURANT' &&
        loc.daysSinceLastRestock !== null &&
        loc.daysSinceLastRestock >= 14 &&
        loc.quantity > 0
      ).map(loc => ({
        locationName: loc.location.name,
        productName: product.product.name,
        daysSinceRestock: loc.daysSinceLastRestock!,
      }))
    );

    const lowWarehouseStock = data.filter(product => product.belowThreshold);

    return {
      staleLocationsCount: staleLocations.length,
      lowWarehouseStockCount: lowWarehouseStock.length,
      staleLocations,
    };
  }, [data]);

  // Derive unique locations from data
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

    // Stock level filter
    if (levelFilter !== 'ALL') {
      if (levelFilter === 'STALE') {
        rows = rows.filter((row) =>
          row.locations.some((l) =>
            l.location.type === 'RESTAURANT' &&
            l.daysSinceLastRestock !== null &&
            l.daysSinceLastRestock >= 14
          )
        );
      } else {
        rows = rows.filter((row) =>
          row.locations.some((l) => l.stockLevel === levelFilter)
        );
      }
    }

    // Sort
    rows = [...rows].sort((a, b) => {
      let diff = 0;
      if (sortKey === 'name') {
        diff = a.product.name.localeCompare(b.product.name);
      } else if (sortKey === 'total') {
        diff = a.total - b.total;
      } else if (sortKey === 'daysSinceRestock') {
        const aMax = Math.max(...a.locations.map(l => l.daysSinceLastRestock ?? 0));
        const bMax = Math.max(...b.locations.map(l => l.daysSinceLastRestock ?? 0));
        diff = aMax - bMax;
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

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'Never';
    return new Date(isoString).toLocaleDateString();
  };

  const getQuantityColor = (quantity: number) => {
    if (quantity >= 50) return 'text-green-600 dark:text-green-400';
    if (quantity >= 20) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const handleActionComplete = () => {
    setRefreshKey(k => k + 1);
    // In a real app, you'd refetch the data here
  };

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
    <div className="space-y-6">
      {/* Summary Banner */}
      <SummaryBanner {...summaryData} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search product or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-1 flex-wrap">
          {(['ALL', 'CRITICAL', 'REORDER', 'HEALTHY', 'STALE'] as StockLevelFilter[]).map((level) => (
            <button
              key={level}
              onClick={() => setLevelFilter(level)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                levelFilter === level
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {level === 'ALL' ? 'All' :
               level === 'STALE' ? 'Stale (14+ days)' :
               level.charAt(0) + level.slice(1).toLowerCase()}
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
                <TableHead key={loc.id} className="text-center min-w-[120px]">
                  {loc.name}
                </TableHead>
              ))}
              <TableHead
                className="text-center min-w-[80px] cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => toggleSort('total')}
              >
                Total {sortKey === 'total' ? (sortAsc ? '↑' : '↓') : ''}
              </TableHead>
              <TableHead className="text-center min-w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={locations.length + 3}
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
                        {row.product.sku} • {row.product.size}
                      </p>
                      {row.belowThreshold && (
                        <Badge variant="destructive" className="text-xs mt-1">
                          Below threshold ({row.product.reorderPoint})
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  {row.locations.map((l) => (
                    <TableCell key={l.location.id} className="text-center">
                      <div className="space-y-1">
                        <div className={`font-mono font-semibold ${getQuantityColor(l.quantity)}`}>
                          {l.quantity}
                        </div>
                        {l.location.type === 'RESTAURANT' && (
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {l.daysSinceLastRestock !== null && (
                              <div className={`flex items-center justify-center gap-1 ${l.daysSinceLastRestock >= 14 ? 'text-yellow-600' : ''}`}>
                                <Clock className="h-3 w-3" />
                                {l.daysSinceLastRestock}d
                              </div>
                            )}
                            {l.lastSoldThroughDate && (
                              <div className="flex items-center justify-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(l.lastSoldThroughDate)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    <span className={`font-mono font-semibold text-sm ${getQuantityColor(row.total)}`}>
                      {row.total.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <QuickActionButton
                      productId={row.product.id}
                      productName={row.product.name}
                      onActionComplete={handleActionComplete}
                    />
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
                <div className="flex-1">
                  <p className="font-semibold text-sm">{row.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.product.sku} • {row.product.size}
                  </p>
                  {row.belowThreshold && (
                    <Badge variant="destructive" className="text-xs mt-1">
                      Below threshold
                    </Badge>
                  )}
                </div>
                <div className="text-right space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className={`font-mono font-semibold text-sm ${getQuantityColor(row.total)}`}>
                      {row.total.toLocaleString()}
                    </p>
                  </div>
                  <QuickActionButton
                    productId={row.product.id}
                    productName={row.product.name}
                    onActionComplete={handleActionComplete}
                  />
                </div>
              </div>

              <div className="space-y-2">
                {row.locations
                  .filter((l) => l.quantity > 0 || l.location.type === 'RESTAURANT')
                  .map((l) => (
                  <div
                    key={l.location.id}
                    className="flex items-center justify-between text-sm border-t pt-2"
                  >
                    <div className="flex-1">
                      <span className="text-muted-foreground text-xs">{l.location.name}</span>
                      {l.location.type === 'RESTAURANT' && (
                        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                          {l.daysSinceLastRestock !== null && (
                            <div className={`flex items-center gap-1 ${l.daysSinceLastRestock >= 14 ? 'text-yellow-600' : ''}`}>
                              <Clock className="h-3 w-3" />
                              {l.daysSinceLastRestock}d ago
                            </div>
                          )}
                          {l.lastSoldThroughDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Sold: {formatDate(l.lastSoldThroughDate)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className={`font-mono font-semibold ${getQuantityColor(l.quantity)}`}>
                      {l.quantity}
                    </div>
                  </div>
                ))}
                {row.locations.every((l) => l.quantity === 0) && (
                  <p className="text-xs text-muted-foreground border-t pt-2">No stock at any location</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}