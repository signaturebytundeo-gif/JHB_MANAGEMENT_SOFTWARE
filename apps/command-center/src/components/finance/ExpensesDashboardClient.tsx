'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LogExpenseForm, type ScannerPrefill } from './LogExpenseForm';
import { ExpenseApprovalCard } from './ExpenseApprovalCard';
import { ReceiptScanner } from './ReceiptScanner';
import { COGSSummaryWidget } from './COGSSummaryWidget';
import type { ExpenseListItem } from '@/app/actions/expenses';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  auto_approved: { label: 'Auto Approved', className: 'bg-green-100 text-green-800 border-green-200' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-800 border-green-200' },
  pending_single: { label: 'Pending Approval', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  pending_dual: { label: 'Pending Dual', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  pending_bank: { label: 'Pending Bank Auth', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800 border-red-200' },
};

type ApprovalThreshold = {
  minAmount: number;
  maxAmount: number | null;
  approvalType: string;
  description: string;
};

interface ExpensesDashboardClientProps {
  expenses: ExpenseListItem[];
  approvalThresholds: ApprovalThreshold[];
  currentUserId: string;
}

export function ExpensesDashboardClient({
  expenses,
  approvalThresholds,
  currentUserId,
}: ExpensesDashboardClientProps) {
  // Scanner extraction populates this; the form watches it via prop.
  const [prefill, setPrefill] = useState<ScannerPrefill | null>(null);
  // Manual edit toggle when no scan has happened yet.
  const [showManualForm, setShowManualForm] = useState(false);

  const formVisible = prefill !== null || showManualForm;

  const pendingExpenses = expenses.filter((e) => {
    const isPending = e.approvalStatus?.startsWith('pending_');
    const notOwnExpense = e.createdById !== currentUserId;
    return isPending && notOwnExpense;
  });

  return (
    <div className="space-y-6">
      {/* COGS at-a-glance */}
      <COGSSummaryWidget expenses={expenses} />

      {/* PRIMARY ACTION: Scan Receipt */}
      <ReceiptScanner onExtracted={setPrefill} />

      {/* Manual entry fallback toggle (only when scanner hasn't run) */}
      {!prefill && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowManualForm((prev) => !prev)}
            className="text-sm text-muted-foreground gap-2"
          >
            <Pencil className="h-4 w-4" />
            {showManualForm ? 'Hide manual entry' : 'Or enter expense manually'}
          </Button>
        </div>
      )}

      {/* Form — appears after a scan OR when user clicks the manual link */}
      {formVisible && (
        <Card>
          <CardHeader>
            <CardTitle>{prefill ? 'Review & Save Expense' : 'Log New Expense'}</CardTitle>
            <CardDescription>
              {prefill
                ? 'Auto-filled from your receipt. Edit any field before saving.'
                : 'Record a business expense with receipt and details.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LogExpenseForm approvalThresholds={approvalThresholds} prefill={prefill} />
          </CardContent>
        </Card>
      )}

      {/* Pending Approvals */}
      {pendingExpenses.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Pending Your Approval</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingExpenses.map((expense) => (
              <ExpenseApprovalCard
                key={expense.id}
                expense={expense}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        </section>
      )}

      {/* Expense List */}
      <section>
        <h2 className="text-lg font-semibold mb-3">All Expenses</h2>
        {expenses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No expenses logged yet. Tap &ldquo;Take Photo&rdquo; above to scan your first receipt.
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => {
                  const statusConfig = expense.approvalStatus
                    ? STATUS_BADGE[expense.approvalStatus]
                    : null;

                  return (
                    <TableRow key={expense.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(expense.expenseDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="truncate text-sm">{expense.description}</p>
                        {expense.notes && (
                          <p className="truncate text-xs text-muted-foreground">{expense.notes}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {expense.category.charAt(0) + expense.category.slice(1).toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        ${expense.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {expense.vendorName ?? '—'}
                      </TableCell>
                      <TableCell>
                        {statusConfig ? (
                          <Badge
                            variant="outline"
                            className={`text-xs ${statusConfig.className}`}
                          >
                            {statusConfig.label}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {expense.receiptUrl ? (
                          <a
                            href={expense.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-caribbean-green hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
