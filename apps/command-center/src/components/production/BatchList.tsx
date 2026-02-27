'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Download } from 'lucide-react';
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
  createdBy: {
    name: string;
  };
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
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Client-side filtering
  const filteredBatches = initialBatches.filter((batch) => {
    if (statusFilter && batch.status !== statusFilter) return false;
    if (productFilter && batch.product.name !== productFilter) return false;
    if (sourceFilter && batch.productionSource !== sourceFilter) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesBatchCode = batch.batchCode.toLowerCase().includes(q);
      const matchesProduct = batch.product.name.toLowerCase().includes(q);
      if (!matchesBatchCode && !matchesProduct) return false;
    }

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
    setSearchQuery('');
  };

  const hasActiveFilters =
    statusFilter || productFilter || sourceFilter || dateFromFilter || dateToFilter || searchQuery;

  const exportCSV = () => {
    const headers = ['Batch Code', 'Product', 'SKU', 'Size', 'Date', 'Source', 'Units', 'Status', 'Created By'];
    const rows = sortedBatches.map((batch) => [
      batch.batchCode,
      batch.product.name,
      batch.product.sku,
      batch.product.size,
      format(new Date(batch.productionDate), 'yyyy-MM-dd'),
      batch.productionSource === 'IN_HOUSE' ? 'In-House' : batch.coPackerPartner?.name || 'Co-Packer',
      batch.totalUnits.toString(),
      batch.status,
      batch.createdBy.name,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `batches_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="w-full sm:max-w-sm">
        <Input
          type="text"
          placeholder="Search batch code or product..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>

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

        <Button variant="outline" onClick={exportCSV} className="ml-auto">
          <Download className="h-4 w-4 mr-2" />
          CSV
        </Button>
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
                <TableHead>Created By</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                    <TableCell className="text-sm text-muted-foreground">
                      {batch.createdBy.name}
                    </TableCell>
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
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {batch.productionSource === 'IN_HOUSE'
                          ? 'In-House'
                          : batch.coPackerPartner?.name || 'Co-Packer'}
                      </span>
                      <span>by {batch.createdBy.name}</span>
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
