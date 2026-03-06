'use client';

import { useState, useTransition } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { InventoryAlertBadge } from '@/components/inventory/InventoryAlertBadge';
import { updateProductThreshold } from '@/app/actions/inventory';
import type { InventoryAggregationRow } from '@/app/actions/inventory';

// ============================================================================
// ThresholdCell — inline-editable reorderPoint cell
// ============================================================================

interface ThresholdCellProps {
  productId: string;
  reorderPoint: number;
}

function ThresholdCell({ productId, reorderPoint }: ThresholdCellProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(reorderPoint);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateProductThreshold(productId, value);
      if (result.success) {
        toast.success('Threshold updated');
        setEditing(false);
      } else {
        toast.error(result.message ?? 'Failed to update');
      }
    });
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min={0}
          step={1}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-20 h-7 text-xs"
          disabled={isPending}
        />
        <Button
          size="sm"
          variant="default"
          className="h-7 px-2 text-xs"
          onClick={handleSave}
          disabled={isPending}
        >
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={() => {
            setValue(reorderPoint);
            setEditing(false);
          }}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span>{reorderPoint}</span>
      <button
        onClick={() => setEditing(true)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Edit threshold"
      >
        <Pencil size={14} />
      </button>
    </div>
  );
}

// ============================================================================
// InventoryAggregationTable — main export
// ============================================================================

interface InventoryAggregationTableProps {
  data: InventoryAggregationRow[];
}

export function InventoryAggregationTable({ data }: InventoryAggregationTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 text-sm">
        No active products found. Create products and release batches to see inventory data.
      </div>
    );
  }

  const totalProduced = data.reduce((sum, row) => sum + row.totalProduced, 0);
  const totalAllocated = data.reduce((sum, row) => sum + row.allocated, 0);
  const totalAvailable = data.reduce((sum, row) => sum + row.available, 0);

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Size</TableHead>
            <TableHead className="text-right">Produced</TableHead>
            <TableHead className="text-right">Allocated</TableHead>
            <TableHead className="text-right">Available</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Threshold</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.productId}>
              <TableCell className="font-mono text-xs">{row.sku}</TableCell>
              <TableCell>{row.productName}</TableCell>
              <TableCell>{row.size}</TableCell>
              <TableCell className="text-right">{row.totalProduced.toLocaleString()}</TableCell>
              <TableCell className="text-right">{row.allocated.toLocaleString()}</TableCell>
              <TableCell className="text-right font-semibold">
                {row.available.toLocaleString()}
              </TableCell>
              <TableCell>
                <InventoryAlertBadge
                  currentStock={row.available}
                  stockLevel={row.stockLevel}
                />
              </TableCell>
              <TableCell>
                <ThresholdCell
                  productId={row.productId}
                  reorderPoint={row.reorderPoint}
                />
              </TableCell>
            </TableRow>
          ))}
          {/* Summary row */}
          <TableRow className="border-t-2 font-semibold bg-muted/50">
            <TableCell colSpan={3} className="text-sm">Total</TableCell>
            <TableCell className="text-right">{totalProduced.toLocaleString()}</TableCell>
            <TableCell className="text-right">{totalAllocated.toLocaleString()}</TableCell>
            <TableCell className="text-right">{totalAvailable.toLocaleString()}</TableCell>
            <TableCell colSpan={2} />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
