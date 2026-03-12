'use client';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Column = {
  key: string;
  header: string;
  format?: 'currency' | 'number' | 'percent';
};

interface ReportTableProps {
  title: string;
  columns: Column[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatValue(value: unknown, fmt?: 'currency' | 'number' | 'percent'): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'number' ? value : Number(value);

  if (fmt === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }
  if (fmt === 'number') {
    return new Intl.NumberFormat('en-US').format(num);
  }
  if (fmt === 'percent') {
    return `${num.toFixed(1)}%`;
  }
  return String(value);
}

function computeTotals(
  columns: Column[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> | null {
  const numericCols = columns.filter(
    (c) => c.format === 'currency' || c.format === 'number'
  );
  if (numericCols.length === 0 || data.length === 0) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totals: Record<string, any> = {};
  for (const col of columns) {
    if (col.format === 'currency' || col.format === 'number') {
      totals[col.key] = data.reduce((sum, row) => sum + (Number(row[col.key]) || 0), 0);
    } else {
      totals[col.key] = col.key === columns[0].key ? 'Total' : '';
    }
  }
  return totals;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReportTable({ title, columns, data }: ReportTableProps) {
  const totals = computeTotals(columns, data);

  return (
    <div className="print:block">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  No data for this period.
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-foreground">
                      {formatValue(row[col.key], col.format)}
                    </td>
                  ))}
                </tr>
              ))
            )}

            {/* Summary row */}
            {totals && data.length > 0 && (
              <tr className="bg-muted/50 font-semibold border-t-2 border-border">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-foreground">
                    {col.format === 'currency' || col.format === 'number'
                      ? formatValue(totals[col.key], col.format)
                      : totals[col.key]}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {data.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No data for this period.</p>
        ) : (
          data.map((row, idx) => (
            <div key={idx} className="rounded-lg border border-border bg-card p-4 space-y-2">
              {columns.map((col) => (
                <div key={col.key} className="flex justify-between items-center">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {col.header}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {formatValue(row[col.key], col.format)}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Print-only title (shown above table when printing) */}
      <div className="hidden print:block mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-gray-500">
          Generated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
    </div>
  );
}
