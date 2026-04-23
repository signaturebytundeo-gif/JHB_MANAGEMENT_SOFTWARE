'use client';

import { useState } from 'react';
import { Pencil, Calendar, RotateCcw, Edit } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LogExpenseForm, type ScannerPrefill } from './LogExpenseForm';
import { ExpenseApprovalCard } from './ExpenseApprovalCard';
import { ReceiptScanner } from './ReceiptScanner';
import { COGSSummaryWidget } from './COGSSummaryWidget';
import { EditExpenseForm } from './EditExpenseForm';
import type { ExpenseListItem } from '@/app/actions/expenses';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  auto_approved: { label: 'Auto Approved', className: 'bg-green-100 text-green-800 border-green-200' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-800 border-green-200' },
  pending_single: { label: 'Pending Approval', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  pending_dual: { label: 'Pending Dual', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  pending_bank: { label: 'Pending Bank Auth', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800 border-red-200' },
};

// Category labels for display
const CATEGORY_LABELS: Record<string, string> = {
  'COGS_INGREDIENTS': 'COGS - Ingredients',
  'COGS_PACKAGING': 'COGS - Packaging',
  'MARKET_FEES_OVERHEAD': 'Market Fees & Overhead',
  'TRAVEL_TRANSPORT': 'Travel & Transport',
  'MARKETING_PROMO': 'Marketing & Promo',
  'STORAGE_RENT': 'Storage & Rent',
  'OTHER': 'Other',
  // Legacy categories for backwards compatibility
  'INGREDIENTS': 'Ingredients',
  'PACKAGING': 'Packaging',
  'LABOR': 'Labor',
  'EQUIPMENT': 'Equipment',
  'MARKETING': 'Marketing',
  'SHIPPING': 'Shipping',
  'UTILITIES': 'Utilities',
  'RENT': 'Rent',
  'INSURANCE': 'Insurance',
  'OVERHEAD': 'Overhead',
};

// Payment method labels for display
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  'CASH': 'Cash',
  'MASTERCARD_6842': 'Mastercard 6842',
  'BUSINESS_CARD': 'Business Card',
  'OTHER': 'Other',
  // Legacy payment methods for backwards compatibility
  'CREDIT_CARD': 'Credit Card',
  'SQUARE': 'Square',
  'STRIPE': 'Stripe',
  'ZELLE': 'Zelle',
  'CHECK': 'Check',
  'NET_30': 'Net 30',
  'AMAZON_PAY': 'Amazon Pay',
};

function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || category.charAt(0) + category.slice(1).toLowerCase();
}

function getPaymentMethodLabel(paymentMethod: string | null): string {
  if (!paymentMethod) return '—';
  return PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod.replace(/_/g, ' ');
}

type ApprovalThreshold = {
  minAmount: number;
  maxAmount: number | null;
  approvalType: string;
  description: string;
};

type ExpenseTemplate = {
  id: string;
  vendor: string;
  category: string;
  subcategory: string | null;
  description: string;
  paymentMethod: string | null;
  isRecurring: boolean;
  recurrenceFrequency: string | null;
};

interface ExpensesDashboardClientProps {
  expenses: ExpenseListItem[];
  approvalThresholds: ApprovalThreshold[];
  templates: ExpenseTemplate[];
  currentUserId: string;
}

export function ExpensesDashboardClient({
  expenses,
  approvalThresholds,
  templates,
  currentUserId,
}: ExpensesDashboardClientProps) {
  // Scanner extraction populates this; the form watches it via prop.
  const [prefill, setPrefill] = useState<ScannerPrefill | null>(null);
  // Manual edit toggle when no scan has happened yet.
  const [showManualForm, setShowManualForm] = useState(false);
  // Edit expense state
  const [editingExpense, setEditingExpense] = useState<ExpenseListItem | null>(null);

  const formVisible = prefill !== null || showManualForm;

  const pendingExpenses = expenses.filter((e) => {
    const isPending = e.approvalStatus?.startsWith('pending_');
    const notOwnExpense = e.createdById !== currentUserId;
    const notAutoEvent = e.source !== 'auto-event'; // Exclude auto-event expenses from approval flow
    return isPending && notOwnExpense && notAutoEvent;
  });

  const handleEditExpense = (expense: ExpenseListItem) => {
    setEditingExpense(expense);
  };

  const handleEditSuccess = () => {
    setEditingExpense(null);
    // Refresh the page to show updated data
    window.location.reload();
  };

  const handleEditCancel = () => {
    setEditingExpense(null);
  };

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
            <LogExpenseForm
              approvalThresholds={approvalThresholds}
              templates={templates}
              prefill={prefill}
            />
          </CardContent>
        </Card>
      )}

      {/* Edit Expense Form */}
      {editingExpense && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Expense</CardTitle>
            <CardDescription>
              Update expense details. Significant changes may require re-approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EditExpenseForm
              expense={editingExpense}
              onSuccess={handleEditSuccess}
              onCancel={handleEditCancel}
            />
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
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Actions</TableHead>
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
                        <div className="flex items-center gap-2">
                          {expense.source === 'auto-event' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center">
                                    <Calendar className="h-3 w-3 text-blue-600" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Auto-imported from Events</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {expense.isRecurring && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center">
                                    <RotateCcw className="h-3 w-3 text-green-600" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Recurring expense - {expense.recurrenceFrequency}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm">{expense.description}</p>
                            {expense.subcategory && (
                              <p className="truncate text-xs text-muted-foreground">{expense.subcategory}</p>
                            )}
                            {expense.notes && (
                              <p className="truncate text-xs text-muted-foreground">{expense.notes}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(expense.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        ${expense.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {expense.vendorName ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {getPaymentMethodLabel(expense.paymentMethod)}
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
                      <TableCell>
                        {expense.approvalStatus !== 'rejected' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditExpense(expense)}
                            className="h-8 w-8 p-0"
                            title="Edit expense"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
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
