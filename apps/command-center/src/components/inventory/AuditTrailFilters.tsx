'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, X } from 'lucide-react';

interface AuditTrailFiltersProps {
  products: { id: string; name: string; sku: string }[];
  locations: { id: string; name: string; type: string }[];
}

type MovementType = 'PRODUCTION' | 'TRANSFER' | 'ADJUSTMENT' | 'ALLOCATION' | 'DEDUCTION';
type TransferType = 'RESTOCK' | 'FULFILLMENT' | 'ADJUSTMENT' | 'RETURN';

export function AuditTrailFilters({ products, locations }: AuditTrailFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  // Get current filter values from URL
  const currentFilters = {
    productId: searchParams.get('productId') ?? '',
    locationId: searchParams.get('locationId') ?? '',
    movementType: searchParams.get('movementType') ?? '',
    transferType: searchParams.get('transferType') ?? '',
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
  };

  const [filters, setFilters] = useState(currentFilters);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    router.push(`/dashboard/inventory/audit-trail?${params.toString()}`);
    setIsOpen(false);
  };

  const clearFilters = () => {
    setFilters({
      productId: '',
      locationId: '',
      movementType: '',
      transferType: '',
      dateFrom: '',
      dateTo: '',
    });
    router.push('/dashboard/inventory/audit-trail');
    setIsOpen(false);
  };

  const hasActiveFilters = Object.values(currentFilters).some(Boolean);
  const activeFilterCount = Object.values(currentFilters).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Filter toggle and active filter display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={isOpen ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary-foreground rounded">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
        {hasActiveFilters && (
          <div className="text-xs text-muted-foreground">
            Showing filtered results • {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
          </div>
        )}
      </div>

      {/* Filter panel */}
      {isOpen && (
        <Card className="p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Product filter */}
            <div className="space-y-2">
              <Label htmlFor="productFilter" className="text-sm font-medium">
                Product
              </Label>
              <Select value={filters.productId} onValueChange={(value) => handleFilterChange('productId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All products</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location filter */}
            <div className="space-y-2">
              <Label htmlFor="locationFilter" className="text-sm font-medium">
                Location
              </Label>
              <Select value={filters.locationId} onValueChange={(value) => handleFilterChange('locationId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name} ({location.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Movement type filter */}
            <div className="space-y-2">
              <Label htmlFor="movementTypeFilter" className="text-sm font-medium">
                Movement Type
              </Label>
              <Select value={filters.movementType} onValueChange={(value) => handleFilterChange('movementType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="PRODUCTION">Production</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                  <SelectItem value="ALLOCATION">Allocation</SelectItem>
                  <SelectItem value="DEDUCTION">Deduction</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transfer type filter */}
            <div className="space-y-2">
              <Label htmlFor="transferTypeFilter" className="text-sm font-medium">
                Transfer Type
              </Label>
              <Select value={filters.transferType} onValueChange={(value) => handleFilterChange('transferType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All transfer types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All transfer types</SelectItem>
                  <SelectItem value="RESTOCK">Restock</SelectItem>
                  <SelectItem value="FULFILLMENT">Fulfillment</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                  <SelectItem value="RETURN">Return</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date from */}
            <div className="space-y-2">
              <Label htmlFor="dateFrom" className="text-sm font-medium">
                Date From
              </Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>

            {/* Date to */}
            <div className="space-y-2">
              <Label htmlFor="dateTo" className="text-sm font-medium">
                Date To
              </Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
          </div>

          {/* Apply/Clear buttons */}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={clearFilters}>
              Clear All
            </Button>
            <Button onClick={applyFilters}>
              Apply Filters
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}