'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BatchStatusBadge } from './BatchStatusBadge';

type BatchWithRelations = {
  id: string;
  batchCode: string;
  productionDate: Date;
  totalUnits: number;
  status: string;
  productionSource: string;
  product: {
    name: string;
    sku: string;
    size: string;
  };
  coPackerPartner?: {
    name: string;
  } | null;
};

interface BatchListProps {
  initialBatches: BatchWithRelations[];
  products: { id: string; name: string }[];
}

export function BatchList({ initialBatches, products }: BatchListProps) {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [productFilter, setProductFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');

  // Client-side filtering
  const filteredBatches = initialBatches.filter((batch) => {
    if (statusFilter && batch.status !== statusFilter) return false;
    if (productFilter && batch.product.name !== productFilter) return false;
    if (sourceFilter && batch.productionSource !== sourceFilter) return false;

    if (dateFromFilter) {
      const fromDate = new Date(dateFromFilter);
      const batchDate = new Date(batch.productionDate);
      if (batchDate < fromDate) return false;
    }

    if (dateToFilter) {
      const toDate = new Date(dateToFilter);
      const batchDate = new Date(batch.productionDate);
      if (batchDate > toDate) return false;
    }

    return true;
  });

  // Sort by production date descending (most recent first)
  const sortedBatches = [...filteredBatches].sort((a, b) => {
    return new Date(b.productionDate).getTime() - new Date(a.productionDate).getTime();
  });

  const clearFilters = () => {
    setStatusFilter('');
    setProductFilter('');
    setSourceFilter('');
    setDateFromFilter('');
    setDateToFilter('');
  };

  const hasActiveFilters =
    statusFilter || productFilter || sourceFilter || dateFromFilter || dateToFilter;

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3">
        <div className="w-full sm:w-auto sm:min-w-[180px]">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PLANNED">Planned</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="QC_REVIEW">QC Review</SelectItem>
              <SelectItem value="RELEASED">Released</SelectItem>
              <SelectItem value="HOLD">Hold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-auto sm:min-w-[180px]">
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Products" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.name}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-auto sm:min-w-[180px]">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IN_HOUSE">In-House</SelectItem>
              <SelectItem value="CO_PACKER">Co-Packer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-auto">
          <Input
            type="date"
            placeholder="From Date"
            value={dateFromFilter}
            onChange={(e) => setDateFromFilter(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="w-full sm:w-auto">
          <Input
            type="date"
            placeholder="To Date"
            value={dateToFilter}
            onChange={(e) => setDateToFilter(e.target.value)}
            className="w-full"
          />
        </div>

        {hasActiveFilters && (
          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Code</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No batches found.{' '}
                    <Link
                      href="/dashboard/production/new"
                      className="text-caribbean-green hover:underline"
                    >
                      Create your first batch
                    </Link>
                  </TableCell>
                </TableRow>
              ) : (
                sortedBatches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/production/${batch.id}`}
                        className="font-medium text-caribbean-green hover:underline"
                      >
                        {batch.batchCode}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{batch.product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {batch.product.size}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(batch.productionDate), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {batch.productionSource === 'IN_HOUSE'
                        ? 'In-House'
                        : batch.coPackerPartner?.name || 'Co-Packer'}
                    </TableCell>
                    <TableCell>{batch.totalUnits.toLocaleString()}</TableCell>
                    <TableCell>
                      <BatchStatusBadge status={batch.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {sortedBatches.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No batches found.{' '}
              <Link
                href="/dashboard/production/new"
                className="text-caribbean-green hover:underline"
              >
                Create your first batch
              </Link>
            </CardContent>
          </Card>
        ) : (
          sortedBatches.map((batch) => (
            <Card key={batch.id}>
              <CardContent className="pt-6">
                <Link href={`/dashboard/production/${batch.id}`}>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-caribbean-green">
                          {batch.batchCode}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {batch.product.name} • {batch.product.size}
                        </div>
                      </div>
                      <BatchStatusBadge status={batch.status} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {format(new Date(batch.productionDate), 'MMM d, yyyy')}
                      </span>
                      <span className="font-medium">
                        {batch.totalUnits.toLocaleString()} units
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {batch.productionSource === 'IN_HOUSE'
                        ? 'In-House'
                        : batch.coPackerPartner?.name || 'Co-Packer'}
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
