'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { ArrowLeft, DollarSign, Send, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { InvoiceDetail } from './InvoiceDetail';
import { PaymentModal } from './PaymentModal';
import { sendInvoiceEmail, sendInvoiceReminder } from '@/app/actions/standalone-invoices';
import type { InvoiceDetail as InvoiceDetailType } from '@/app/actions/invoices';

interface InvoiceDetailClientProps {
  invoice: NonNullable<InvoiceDetailType>;
}

export function InvoiceDetailClient({ invoice }: InvoiceDetailClientProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSending, startSendTransition] = useTransition();

  const isOverdue = invoice.status === 'OVERDUE';
  const balance = invoice.totalAmount - invoice.paidAmount;
  const balanceWithLateFee = balance + (isOverdue ? invoice.lateFeeAmount : 0);
  const canLogPayment = !['PAID', 'VOID'].includes(invoice.status);
  const canSend = invoice.customer?.email && !['PAID', 'VOID'].includes(invoice.status);
  const canRemind = ['SENT', 'OVERDUE', 'VIEWED', 'PARTIAL'].includes(invoice.status) && invoice.customer?.email;

  const handleSendInvoice = () => {
    startSendTransition(async () => {
      const result = await sendInvoiceEmail(invoice.id);
      if (result.success) {
        toast.success('Invoice email sent successfully');
      } else {
        toast.error(result.error || 'Failed to send invoice');
      }
    });
  };

  const handleSendReminder = () => {
    startSendTransition(async () => {
      const result = await sendInvoiceReminder(invoice.id);
      if (result.success) {
        toast.success('Reminder email sent successfully');
      } else {
        toast.error(result.error || 'Failed to send reminder');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Back navigation — hidden in print */}
      <div className="print:hidden">
        <Link
          href="/dashboard/finance"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Finance
        </Link>
      </div>

      {/* Email Actions — hidden in print */}
      <div className="print:hidden flex items-center gap-3">
        {canSend && (
          <Button
            onClick={handleSendInvoice}
            disabled={isSending}
            className="bg-caribbean-green hover:bg-caribbean-green/90 text-white gap-2"
          >
            <Send className="h-4 w-4" />
            {isSending ? 'Sending...' : invoice.status === 'DRAFT' ? 'Send Invoice' : 'Resend Invoice'}
          </Button>
        )}
        {canRemind && (
          <Button
            onClick={handleSendReminder}
            disabled={isSending}
            variant="outline"
            className="gap-2"
          >
            <Bell className="h-4 w-4" />
            {isSending ? 'Sending...' : 'Send Reminder'}
          </Button>
        )}
        {invoice.status === 'SENT' && (
          <span className="text-xs text-muted-foreground">
            Sent {invoice.issuedAt ? format(new Date(invoice.issuedAt), 'MMM d, yyyy') : ''}
          </span>
        )}
      </div>

      {/* Invoice Detail Component */}
      <InvoiceDetail invoice={invoice} />

      {/* Payment History */}
      <div className="print:hidden space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Payment History</h2>
          {canLogPayment && (
            <Button
              onClick={() => setShowPaymentModal(true)}
              className="bg-caribbean-green hover:bg-caribbean-green/90 text-white gap-2"
            >
              <DollarSign className="h-4 w-4" />
              Log Payment
            </Button>
          )}
        </div>

        {invoice.payments.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No payments recorded yet
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-sm">
                      {format(new Date(payment.paidAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-sm">{payment.paymentMethod}</TableCell>
                    <TableCell className="text-right text-sm font-medium text-green-600">
                      ${payment.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {payment.notes || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Status Summary */}
        <div className="rounded-lg bg-muted/30 border p-4 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Invoice Total</span>
            <span className="font-medium">${invoice.totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Paid</span>
            <span className="font-medium text-green-600">${invoice.paidAmount.toFixed(2)}</span>
          </div>
          {isOverdue && invoice.lateFeeAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Late Fee</span>
              <span className="font-medium text-red-600">
                +${invoice.lateFeeAmount.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 font-semibold">
            <span>Balance Due</span>
            <span className={isOverdue ? 'text-red-600' : ''}>
              ${balanceWithLateFee.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <PaymentModal
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoiceNumber}
          balanceDue={balanceWithLateFee}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
}
