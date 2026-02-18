'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Plus } from 'lucide-react';

interface AllocationFieldsProps {
  locations: { id: string; name: string }[];
  totalUnits: number;
}

interface AllocationRow {
  id: string;
  locationId: string;
  quantity: number;
}

export function AllocationFields({ locations, totalUnits }: AllocationFieldsProps) {
  const [rows, setRows] = useState<AllocationRow[]>([]);

  const addRow = () => {
    setRows([
      ...rows,
      {
        id: crypto.randomUUID(),
        locationId: '',
        quantity: 0,
      },
    ]);
  };

  const removeRow = (id: string) => {
    setRows(rows.filter((row) => row.id !== id));
  };

  const updateLocation = (id: string, locationId: string) => {
    setRows(rows.map((row) => (row.id === id ? { ...row, locationId } : row)));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setRows(rows.map((row) => (row.id === id ? { ...row, quantity } : row)));
  };

  // Calculate total allocated
  const totalAllocated = rows.reduce((sum, row) => sum + (row.quantity || 0), 0);
  const remaining = totalUnits - totalAllocated;
  const isOverAllocated = totalAllocated > totalUnits;

  // Get already selected location IDs
  const selectedLocationIds = new Set(rows.map((row) => row.locationId).filter(Boolean));

  // Filter available locations for each row
  const getAvailableLocations = (currentLocationId: string) => {
    return locations.filter(
      (loc) => !selectedLocationIds.has(loc.id) || loc.id === currentLocationId
    );
  };

  return (
    <div className="space-y-4">
      {/* Add Location Button */}
      <Button
        type="button"
        variant="outline"
        onClick={addRow}
        className="w-full h-11"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Location
      </Button>

      {/* Allocation Rows */}
      {rows.map((row, index) => (
        <div key={row.id} className="space-y-2">
          <div className="flex gap-2">
            {/* Location Select */}
            <div className="flex-1">
              <Label htmlFor={`location-${row.id}`} className="sr-only">
                Location
              </Label>
              <Select
                value={row.locationId}
                onValueChange={(value) => updateLocation(row.id, value)}
              >
                <SelectTrigger
                  id={`location-${row.id}`}
                  className="h-11 text-base"
                >
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableLocations(row.locationId).map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Hidden input for form submission */}
              <input
                type="hidden"
                name={`allocation_locationId_${index}`}
                value={row.locationId}
              />
            </div>

            {/* Quantity Input */}
            <div className="w-32">
              <Label htmlFor={`quantity-${row.id}`} className="sr-only">
                Quantity
              </Label>
              <Input
                id={`quantity-${row.id}`}
                type="number"
                inputMode="numeric"
                placeholder="Units"
                value={row.quantity || ''}
                onChange={(e) =>
                  updateQuantity(row.id, parseInt(e.target.value, 10) || 0)
                }
                className="h-11 text-base"
              />
              {/* Hidden input for form submission */}
              <input
                type="hidden"
                name={`allocation_quantity_${index}`}
                value={row.quantity || 0}
              />
            </div>

            {/* Remove Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeRow(row.id)}
              className="h-11 w-11"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}

      {/* Allocation Summary */}
      {rows.length > 0 && (
        <div
          className={`p-3 rounded-md text-sm ${
            isOverAllocated
              ? 'bg-red-500/10 border border-red-500/50 text-red-500'
              : 'bg-gray-100 dark:bg-gray-800'
          }`}
        >
          <div className="flex justify-between">
            <span>Allocated:</span>
            <span className="font-medium">
              {totalAllocated} / {totalUnits} total
            </span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Remaining:</span>
            <span className="font-medium">{remaining} units</span>
          </div>
          {isOverAllocated && (
            <p className="mt-2 font-medium">
              Allocation exceeds total units!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
