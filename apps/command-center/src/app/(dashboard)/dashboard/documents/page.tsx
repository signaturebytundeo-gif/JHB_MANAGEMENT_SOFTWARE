import { Suspense } from 'react';
import { getDocuments, getTemplates } from '@/app/actions/documents';
import { getCRMCustomers } from '@/app/actions/crm-customers';
import { getOperatorOrders } from '@/app/actions/operator-orders';
import { getBatches } from '@/app/actions/production';
import { DocumentUploadForm } from '@/components/documents/DocumentUploadForm';
import { DocumentList } from '@/components/documents/DocumentList';
import { TemplateLibrary } from '@/components/documents/TemplateLibrary';

async function DocumentsContent() {
  const [documents, templates, customers, orders, batchesResult] = await Promise.all([
    getDocuments(),
    getTemplates(),
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
    <div className="space-y-8">
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

      {/* Template Library — distinct section below the documents grid */}
      <div>
        <hr className="border-border mb-8" />
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Template Library</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Download standard business document templates
          </p>
        </div>
        <TemplateLibrary templates={templates} />
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
