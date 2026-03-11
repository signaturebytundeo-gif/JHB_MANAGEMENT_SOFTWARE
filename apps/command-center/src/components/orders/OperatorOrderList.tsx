'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { OrderStatusBadge } from './OrderStatusBadge';
import type { OperatorOrderListItem } from '@/app/actions/operator-orders';

interface OperatorOrderListProps {
  orders: OperatorOrderListItem[];
}

const STATUS_OPTIONS = [
  '',
  'DRAFT',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
];

export function OperatorOrderList({ orders }: OperatorOrderListProps) {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const filtered = orders.filter((order) => {
    if (statusFilter && order.status !== statusFilter) return false;
    if (search && !order.orderNumber.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order number..."
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setStatusFilter(s)}
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
          {filtered.length} order{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No operator orders found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm font-medium">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell className="text-sm">
                    {order.customer
                      ? `${order.customer.firstName} ${order.customer.lastName}`
                      : <span className="text-muted-foreground italic">No customer</span>}
                  </TableCell>
                  <TableCell className="text-sm">{order.channel.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {order.lineItems.length} item{order.lineItems.length !== 1 ? 's' : ''}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    ${order.totalAmount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(order.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="text-xs text-muted-foreground hover:text-caribbean-green underline"
                    >
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            No operator orders found
          </div>
        ) : (
          filtered.map((order) => (
            <Link
              key={order.id}
              href={`/dashboard/orders/${order.id}`}
              className="block rounded-lg border bg-card p-4 space-y-2 hover:border-caribbean-green/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-semibold">{order.orderNumber}</span>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="text-sm text-muted-foreground">
                {order.customer
                  ? `${order.customer.firstName} ${order.customer.lastName}`
                  : 'No customer linked'}
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">
                  {order.channel.name} · {order.lineItems.length} item{order.lineItems.length !== 1 ? 's' : ''}
                </span>
                <span className="text-sm font-semibold">${order.totalAmount.toFixed(2)}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(order.createdAt), 'MMM d, yyyy')}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
