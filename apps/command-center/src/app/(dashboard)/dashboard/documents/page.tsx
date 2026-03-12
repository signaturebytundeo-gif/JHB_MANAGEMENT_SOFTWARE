import { Suspense } from 'react';
import { getDocuments } from '@/app/actions/documents';
import { getCRMCustomers } from '@/app/actions/crm-customers';
import { getOperatorOrders } from '@/app/actions/operator-orders';
import { getBatches } from '@/app/actions/production';
import { DocumentUploadForm } from '@/components/documents/DocumentUploadForm';
import { DocumentList } from '@/components/documents/DocumentList';

async function DocumentsContent() {
  const [documents, customers, orders, batchesResult] = await Promise.all([
    getDocuments(),
    getCRMCustomers(),
    getOperatorOrders(),
    getBatches(),
  ]);

  const customerOptions = customers.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
  }));

  const orderOptions = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
  }));

  const batchOptions = batchesResult.map((b) => ({
    id: b.id,
    batchCode: b.batchCode,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
      {/* Left: Upload Form */}
      <div className="lg:col-span-1">
        <div className="rounded-lg border bg-card p-4 lg:p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold mb-4">Upload Document</h2>
          <DocumentUploadForm
            customers={customerOptions}
            orders={orderOptions}
            batches={batchOptions}
          />
        </div>
      </div>

      {/* Right: Document List */}
      <div className="lg:col-span-2">
        <div className="rounded-lg border bg-card p-4 lg:p-6">
          <h2 className="text-lg font-semibold mb-4">All Documents</h2>
          <DocumentList documents={documents} />
        </div>
      </div>
    </div>
  );
}

function DocumentsLoading() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <div className="rounded-lg border bg-card p-6 animate-pulse">
          <div className="h-6 bg-muted rounded w-40 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-11 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
      <div className="lg:col-span-2">
        <div className="rounded-lg border bg-card p-6 animate-pulse">
          <div className="h-6 bg-muted rounded w-40 mb-4" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Documents</h1>
        <p className="text-muted-foreground mt-2">
          Upload and manage documents linked to your business records.
        </p>
      </div>

      <Suspense fallback={<DocumentsLoading />}>
        <DocumentsContent />
      </Suspense>
    </div>
  );
}
