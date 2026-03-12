import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Download } from 'lucide-react';
import { format } from 'date-fns';
import { getDocumentById } from '@/app/actions/documents';
import { DocumentVersionHistory } from '@/components/documents/DocumentVersionHistory';

const CATEGORY_LABELS: Record<string, string> = {
  AGREEMENT: 'Agreement',
  INVOICE: 'Invoice',
  CERTIFICATION: 'Certification',
  SOP: 'SOP',
  MARKETING: 'Marketing',
  TEMPLATE: 'Template',
  OTHER: 'Other',
};

const CATEGORY_VARIANTS: Record<string, string> = {
  AGREEMENT: 'bg-blue-100 text-blue-800 border-blue-200',
  INVOICE: 'bg-green-100 text-green-800 border-green-200',
  CERTIFICATION: 'bg-purple-100 text-purple-800 border-purple-200',
  SOP: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  MARKETING: 'bg-pink-100 text-pink-800 border-pink-200',
  TEMPLATE: 'bg-gray-100 text-gray-800 border-gray-200',
  OTHER: 'bg-gray-100 text-gray-700 border-gray-200',
};

function getLinkedRecord(doc: NonNullable<Awaited<ReturnType<typeof getDocumentById>>>) {
  if (doc.customer) {
    return {
      label: `${doc.customer.firstName} ${doc.customer.lastName}`,
      href: `/dashboard/customers/${doc.customerId}`,
    };
  }
  if (doc.order) {
    return {
      label: `Order ${doc.order.orderNumber}`,
      href: `/dashboard/orders`,
    };
  }
  if (doc.batch) {
    return {
      label: `Batch ${doc.batch.batchCode}`,
      href: `/dashboard/production`,
    };
  }
  return null;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const document = await getDocumentById(id);

  if (!document) {
    notFound();
  }

  const linkedRecord = getLinkedRecord(document);
  const categoryLabel = CATEGORY_LABELS[document.category] ?? document.category;
  const categoryVariant = CATEGORY_VARIANTS[document.category] ?? CATEGORY_VARIANTS.OTHER;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back link */}
      <Link
        href="/dashboard/documents"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Documents
      </Link>

      {/* Document header */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">{document.name}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${categoryVariant}`}
              >
                {categoryLabel}
              </span>
              {linkedRecord ? (
                <Link
                  href={linkedRecord.href}
                  className="text-sm text-caribbean-green hover:underline"
                >
                  {linkedRecord.label}
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">Unlinked</span>
              )}
            </div>
          </div>

          {/* Current version download */}
          <a
            href={document.currentBlobUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-caribbean-green text-white text-sm font-medium hover:bg-caribbean-green/90 transition-colors shrink-0"
          >
            <Download className="w-4 h-4" />
            Download Latest
          </a>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Uploaded By</p>
            <p className="text-sm font-medium mt-0.5">{document.uploadedBy?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Created</p>
            <p className="text-sm font-medium mt-0.5">
              {format(new Date(document.createdAt), 'MMM d, yyyy')}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Updated</p>
            <p className="text-sm font-medium mt-0.5">
              {format(new Date(document.updatedAt), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
      </div>

      {/* Version History + Upload New Version */}
      <div className="rounded-lg border bg-card p-6">
        <DocumentVersionHistory documentId={document.id} versions={document.versions} />
      </div>
    </div>
  );
}
