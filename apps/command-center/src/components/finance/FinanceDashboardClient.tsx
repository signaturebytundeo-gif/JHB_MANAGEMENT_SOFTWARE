'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InvoiceList } from './InvoiceList';
import { ARAgingReport } from './ARAgingReport';
import { CreateInvoiceModal } from './CreateInvoiceModal';
import type { InvoiceListItem, ARAgingReport as ARAgingReportType } from '@/app/actions/invoices';

interface FinanceDashboardClientProps {
  invoices: InvoiceListItem[];
  report: ARAgingReportType;
}

export function FinanceDashboardClient({ invoices, report }: FinanceDashboardClientProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="space-y-8">
      {/* AR Summary Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Accounts Receivable Summary</h2>
        <ARAgingReport report={report} />
      </section>

      {/* Invoice List Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Invoices</h2>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/finance/invoices/new">
              <Button
                className="bg-caribbean-green hover:bg-caribbean-green/90 text-white gap-2"
              >
                <FileText className="h-4 w-4" />
                New Invoice
              </Button>
            </Link>
            <Button
              onClick={() => setShowCreateModal(true)}
              variant="outline"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              From Order
            </Button>
          </div>
        </div>
        <InvoiceList invoices={invoices} />
      </section>

      {showCreateModal && (
        <CreateInvoiceModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
