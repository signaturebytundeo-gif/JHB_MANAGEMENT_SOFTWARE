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
import type { InvoiceListItem } from '@/app/actions/invoices';

interface InvoiceListProps {
  invoices: InvoiceListItem[];
}

const STATUS_OPTIONS = ['', 'DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'PAID', 'OVERDUE', 'VOID'];

const STATUS_BADGE_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  VIEWED: 'bg-blue-100 text-blue-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  VOID: 'bg-gray-100 text-gray-500',
};

function InvoiceStatusBadge({ status }: { status: string }) {
  const styles = STATUS_BADGE_STYLES[status] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles}`}>
      {status}
    </span>
  );
}

export function InvoiceList({ invoices }: InvoiceListProps) {
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = invoices.filter((inv) => {
    if (statusFilter && inv.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
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
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} invoice{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No invoices found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((invoice) => {
                const balance = invoice.totalAmount - invoice.paidAmount + (invoice.lateFeeAmount ?? 0);
                const isOverdue = invoice.status === 'OVERDUE';
                return (
                  <TableRow
                    key={invoice.id}
                    className={isOverdue ? 'bg-red-50 dark:bg-red-950/10' : ''}
                  >
                    <TableCell className="font-mono text-sm font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {invoice.order.orderNumber}
                    </TableCell>
                    <TableCell className="text-sm">
                      {invoice.customer
                        ? `${invoice.customer.firstName} ${invoice.customer.lastName}`
                        : <span className="text-muted-foreground italic">No customer</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      ${invoice.totalAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-green-600">
                      ${invoice.paidAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      <span className={isOverdue ? 'text-red-600' : ''}>
                        ${balance.toFixed(2)}
                      </span>
                      {isOverdue && invoice.lateFeeAmount > 0 && (
                        <div className="text-xs text-red-500">
                          +${invoice.lateFeeAmount.toFixed(2)} late fee
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {invoice.dueDate
                        ? <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                            {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                          </span>
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/finance/invoices/${invoice.id}`}
                        className="text-xs text-muted-foreground hover:text-caribbean-green underline"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            No invoices found
          </div>
        ) : (
          filtered.map((invoice) => {
            const balance = invoice.totalAmount - invoice.paidAmount + (invoice.lateFeeAmount ?? 0);
            const isOverdue = invoice.status === 'OVERDUE';
            return (
              <Link
                key={invoice.id}
                href={`/dashboard/finance/invoices/${invoice.id}`}
                className={`block rounded-lg border bg-card p-4 space-y-2 hover:border-caribbean-green/50 transition-colors ${
                  isOverdue ? 'border-red-200 bg-red-50 dark:bg-red-950/10' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold">{invoice.invoiceNumber}</span>
                  <InvoiceStatusBadge status={invoice.status} />
                </div>
                <div className="text-sm text-muted-foreground">
                  {invoice.customer
                    ? `${invoice.customer.firstName} ${invoice.customer.lastName}`
                    : 'No customer linked'}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {invoice.order.orderNumber}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-muted-foreground">
                    Due: {invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM d, yyyy') : '—'}
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${isOverdue ? 'text-red-600' : ''}`}>
                      Balance: ${balance.toFixed(2)}
                    </div>
                    {isOverdue && invoice.lateFeeAmount > 0 && (
                      <div className="text-xs text-red-500">
                        +${invoice.lateFeeAmount.toFixed(2)} late fee
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
