'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ProductMarginData } from '@/app/actions/financial-reports';

type Props = {
  products: ProductMarginData[];
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

function marginColorClass(pct: number): string {
  if (pct >= 50) return 'text-green-400 font-semibold';
  if (pct >= 30) return 'text-yellow-400 font-semibold';
  return 'text-red-400 font-semibold';
}

function marginLabel(pct: number): string {
  if (pct >= 50) return 'Healthy';
  if (pct >= 30) return 'Fair';
  return 'Low';
}

export function GrossMarginTable({ products }: Props) {
  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No product margin data available. COGS and sale price data required.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-caribbean-gold/20">
            <TableHead className="text-gray-400">Product</TableHead>
            <TableHead className="text-gray-400">Avg COGS/Unit</TableHead>
            <TableHead className="text-gray-400">Avg Sale Price</TableHead>
            <TableHead className="text-gray-400">Gross Margin %</TableHead>
            <TableHead className="text-gray-400">Status</TableHead>
            <TableHead className="text-gray-400">Batches</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.productName} className="border-caribbean-gold/10">
              <TableCell className="font-medium text-white">{product.productName}</TableCell>
              <TableCell className="text-gray-300">{formatCurrency(product.avgCOGS)}</TableCell>
              <TableCell className="text-gray-300">
                {product.avgSalePrice > 0 ? formatCurrency(product.avgSalePrice) : '—'}
              </TableCell>
              <TableCell className={marginColorClass(product.grossMarginPct)}>
                {product.grossMarginPct.toFixed(1)}%
              </TableCell>
              <TableCell>
                <span className={`text-xs ${marginColorClass(product.grossMarginPct)}`}>
                  {marginLabel(product.grossMarginPct)}
                </span>
              </TableCell>
              <TableCell className="text-gray-400">{product.batchCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
