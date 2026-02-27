'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface LocationBreakdown {
  locationId: string;
  locationName: string;
  allocated: number;
  adjusted: number;
  stock: number;
}

interface InventoryItem {
  productId: string;
  productName: string;
  sku: string;
  size: string;
  produced: number;
  sold: number;
  adjusted: number;
  currentStock: number;
  locationBreakdown: LocationBreakdown[];
}

interface InventorySummaryTableProps {
  items: InventoryItem[];
  threshold: number;
  onThresholdChange: (threshold: number) => void;
}

export function InventorySummaryTable({
  items,
  threshold,
  onThresholdChange,
}: InventorySummaryTableProps) {
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const toggleExpanded = (productId: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label htmlFor="threshold" className="whitespace-nowrap text-sm">
          Low-stock threshold:
        </Label>
        <Input
          id="threshold"
          type="number"
          value={threshold}
          onChange={(e) => onThresholdChange(parseInt(e.target.value, 10) || 0)}
          className="w-24 h-9"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Size</TableHead>
              <TableHead className="text-right">Produced</TableHead>
              <TableHead className="text-right">Sold</TableHead>
              <TableHead className="text-right">Adjusted</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No inventory data available. Release batches to see stock levels.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const isExpanded = expandedProducts.has(item.productId);
                const hasLocations = item.locationBreakdown.length > 0;
                const isLowStock = item.currentStock < threshold;

                return (
                  <>
                    <TableRow
                      key={item.productId}
                      className={hasLocations ? 'cursor-pointer hover:bg-muted/50' : ''}
                      onClick={() => hasLocations && toggleExpanded(item.productId)}
                    >
                      <TableCell className="w-8">
                        {hasLocations && (
                          isExpanded
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{item.sku}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{item.size}</TableCell>
                      <TableCell className="text-right font-mono">
                        {item.produced.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.sold.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.adjusted >= 0 ? '+' : ''}{item.adjusted.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono font-semibold ${
                          isLowStock ? 'text-red-600 dark:text-red-400' : 'text-caribbean-green'
                        }`}>
                          {item.currentStock.toLocaleString()}
                        </span>
                        {isLowStock && (
                          <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0">
                            Low
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                    {isExpanded && item.locationBreakdown.map((loc) => (
                      <TableRow key={`${item.productId}-${loc.locationId}`} className="bg-muted/30">
                        <TableCell></TableCell>
                        <TableCell colSpan={3} className="text-sm text-muted-foreground pl-8">
                          {loc.locationName}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {loc.allocated.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          —
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {loc.adjusted >= 0 ? '+' : ''}{loc.adjusted.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-medium">
                          {loc.stock.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
