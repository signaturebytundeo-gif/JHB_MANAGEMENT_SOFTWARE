'use client';

import { FileText, Printer, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Column } from './ReportTable';
import type { ReportType } from '@/app/actions/reports';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExportButtonsProps {
  reportType: ReportType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>[];
  columns: Column[];
  dateParams: Record<string, string>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildCSV(columns: Column[], data: Record<string, unknown>[]): string {
  const headers = columns.map((c) => `"${c.header}"`).join(',');
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key];
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',')
  );
  return [headers, ...rows].join('\n');
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ExportButtons({ reportType, data, columns, dateParams }: ExportButtonsProps) {
  const handleCSVExport = () => {
    const csvContent = buildCSV(columns, data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePDFExport = () => {
    window.print();
  };

  const handleExcelExport = async () => {
    const qs = new URLSearchParams({ report: reportType, ...dateParams }).toString();
    const res = await fetch(`/api/export/excel?${qs}`);
    if (!res.ok) {
      console.error('Excel export failed:', await res.text());
      return;
    }
    // Read filename from Content-Disposition header
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const filenameMatch = disposition.match(/filename="([^"]+)"/);
    const filename = filenameMatch?.[1] ?? `${reportType}-export.xlsx`;

    const buffer = await res.arrayBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-2 print:hidden">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCSVExport}
        disabled={data.length === 0}
        className="h-9"
      >
        <FileText className="h-4 w-4 mr-2" />
        CSV
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handlePDFExport}
        className="h-9"
      >
        <Printer className="h-4 w-4 mr-2" />
        PDF
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleExcelExport}
        disabled={data.length === 0}
        className="h-9"
      >
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Excel
      </Button>
    </div>
  );
}
