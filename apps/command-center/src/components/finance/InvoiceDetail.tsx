'use client';

import { format } from 'date-fns';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { InvoiceDetail as InvoiceDetailType } from '@/app/actions/invoices';

interface InvoiceDetailProps {
  invoice: NonNullable<InvoiceDetailType>;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  VIEWED: 'bg-blue-100 text-blue-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  VOID: 'bg-gray-100 text-gray-500',
};

export function InvoiceDetail({ invoice }: InvoiceDetailProps) {
  const isOverdue = invoice.status === 'OVERDUE';
  const isStandalone = !invoice.orderId;
  const balance = invoice.totalAmount - invoice.paidAmount;
  const totalWithLateFee = invoice.totalAmount + (isOverdue ? invoice.lateFeeAmount : 0);
  const balanceWithLateFee = balance + (isOverdue ? invoice.lateFeeAmount : 0);

  return (
    <>
      {/* Print button — hidden in print */}
      <div className="flex justify-end mb-6 print:hidden">
        <Button
          onClick={() => window.print()}
          className="bg-caribbean-green hover:bg-caribbean-green/90 text-white gap-2"
        >
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </Button>
      </div>

      {/* Invoice Content */}
      <div
        id="invoice-print-area"
        className="bg-white border rounded-lg p-8 print:border-0 print:p-0 print:shadow-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-8 print:mb-6">
          <div>
            {/* Logo placeholder */}
            <div className="w-16 h-16 bg-caribbean-green rounded-lg flex items-center justify-center mb-3 print:bg-black">
              <span className="text-white font-bold text-xl">JHB</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground print:text-black">
              Jamaica House Brand
            </h1>
            <p className="text-sm text-muted-foreground print:text-gray-600">
              Artisan Hot Sauces & Seasonings
            </p>
            <p className="text-sm text-muted-foreground print:text-gray-600 mt-1">
              South Florida, United States
            </p>
          </div>

          <div className="text-right">
            <div className="text-3xl font-bold text-foreground print:text-black mb-2">
              INVOICE
            </div>
            <div className="font-mono text-lg font-semibold text-caribbean-green print:text-black">
              {invoice.invoiceNumber}
            </div>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground print:text-gray-600">
              <div>
                <span className="font-medium text-foreground print:text-black">Issue Date: </span>
                {invoice.issuedAt ? format(new Date(invoice.issuedAt), 'MMMM d, yyyy') : '—'}
              </div>
              <div>
                <span className="font-medium text-foreground print:text-black">Due Date: </span>
                <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                  {invoice.dueDate ? format(new Date(invoice.dueDate), 'MMMM d, yyyy') : '—'}
                </span>
              </div>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    STATUS_STYLES[invoice.status] ?? 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {invoice.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-8 print:mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground print:text-gray-500 mb-2">
            Bill To
          </h3>
          {invoice.customer ? (
            <div className="text-sm">
              <p className="font-semibold text-foreground print:text-black text-base">
                {invoice.customer.firstName} {invoice.customer.lastName}
              </p>
              {invoice.customer.company && (
                <p className="text-muted-foreground print:text-gray-600">{invoice.customer.company}</p>
              )}
              {invoice.customer.email && (
                <p className="text-muted-foreground print:text-gray-600">{invoice.customer.email}</p>
              )}
              {invoice.customer.phone && (
                <p className="text-muted-foreground print:text-gray-600">{invoice.customer.phone}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground print:text-gray-600 italic">
              No customer linked
            </p>
          )}
          {invoice.order && (
            <div className="mt-1 text-xs text-muted-foreground print:text-gray-500 font-mono">
              Order: {invoice.order.orderNumber}
            </div>
          )}
        </div>

        {/* Line Items */}
        <div className="mb-8 print:mb-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200 print:border-gray-400">
                <th className="text-left py-2 font-semibold text-foreground print:text-black">
                  {isStandalone ? 'Description' : 'Product'}
                </th>
                <th className="text-center py-2 font-semibold text-foreground print:text-black w-20">
                  Qty
                </th>
                <th className="text-right py-2 font-semibold text-foreground print:text-black w-28">
                  Unit Price
                </th>
                <th className="text-right py-2 font-semibold text-foreground print:text-black w-28">
                  Total
                </th>
                {isStandalone && (
                  <th className="text-center py-2 font-semibold text-foreground print:text-black w-24">
                    Delivery
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {isStandalone
                ? invoice.lineItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 print:border-gray-200">
                      <td className="py-2 text-foreground print:text-black">
                        {item.description}
                        {item.product && (
                          <div className="text-xs text-muted-foreground print:text-gray-500 font-mono">
                            {item.product.sku}
                          </div>
                        )}
                      </td>
                      <td className="py-2 text-center text-foreground print:text-black">
                        {item.quantity}
                      </td>
                      <td className="py-2 text-right text-foreground print:text-black">
                        ${item.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-2 text-right font-medium text-foreground print:text-black">
                        ${item.totalPrice.toFixed(2)}
                      </td>
                      <td className="py-2 text-center text-sm text-muted-foreground print:text-gray-500">
                        {item.deliveryNote || '—'}
                      </td>
                    </tr>
                  ))
                : invoice.order?.lineItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 print:border-gray-200">
                      <td className="py-2 text-foreground print:text-black">
                        {item.product.name}
                        <div className="text-xs text-muted-foreground print:text-gray-500 font-mono">
                          {item.product.sku}
                        </div>
                      </td>
                      <td className="py-2 text-center text-foreground print:text-black">
                        {item.quantity}
                      </td>
                      <td className="py-2 text-right text-foreground print:text-black">
                        ${item.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-2 text-right font-medium text-foreground print:text-black">
                        ${item.totalPrice.toFixed(2)}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-6 print:mb-4">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground print:text-gray-600">Subtotal</span>
              <span className="font-medium">${invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.taxAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground print:text-gray-600">Tax</span>
                <span className="font-medium">${invoice.taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2">
              <span className="font-semibold text-foreground print:text-black">Invoice Total</span>
              <span className="font-semibold">${invoice.totalAmount.toFixed(2)}</span>
            </div>
            {invoice.paidAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Amount Paid</span>
                <span>-${invoice.paidAmount.toFixed(2)}</span>
              </div>
            )}
            {isOverdue && invoice.lateFeeAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Late Fee</span>
                <span>+${invoice.lateFeeAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t-2 border-gray-900 pt-2 print:border-black">
              <span className="font-bold text-base text-foreground print:text-black">
                Balance Due
              </span>
              <span className={`font-bold text-base ${isOverdue ? 'text-red-600' : 'text-foreground print:text-black'}`}>
                ${balanceWithLateFee.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Terms & Notes */}
        <div className="border-t pt-6 print:pt-4 space-y-2 text-sm text-muted-foreground print:text-gray-600">
          <p className="font-medium text-foreground print:text-black">
            Payment Terms: Net 30 — Payment due within 30 days of invoice date
          </p>
          {isOverdue && (
            <p className="text-red-600 font-medium print:text-red-600">
              Late payment interest: 1.5% per month on outstanding balance
            </p>
          )}
          {invoice.notes && (
            <p className="mt-2">
              <span className="font-medium text-foreground print:text-black">Notes: </span>
              {invoice.notes}
            </p>
          )}
          <p className="text-xs text-muted-foreground print:text-gray-500 mt-4">
            Thank you for your business with Jamaica House Brand.
          </p>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-print-area,
          #invoice-print-area * { visibility: visible; }
          #invoice-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 2rem;
            font-size: 12px;
            color: black;
            background: white;
          }
          nav, header, aside, [data-sidebar], .print\\:hidden { display: none !important; }
        }
      `}</style>
    </>
  );
}
