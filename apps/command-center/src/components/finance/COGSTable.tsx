'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { BatchCOGSData } from '@/app/actions/financial-reports';

type SortKey = keyof Pick<
  BatchCOGSData,
  'batchCode' | 'productName' | 'totalUnits' | 'materialsCost' | 'laborCost' | 'overheadCost' | 'totalCOGS' | 'cogsPerUnit'
>;

type Props = {
  batches: BatchCOGSData[];
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export function COGSTable({ batches }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('batchCode');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sorted = [...batches].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  if (batches.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No batch cost data available. Add labor/overhead costs to batches or link raw materials with cost-per-unit.
      </div>
    );
  }

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <TableHead
      className="cursor-pointer hover:text-caribbean-gold transition-colors select-none text-gray-400"
      onClick={() => handleSort(field)}
    >
      {label} {sortKey === field ? (sortAsc ? '↑' : '↓') : ''}
    </TableHead>
  );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-caribbean-gold/20">
            <SortHeader label="Batch Code" field="batchCode" />
            <SortHeader label="Product" field="productName" />
            <SortHeader label="Units" field="totalUnits" />
            <SortHeader label="Materials" field="materialsCost" />
            <SortHeader label="Labor" field="laborCost" />
            <SortHeader label="Overhead" field="overheadCost" />
            <SortHeader label="Total COGS" field="totalCOGS" />
            <SortHeader label="COGS/Unit" field="cogsPerUnit" />
            <TableHead className="text-gray-400">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((batch) => (
            <TableRow key={batch.batchId} className="border-caribbean-gold/10">
              <TableCell className="font-mono text-sm text-white">{batch.batchCode}</TableCell>
              <TableCell className="text-gray-300">{batch.productName}</TableCell>
              <TableCell className="text-gray-300">{batch.totalUnits.toLocaleString()}</TableCell>
              <TableCell className="text-gray-300">{formatCurrency(batch.materialsCost)}</TableCell>
              <TableCell className="text-gray-300">{formatCurrency(batch.laborCost)}</TableCell>
              <TableCell className="text-gray-300">{formatCurrency(batch.overheadCost)}</TableCell>
              <TableCell className="font-medium text-white">{formatCurrency(batch.totalCOGS)}</TableCell>
              <TableCell className="text-white">{formatCurrency(batch.cogsPerUnit)}</TableCell>
              <TableCell>
                {batch.costDataIncomplete ? (
                  <Badge variant="destructive" className="text-xs">
                    Cost data incomplete
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-green-400 border-green-400/30">
                    Complete
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
