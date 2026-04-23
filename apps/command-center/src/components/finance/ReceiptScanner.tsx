'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, Loader2, Upload, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ScannerPrefill } from './LogExpenseForm';
import type { ExpenseCategory } from '@prisma/client';

interface ReceiptScannerProps {
  onExtracted: (prefill: ScannerPrefill) => void;
}

type ScanResponse = {
  receiptUrl: string | null;
  extracted: {
    vendor: string | null;
    date: string | null;
    total: number | null;
    line_items: Array<{ description: string; amount: number }>;
    category_suggestion: string;
    payment_method: string;
    notes: string | null;
  };
};

export function ReceiptScanner({ onExtracted }: ReceiptScannerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setScanComplete(false);
    setError(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFile = async (file: File) => {
    setError(null);
    setScanComplete(false);

    // Image preview (PDFs get a generic placeholder)
    if (file.type.startsWith('image/')) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }

    setIsScanning(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Scan failed (${res.status})`);
      }

      const data = (await res.json()) as ScanResponse;
      const ex = data.extracted;

      // Map Claude response to form format
      const description = ex.line_items.length > 0
        ? ex.line_items.map(item => item.description).join(', ')
        : `Receipt from ${ex.vendor || 'Unknown vendor'}`;

      onExtracted({
        description,
        amount: ex.total != null ? String(ex.total) : undefined,
        category: ex.category_suggestion as ExpenseCategory,
        expenseDate: ex.date ?? undefined,
        vendorName: ex.vendor ?? undefined,
        notes: ex.notes ?? undefined,
        receiptUrl: data.receiptUrl ?? undefined,
        lineItems: ex.line_items,
        scanConfidence: 'medium', // Claude doesn't return confidence, default to medium
        documentType: 'receipt', // Default to receipt since Claude doesn't return document type
      });

      setScanComplete(true);
    } catch (err) {
      console.error('[ReceiptScanner] scan failed:', err);
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  };

  return (
    <div className="rounded-xl border-2 border-caribbean-green/30 bg-gradient-to-br from-caribbean-green/5 to-transparent p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
            <Camera className="h-5 w-5 text-caribbean-green" />
            Scan Receipt
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Snap a photo or upload — we&apos;ll auto-fill the form for you.
          </p>
        </div>
      </div>

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onInputChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onInputChange}
      />

      {!previewUrl && !isScanning && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            type="button"
            size="lg"
            onClick={() => cameraInputRef.current?.click()}
            className="bg-caribbean-green hover:bg-caribbean-green/90 text-white h-14 text-base font-semibold gap-2"
          >
            <Camera className="h-5 w-5" />
            Take Photo
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="h-14 text-base font-semibold gap-2 border-caribbean-green/40"
          >
            <Upload className="h-5 w-5" />
            Upload File
          </Button>
        </div>
      )}

      {previewUrl && (
        <div className="mt-2">
          <div className="relative inline-block rounded-lg overflow-hidden border bg-muted">
            <Image
              src={previewUrl}
              alt="Receipt preview"
              width={240}
              height={320}
              className="object-contain max-h-64 w-auto"
              unoptimized
            />
            {!isScanning && (
              <button
                type="button"
                onClick={reset}
                className="absolute top-1 right-1 rounded-full bg-black/60 text-white p-1 hover:bg-black/80"
                aria-label="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {isScanning && (
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Reading receipt with Claude vision…
        </div>
      )}

      {scanComplete && !isScanning && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4" />
          Auto-filled from receipt — review and edit below before saving.
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
    </div>
  );
}
