'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type AuditMovement = {
  id: string;
  movementType: string;
  transferType: string | null;
  batchCode: string;
  productName: string;
  productSku: string;
  fromLocation: string | null;
  toLocation: string | null;
  quantity: number;
  reason: string | null;
  notes: string | null;
  requiresApproval: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  createdBy: string;
  createdAt: string;
};

interface AuditTrailTableProps {
  movements: AuditMovement[];
}

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  PRODUCTION: 'Production',
  TRANSFER: 'Transfer',
  ADJUSTMENT: 'Adjustment',
  ALLOCATION: 'Allocation',
  DEDUCTION: 'Deduction',
};

const REASON_LABELS: Record<string, string> = {
  DAMAGE: 'Damage',
  SHRINKAGE: 'Shrinkage',
  SAMPLING: 'Sampling',
  EXPIRED: 'Expired',
  COUNT_CORRECTION: 'Count Correction',
};

const TRANSFER_TYPE_LABELS: Record<string, string> = {
  RESTOCK: 'Restock',
  FULFILLMENT: 'Fulfillment',
  ADJUSTMENT: 'Adjustment',
  RETURN: 'Return',
};

function transferTypeBadgeVariant(
  transferType: string | null
): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' {
  switch (transferType) {
    case 'RESTOCK':
      return 'success';
    case 'FULFILLMENT':
      return 'default';
    case 'ADJUSTMENT':
      return 'warning';
    case 'RETURN':
      return 'outline';
    default:
      return 'secondary';
  }
}

function movementTypeBadgeVariant(
  type: string
): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' {
  switch (type) {
    case 'PRODUCTION':
      return 'success';
    case 'TRANSFER':
      return 'default';
    case 'ADJUSTMENT':
      return 'warning';
    case 'DEDUCTION':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function approvalStatus(m: AuditMovement): { label: string; variant: 'success' | 'warning' | 'secondary' } {
  if (!m.requiresApproval) {
    return { label: 'Auto-Approved', variant: 'success' };
  }
  if (m.approvedAt) {
    return { label: 'Approved', variant: 'success' };
  }
  return { label: 'Pending', variant: 'warning' };
}

function quantityDisplay(m: AuditMovement): string {
  // Inbound movements: toLocation set, fromLocation null
  // Outbound movements: fromLocation set, toLocation null
  // Transfers show context via from/to
  if (m.movementType === 'ADJUSTMENT') {
    const isPositive = m.toLocation !== null;
    return isPositive ? `+${m.quantity}` : `-${m.quantity}`;
  }
  if (m.movementType === 'DEDUCTION') {
    return `-${m.quantity}`;
  }
  return `${m.quantity}`;
}

function formatDate(iso: string): string {
  try {
    return format(new Date(iso), 'MMM d, yyyy h:mm a');
  } catch {
    return iso;
  }
}

export function AuditTrailTable({ movements }: AuditTrailTableProps) {
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [productFilter, setProductFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');

  // Derive unique products from data
  const products = useMemo(() => {
    const seen = new Set<string>();
    const list: { sku: string; name: string }[] = [];
    for (const m of movements) {
      if (!seen.has(m.productSku)) {
        seen.add(m.productSku);
        list.push({ sku: m.productSku, name: m.productName });
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [movements]);

  // Derive unique locations from data
  const locationNames = useMemo(() => {
    const seen = new Set<string>();
    for (const m of movements) {
      if (m.fromLocation) seen.add(m.fromLocation);
      if (m.toLocation) seen.add(m.toLocation);
    }
    return [...seen].sort();
  }, [movements]);

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      if (typeFilter !== 'ALL' && m.movementType !== typeFilter) return false;
      if (productFilter !== 'ALL' && m.productSku !== productFilter) return false;
      if (
        locationFilter !== 'ALL' &&
        m.fromLocation !== locationFilter &&
        m.toLocation !== locationFilter
      ) {
        return false;
      }
      return true;
    });
  }, [movements, typeFilter, productFilter, locationFilter]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-full sm:w-auto min-w-[160px]">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Movement type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="PRODUCTION">Production</SelectItem>
              <SelectItem value="TRANSFER">Transfer</SelectItem>
              <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
              <SelectItem value="ALLOCATION">Allocation</SelectItem>
              <SelectItem value="DEDUCTION">Deduction</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-auto min-w-[180px]">
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Products</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.sku} value={p.sku}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-auto min-w-[180px]">
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Locations</SelectItem>
              {locationNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(typeFilter !== 'ALL' || productFilter !== 'ALL' || locationFilter !== 'ALL') && (
          <button
            onClick={() => {
              setTypeFilter('ALL');
              setProductFilter('ALL');
              setLocationFilter('ALL');
            }}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 h-9 self-center"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Result count */}
      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} of {movements.length} movements
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No movements match the selected filters.
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Date / Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => {
                  const status = approvalStatus(m);
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                        {formatDate(m.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={movementTypeBadgeVariant(m.movementType)}>
                            {MOVEMENT_TYPE_LABELS[m.movementType] ?? m.movementType}
                          </Badge>
                          {m.transferType && (
                            <Badge variant={transferTypeBadgeVariant(m.transferType)} className="text-xs">
                              {TRANSFER_TYPE_LABELS[m.transferType] ?? m.transferType}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {m.productName}
                        <span className="ml-1 text-xs text-muted-foreground">({m.productSku})</span>
                      </TableCell>
                      <TableCell className="text-sm font-mono">{m.batchCode}</TableCell>
                      <TableCell className="text-sm">{m.fromLocation ?? '—'}</TableCell>
                      <TableCell className="text-sm">{m.toLocation ?? '—'}</TableCell>
                      <TableCell
                        className={`text-sm text-right font-semibold ${
                          quantityDisplay(m).startsWith('+')
                            ? 'text-green-600 dark:text-green-400'
                            : quantityDisplay(m).startsWith('-')
                            ? 'text-red-600 dark:text-red-400'
                            : ''
                        }`}
                      >
                        {quantityDisplay(m)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {m.reason ? (REASON_LABELS[m.reason] ?? m.reason) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{m.createdBy}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile card layout */}
          <div className="md:hidden space-y-3">
            {filtered.map((m) => {
              const status = approvalStatus(m);
              const qty = quantityDisplay(m);
              return (
                <div key={m.id} className="rounded-lg border bg-card p-4 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{m.productName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{m.batchCode}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={movementTypeBadgeVariant(m.movementType)}>
                        {MOVEMENT_TYPE_LABELS[m.movementType] ?? m.movementType}
                      </Badge>
                      {m.transferType && (
                        <Badge variant={transferTypeBadgeVariant(m.transferType)} className="text-xs">
                          {TRANSFER_TYPE_LABELS[m.transferType] ?? m.transferType}
                        </Badge>
                      )}
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">From</span>
                      <p>{m.fromLocation ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">To</span>
                      <p>{m.toLocation ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">Quantity</span>
                      <p
                        className={`font-semibold ${
                          qty.startsWith('+')
                            ? 'text-green-600 dark:text-green-400'
                            : qty.startsWith('-')
                            ? 'text-red-600 dark:text-red-400'
                            : ''
                        }`}
                      >
                        {qty}
                      </p>
                    </div>
                    {m.reason && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Reason</span>
                        <p>{REASON_LABELS[m.reason] ?? m.reason}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                    <span>{m.createdBy}</span>
                    <span>{formatDate(m.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
