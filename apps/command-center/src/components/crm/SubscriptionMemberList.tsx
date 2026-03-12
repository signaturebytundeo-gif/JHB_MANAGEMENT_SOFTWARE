'use client';

import { useState, useTransition, useActionState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SubscriptionMemberForm } from './SubscriptionMemberForm';
import {
  sendRenewalReminders,
  updateSubscriptionStatus,
  awardLoyaltyReward,
} from '@/app/actions/crm-subscriptions';
import type { UpdateStatusFormState } from '@/app/actions/crm-subscriptions';
import { Plus, Bell, Award } from 'lucide-react';
import type { SubscriptionStatus, Customer } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

type SubscriptionMemberRow = {
  id: string;
  status: SubscriptionStatus;
  startDate: Date;
  renewalDate: Date | null;
  cancelledAt: Date | null;
  loyaltyRewardAt: Date | null;
  renewalReminderSentAt: Date | null;
  notes: string | null;
  createdAt: Date;
  monthsActive: number;
  loyaltyEligible: boolean;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  plan: {
    id: string;
    name: string;
    billingCycle: string;
    price: number;
  };
};

interface SubscriptionMemberListProps {
  members: SubscriptionMemberRow[];
  customers: Pick<Customer, 'id' | 'firstName' | 'lastName'>[];
  plans: { id: string; name: string; billingCycle: string; price: number }[];
}

// ============================================================================
// Status Badge
// ============================================================================

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const variants: Record<SubscriptionStatus, { label: string; className: string }> = {
    ACTIVE: {
      label: 'Active',
      className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    },
    PAUSED: {
      label: 'Paused',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    CANCELLED: {
      label: 'Cancelled',
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
    EXPIRED: {
      label: 'Expired',
      className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    },
  };

  const { label, className } = variants[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

// ============================================================================
// Status Controls (per-row form)
// ============================================================================

function StatusControls({ memberId, status }: { memberId: string; status: SubscriptionStatus }) {
  const [, formAction] = useActionState<UpdateStatusFormState, FormData>(
    updateSubscriptionStatus,
    {}
  );

  if (status === 'CANCELLED' || status === 'EXPIRED') return null;

  return (
    <form action={formAction} className="flex gap-1">
      <input type="hidden" name="memberId" value={memberId} />
      {status === 'ACTIVE' && (
        <button
          type="submit"
          name="status"
          value="PAUSED"
          className="px-2 py-1 text-xs rounded border border-input hover:bg-muted text-foreground"
        >
          Pause
        </button>
      )}
      {status === 'PAUSED' && (
        <button
          type="submit"
          name="status"
          value="ACTIVE"
          className="px-2 py-1 text-xs rounded border border-input hover:bg-muted text-foreground"
        >
          Activate
        </button>
      )}
      <button
        type="submit"
        name="status"
        value="CANCELLED"
        className="px-2 py-1 text-xs rounded border border-destructive/30 text-destructive hover:bg-destructive/10"
      >
        Cancel
      </button>
    </form>
  );
}

// ============================================================================
// Main Component
// ============================================================================

const STATUS_FILTERS = ['', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED'] as const;

export function SubscriptionMemberList({
  members,
  customers,
  plans,
}: SubscriptionMemberListProps) {
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  const filtered = statusFilter
    ? members.filter((m) => m.status === statusFilter)
    : members;

  const handleSendReminders = () => {
    startTransition(async () => {
      const result = await sendRenewalReminders();
      if (result.sent > 0 || result.errors === 0) {
        toast.success(
          result.sent === 0
            ? 'No renewal reminders to send right now.'
            : `Sent ${result.sent} renewal reminder${result.sent !== 1 ? 's' : ''}.${result.errors > 0 ? ` ${result.errors} failed.` : ''}`
        );
      } else {
        toast.error(`Failed to send renewal reminders (${result.errors} errors).`);
      }
    });
  };

  const handleAwardReward = (memberId: string) => {
    startTransition(async () => {
      const result = await awardLoyaltyReward(memberId);
      if (result.success) {
        toast.success('Loyalty reward awarded.');
      } else {
        toast.error(result.message ?? 'Failed to award loyalty reward.');
      }
    });
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
              {s || 'All'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSendReminders}
            disabled={isPending}
            className="flex items-center gap-2 px-3 py-2 border border-input rounded-md text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            <Bell className="w-4 h-4" />
            Send Renewal Reminders
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-caribbean-green text-white rounded-md text-sm font-medium hover:bg-caribbean-green/90"
          >
            <Plus className="w-4 h-4" />
            Add Subscription
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Renewal Date</TableHead>
              <TableHead>Loyalty</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No subscription members found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">
                        {member.customer.firstName} {member.customer.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.customer.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm text-foreground">{member.plan.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {member.plan.billingCycle}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={member.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(member.startDate, 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {member.renewalDate
                      ? format(member.renewalDate, 'MMM d, yyyy')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {member.monthsActive}mo
                      </span>
                      {member.loyaltyEligible && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-caribbean-green/10 text-caribbean-green">
                          <Award className="w-3 h-3" />
                          Eligible
                        </span>
                      )}
                      {member.loyaltyRewardAt && (
                        <span className="text-xs text-muted-foreground">Awarded</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <StatusControls memberId={member.id} status={member.status} />
                      {member.loyaltyEligible && !member.loyaltyRewardAt && (
                        <button
                          onClick={() => handleAwardReward(member.id)}
                          disabled={isPending}
                          className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-caribbean-green/40 text-caribbean-green hover:bg-caribbean-green/10 disabled:opacity-50"
                        >
                          <Award className="w-3 h-3" />
                          Award Reward
                        </button>
                      )}
                    </div>
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
            No subscription members found.
          </div>
        ) : (
          filtered.map((member) => (
            <div key={member.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {member.customer.firstName} {member.customer.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{member.customer.email}</p>
                </div>
                <StatusBadge status={member.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="text-foreground">{member.plan.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="text-foreground">{format(member.startDate, 'MMM d, yyyy')}</p>
                </div>
                {member.renewalDate && (
                  <div>
                    <p className="text-xs text-muted-foreground">Renewal</p>
                    <p className="text-foreground">{format(member.renewalDate, 'MMM d, yyyy')}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Loyalty</p>
                  <div className="flex items-center gap-1">
                    <span className="text-foreground">{member.monthsActive}mo</span>
                    {member.loyaltyEligible && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-caribbean-green/10 text-caribbean-green">
                        <Award className="w-3 h-3" />
                        Eligible
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <StatusControls memberId={member.id} status={member.status} />
                {member.loyaltyEligible && !member.loyaltyRewardAt && (
                  <button
                    onClick={() => handleAwardReward(member.id)}
                    disabled={isPending}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-caribbean-green/40 text-caribbean-green hover:bg-caribbean-green/10 disabled:opacity-50"
                  >
                    <Award className="w-3 h-3" />
                    Award Reward
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <SubscriptionMemberForm
          customers={customers}
          plans={plans}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
