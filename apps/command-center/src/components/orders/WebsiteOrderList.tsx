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
import { getWebsiteOrders, updateOrderStatus } from '@/app/actions/orders';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import { format } from 'date-fns';
import type { OrderStatus } from '@prisma/client';

type OrderRow = {
  id: string;
  orderId: string;
  items: string;
  shippingCost: number | { toString(): string };
  orderTotal: number | { toString(): string };
  status: OrderStatus;
  orderDate: Date;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

interface WebsiteOrderListProps {
  initialOrders: OrderRow[];
  initialTotal: number;
  initialPage: number;
  initialTotalPages: number;
}

const STATUS_BADGES: Record<OrderStatus, { label: string; className: string }> = {
  NEW: { label: 'New', className: 'bg-caribbean-gold text-black' },
  PROCESSING: { label: 'Processing', className: 'bg-blue-500 text-white' },
  SHIPPED: { label: 'Shipped', className: 'bg-green-500 text-white' },
  DELIVERED: { label: 'Delivered', className: 'bg-emerald-500 text-white' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-500 text-white' },
};

const STATUS_OPTIONS: OrderStatus[] = ['NEW', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

function parseItems(itemsJson: string): { name: string; qty: number }[] {
  try {
    const parsed = JSON.parse(itemsJson);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => ({
        name: item.name || item.product || 'Unknown',
        qty: item.qty || item.quantity || 1,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export function WebsiteOrderList({
  initialOrders,
  initialTotal,
  initialPage,
  initialTotalPages,
}: WebsiteOrderListProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [total, setTotal] = useState(initialTotal);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  const fetchPage = (newPage: number, status?: string) => {
    startTransition(async () => {
      const result = await getWebsiteOrders({
        page: newPage,
        status: status ? (status as OrderStatus) : undefined,
      });
      setOrders(result.orders as unknown as OrderRow[]);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    });
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    const result = await updateOrderStatus(orderId, newStatus);
    if (result.success) {
      toast.success(result.message);
      fetchPage(page, statusFilter || undefined);
    } else {
      toast.error(result.message);
    }
  };

  const statuses = ['', ...STATUS_OPTIONS];

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2 flex-wrap">
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
          {total} order{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No website orders found
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const badge = STATUS_BADGES[order.status];
                const items = parseItems(order.items);
                return (
                  <TableRow key={order.id}>
                    <TableCell className="text-sm">
                      {format(new Date(order.orderDate), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">
                        {order.status === 'NEW' && (
                          <Circle className="w-2 h-2 fill-caribbean-gold text-caribbean-gold inline mr-1.5" />
                        )}
                        {order.customer.firstName} {order.customer.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.customer.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {items.length > 0
                          ? items.map((item, i) => (
                              <span key={i}>
                                {item.name} x{item.qty}
                                {i < items.length - 1 ? ', ' : ''}
                              </span>
                            ))
                          : '—'}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      ${Number(order.orderTotal).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className={badge.className}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <select
                        value={order.status}
                        onChange={(e) =>
                          handleStatusChange(order.id, e.target.value as OrderStatus)
                        }
                        className="text-xs bg-muted border rounded px-2 py-1 text-foreground"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_BADGES[s].label}
                          </option>
                        ))}
                      </select>
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
