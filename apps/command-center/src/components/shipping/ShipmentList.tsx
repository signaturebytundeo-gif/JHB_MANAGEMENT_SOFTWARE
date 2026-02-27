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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { voidShipmentLabel, refreshTracking, getShipments } from '@/app/actions/shipping';
import { toast } from 'sonner';
import { Download, Ban, RefreshCw, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import type { ShipmentStatus } from '@prisma/client';

type ShipmentRow = {
  id: string;
  status: ShipmentStatus;
  recipientName: string;
  trackingNumber: string | null;
  labelData: string | null;
  shippingCost: number | null;
  serviceCode: string;
  createdAt: Date;
  createdBy: { name: string };
  shipFromLocation: { name: string } | null;
};

interface ShipmentListProps {
  initialShipments: ShipmentRow[];
  initialTotal: number;
  initialPage: number;
  initialTotalPages: number;
}

const STATUS_BADGES: Record<ShipmentStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-gray-500 text-white' },
  LABEL_CREATED: { label: 'Label Created', className: 'bg-blue-500 text-white' },
  SHIPPED: { label: 'Shipped', className: 'bg-caribbean-green text-white' },
  DELIVERED: { label: 'Delivered', className: 'bg-emerald-500 text-white' },
  VOIDED: { label: 'Voided', className: 'bg-red-500 text-white' },
};

function downloadLabel(labelData: string, trackingNumber: string) {
  const byteString = atob(labelData);
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'image/png' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `label-${trackingNumber || 'unknown'}.png`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ShipmentList({
  initialShipments,
  initialTotal,
  initialPage,
  initialTotalPages,
}: ShipmentListProps) {
  const [shipments, setShipments] = useState(initialShipments);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [total, setTotal] = useState(initialTotal);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  const fetchPage = (newPage: number, status?: string) => {
    startTransition(async () => {
      const result = await getShipments({
        page: newPage,
        status: status ? (status as ShipmentStatus) : undefined,
      });
      setShipments(result.shipments as unknown as ShipmentRow[]);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    });
  };

  const handleVoid = async (shipmentId: string) => {
    if (!confirm('Are you sure you want to void this label? This cannot be undone.')) return;

    const result = await voidShipmentLabel(shipmentId);
    if (result.success) {
      toast.success(result.message);
      fetchPage(page, statusFilter || undefined);
    } else {
      toast.error(result.message);
    }
  };

  const handleRefreshTracking = async (shipmentId: string) => {
    const result = await refreshTracking(shipmentId);
    if (result.success) {
      toast.success(`Status: ${result.message}`);
      fetchPage(page, statusFilter || undefined);
    } else {
      toast.error(result.message);
    }
  };

  const statuses = ['', 'DRAFT', 'LABEL_CREATED', 'SHIPPED', 'DELIVERED', 'VOIDED'];

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          {statuses.map((s) => (
            <button
              key={s || 'all'}
              onClick={() => {
                setStatusFilter(s);
                fetchPage(1, s);
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-caribbean-green text-white'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        <span className="text-sm text-muted-foreground ml-auto">
          {total} shipment{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Tracking #</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shipments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No shipments found
                </TableCell>
              </TableRow>
            ) : (
              shipments.map((shipment) => {
                const badge = STATUS_BADGES[shipment.status];
                return (
                  <TableRow key={shipment.id}>
                    <TableCell className="text-sm">
                      {format(new Date(shipment.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{shipment.recipientName}</div>
                      <div className="text-xs text-muted-foreground">
                        by {shipment.createdBy.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {shipment.trackingNumber ? (
                        <a
                          href={`https://www.ups.com/track?tracknum=${shipment.trackingNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-caribbean-gold hover:underline inline-flex items-center gap-1"
                        >
                          {shipment.trackingNumber}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={badge.className}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {shipment.shippingCost != null
                        ? `$${shipment.shippingCost.toFixed(2)}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {shipment.labelData && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              downloadLabel(shipment.labelData!, shipment.trackingNumber || '')
                            }
                            title="Download Label"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        {shipment.status === 'LABEL_CREATED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVoid(shipment.id)}
                            title="Void Label"
                            className="text-red-400 hover:text-red-300"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}
                        {shipment.trackingNumber &&
                          shipment.status !== 'VOIDED' &&
                          shipment.status !== 'DELIVERED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRefreshTracking(shipment.id)}
                              title="Refresh Tracking"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isPending}
            onClick={() => fetchPage(page - 1, statusFilter || undefined)}
            className="border-caribbean-gold"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isPending}
            onClick={() => fetchPage(page + 1, statusFilter || undefined)}
            className="border-caribbean-gold"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
