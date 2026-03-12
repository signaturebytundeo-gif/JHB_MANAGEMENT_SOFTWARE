'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DistributorForm } from './DistributorForm';
import { Plus } from 'lucide-react';
import type { Customer } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

type AgreementRow = {
  id: string;
  customerId: string;
  territory: string;
  commissionRate: number;
  startDate: Date;
  endDate: Date | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  totalRevenue: number;
  estimatedCommission: number;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    company: string | null;
  };
};

interface DistributorListProps {
  agreements: AgreementRow[];
  customers: Pick<Customer, 'id' | 'firstName' | 'lastName' | 'company'>[];
}

// ============================================================================
// Status Badge
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    active: {
      label: 'Active',
      className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    },
    expired: {
      label: 'Expired',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    terminated: {
      label: 'Terminated',
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
  };

  const { label, className } = config[status] ?? config.active;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

// ============================================================================
// Main Component
// ============================================================================

const STATUS_FILTERS = ['', 'active', 'expired', 'terminated'] as const;

export function DistributorList({ agreements, customers }: DistributorListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<AgreementRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const filtered = statusFilter
    ? agreements.filter((a) => a.status === statusFilter)
    : agreements;

  const handleEdit = (agreement: AgreementRow) => {
    setEditingAgreement(agreement);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAgreement(null);
  };

  return (
    <div className="space-y-4">
      {/* Actions Row */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-caribbean-green text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 bg-caribbean-green text-white rounded-md text-sm font-medium hover:bg-caribbean-green/90"
        >
          <Plus className="w-4 h-4" />
          Add Agreement
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Distributor</TableHead>
              <TableHead>Territory</TableHead>
              <TableHead>Commission Rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead className="text-right">Est. Commission</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No distributor agreements found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((agreement) => (
                <TableRow key={agreement.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">
                        {agreement.customer.firstName} {agreement.customer.lastName}
                      </p>
                      {agreement.customer.company && (
                        <p className="text-xs text-muted-foreground">
                          {agreement.customer.company}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-foreground">
                    {agreement.territory}
                  </TableCell>
                  <TableCell className="text-sm text-foreground">
                    {agreement.commissionRate}%
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={agreement.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(agreement.startDate, 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {agreement.endDate ? format(agreement.endDate, 'MMM d, yyyy') : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-foreground text-right">
                    <div>
                      <p className="font-medium">${agreement.estimatedCommission.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        on ${agreement.totalRevenue.toFixed(2)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleEdit(agreement)}
                      className="px-2 py-1 text-xs rounded border border-input hover:bg-muted text-foreground"
                    >
                      Edit
                    </button>
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
          <div className="text-center text-muted-foreground py-8">
            No distributor agreements found.
          </div>
        ) : (
          filtered.map((agreement) => (
            <div key={agreement.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {agreement.customer.firstName} {agreement.customer.lastName}
                  </p>
                  {agreement.customer.company && (
                    <p className="text-xs text-muted-foreground">{agreement.customer.company}</p>
                  )}
                </div>
                <StatusBadge status={agreement.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Territory</p>
                  <p className="text-foreground">{agreement.territory}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Commission</p>
                  <p className="text-foreground">{agreement.commissionRate}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="text-foreground">{format(agreement.startDate, 'MMM d, yyyy')}</p>
                </div>
                {agreement.endDate && (
                  <div>
                    <p className="text-xs text-muted-foreground">End Date</p>
                    <p className="text-foreground">{format(agreement.endDate, 'MMM d, yyyy')}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Est. Commission</p>
                  <p className="font-medium text-foreground">
                    ${agreement.estimatedCommission.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-muted-foreground">${agreement.totalRevenue.toFixed(2)}</p>
                </div>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => handleEdit(agreement)}
                  className="px-3 py-1.5 text-xs rounded border border-input hover:bg-muted text-foreground"
                >
                  Edit Agreement
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <DistributorForm
          customers={customers}
          agreement={editingAgreement ?? undefined}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
