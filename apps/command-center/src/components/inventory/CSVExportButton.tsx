'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TransactionRecord } from './TransactionLog';

const TYPE_LABELS: Record<string, string> = {
  BATCH_COMPLETION: 'Batch Completion',
  TRANSFER_IN: 'Transfer In',
  TRANSFER_OUT: 'Transfer Out',
  SALE_DEDUCTION: 'Sale Deduction',
  ADJUSTMENT: 'Adjustment',
};

interface CSVExportButtonProps {
  transactions: TransactionRecord[];
}

export function CSVExportButton({ transactions }: CSVExportButtonProps) {
  const handleExport = () => {
    const headers = ['Date', 'Type', 'Product', 'SKU', 'Size', 'Location', 'Quantity', 'Reference', 'User', 'Notes'];

    const rows = transactions.map((t) => [
      new Date(t.createdAt).toLocaleDateString('en-US'),
      TYPE_LABELS[t.type] || t.type,
      t.productName,
      t.productSku,
      t.productSize,
      t.locationName,
      t.quantityChange.toString(),
      t.referenceId || '',
      t.createdBy,
      (t.reason || t.notes || '').replace(/,/g, ';'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={transactions.length === 0}
      className="h-9"
    >
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );
}
