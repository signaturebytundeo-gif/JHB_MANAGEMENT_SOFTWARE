import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { InventoryAlertBadge } from '@/components/inventory/InventoryAlertBadge';
import type { InventoryAggregationRow } from '@/app/actions/inventory';

interface InventoryStatusSummaryProps {
  data: InventoryAggregationRow[];
}

export function InventoryStatusSummary({ data }: InventoryStatusSummaryProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border bg-card">
        <div className="text-center text-muted-foreground py-8 text-sm">
          No inventory data available
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Available</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.productId}>
              <TableCell className="font-mono text-xs">{row.sku}</TableCell>
              <TableCell>{row.productName}</TableCell>
              <TableCell className="text-right font-semibold">
                {row.available.toLocaleString()}
              </TableCell>
              <TableCell>
                <InventoryAlertBadge
                  currentStock={row.available}
                  stockLevel={row.stockLevel}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="px-4 py-3 border-t">
        <Link
          href="/dashboard/inventory"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          View full inventory
        </Link>
      </div>
    </div>
  );
}
