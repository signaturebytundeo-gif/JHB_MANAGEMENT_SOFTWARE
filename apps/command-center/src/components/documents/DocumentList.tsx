'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Download, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { deleteDocument } from '@/app/actions/documents';
import type { DocumentListItem } from '@/app/actions/documents';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

const FILTER_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'AGREEMENT', label: 'Agreements' },
  { value: 'INVOICE', label: 'Invoices' },
  { value: 'CERTIFICATION', label: 'Certifications' },
  { value: 'SOP', label: 'SOPs' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'OTHER', label: 'Other' },
];

interface DocumentListProps {
  documents: DocumentListItem[];
}

function getLinkedRecord(doc: DocumentListItem): string {
  if (doc.customer) {
    return `${doc.customer.firstName} ${doc.customer.lastName}`;
  }
  if (doc.order) {
    return `Order ${doc.order.orderNumber}`;
  }
  if (doc.batch) {
    return `Batch ${doc.batch.batchCode}`;
  }
  return 'Unlinked';
}

export function DocumentList({ documents }: DocumentListProps) {
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered =
    activeFilter === 'ALL'
      ? documents
      : documents.filter((d) => d.category === activeFilter);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    const result = await deleteDocument(id);
    setDeletingId(null);
    if (result.success) {
      toast.success(result.message ?? 'Document deleted');
    } else {
      toast.error(result.message ?? 'Failed to delete document');
    }
  };

  return (
    <div className="space-y-4">
      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setActiveFilter(opt.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeFilter === opt.value
                ? 'bg-caribbean-green text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No documents found.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Linked To</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Versions</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Uploaded By</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => (
                  <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/documents/${doc.id}`}
                        className="font-medium text-caribbean-green hover:underline"
                      >
                        {doc.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                          CATEGORY_VARIANTS[doc.category] ?? CATEGORY_VARIANTS.OTHER
                        }`}
                      >
                        {CATEGORY_LABELS[doc.category] ?? doc.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{getLinkedRecord(doc)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{doc._count.versions}</td>
                    <td className="px-4 py-3 text-muted-foreground">{doc.uploadedBy?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={doc.currentBlobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDelete(doc.id, doc.name)}
                          disabled={deletingId === doc.id}
                          className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((doc) => (
              <div key={doc.id} className="rounded-lg border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/dashboard/documents/${doc.id}`}
                    className="font-medium text-caribbean-green hover:underline leading-snug"
                  >
                    {doc.name}
                  </Link>
                  <span
                    className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                      CATEGORY_VARIANTS[doc.category] ?? CATEGORY_VARIANTS.OTHER
                    }`}
                  >
                    {CATEGORY_LABELS[doc.category] ?? doc.category}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Linked: {getLinkedRecord(doc)}</p>
                  <p>Versions: {doc._count.versions} &middot; By {doc.uploadedBy?.name ?? '—'}</p>
                  <p>{format(new Date(doc.createdAt), 'MMM d, yyyy')}</p>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <a
                    href={doc.currentBlobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-caribbean-green hover:underline"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                  <button
                    onClick={() => handleDelete(doc.id, doc.name)}
                    disabled={deletingId === doc.id}
                    className="inline-flex items-center gap-1.5 text-sm text-destructive hover:underline disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
