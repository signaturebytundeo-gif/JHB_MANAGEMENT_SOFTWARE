'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { format } from 'date-fns';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { uploadNewVersion } from '@/app/actions/documents';
import type { UploadNewVersionFormState } from '@/app/actions/documents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ── File size formatter ───────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type VersionRow = {
  id: string;
  versionNumber: number;
  fileName: string;
  fileSize: number;
  blobUrl: string;
  createdAt: Date;
  uploadedBy: { name: string } | null;
};

interface DocumentVersionHistoryProps {
  documentId: string;
  versions: VersionRow[];
}

// ── Upload New Version Submit Button ─────────────────────────────────────────

function SubmitVersionButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full sm:w-auto bg-caribbean-green hover:bg-caribbean-green/90 text-white"
    >
      {pending ? 'Uploading...' : 'Upload New Version'}
    </Button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const initialState: UploadNewVersionFormState = {};

export function DocumentVersionHistory({ documentId, versions }: DocumentVersionHistoryProps) {
  const [state, formAction] = useActionState(uploadNewVersion, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? 'New version uploaded');
    } else if (state.message && !state.success) {
      toast.error(state.message);
    }
  }, [state]);

  const latestVersion = versions[0]?.versionNumber ?? 0;

  return (
    <div className="space-y-6">
      {/* Version History Table */}
      <div>
        <h3 className="text-base font-semibold mb-3">Version History</h3>

        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No versions found.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Version</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">File Name</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Size</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Uploaded By</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v) => (
                    <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">v{v.versionNumber}</span>
                          {v.versionNumber === latestVersion && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-caribbean-green/10 text-caribbean-green border border-caribbean-green/20">
                              Latest
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{v.fileName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatFileSize(v.fileSize)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{v.uploadedBy?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(v.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={v.blobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="inline-flex items-center gap-1.5 text-sm text-caribbean-green hover:underline"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {versions.map((v) => (
                <div key={v.id} className="rounded-lg border bg-card p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">v{v.versionNumber}</span>
                    {v.versionNumber === latestVersion && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-caribbean-green/10 text-caribbean-green border border-caribbean-green/20">
                        Latest
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p className="truncate">{v.fileName}</p>
                    <p>{formatFileSize(v.fileSize)} &middot; {v.uploadedBy?.name ?? '—'}</p>
                    <p>{format(new Date(v.createdAt), 'MMM d, yyyy')}</p>
                  </div>
                  <a
                    href={v.blobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center gap-1.5 text-sm text-caribbean-green hover:underline"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Upload New Version Form */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Upload New Version
        </h3>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="documentId" value={documentId} />
          <div className="space-y-1.5">
            <Label htmlFor="version-file">File *</Label>
            <Input
              id="version-file"
              name="file"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.txt"
              required
            />
            <p className="text-xs text-muted-foreground">
              Name and category inherited from the parent document. Max 10 MB.
            </p>
          </div>
          {state.message && !state.success && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
          <SubmitVersionButton />
        </form>
      </div>
    </div>
  );
}
