'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { deactivatePackagingMaterial } from '@/app/actions/packaging';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { classifyStockLevel } from '@/lib/utils/reorder-point';
import { PackagingMaterialForm } from './PackagingMaterialForm';

type PackagingMaterial = {
  id: string;
  name: string;
  type: string;
  supplier: string;
  currentQuantity: number;
  unit: string;
  reorderPoint: number;
  leadTimeDays: number;
  costPerUnit: number | { toString(): string } | null;
  isActive: boolean;
};

interface PackagingMaterialListProps {
  materials: PackagingMaterial[];
  isAdmin: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  BOTTLE: 'Bottle',
  CAP: 'Cap',
  LABEL: 'Label',
  BOX: 'Box',
  OTHER: 'Other',
};

function getStockBadge(currentQuantity: number, reorderPoint: number) {
  const level = classifyStockLevel(currentQuantity, reorderPoint);
  if (level === 'CRITICAL') return { label: 'Critical', variant: 'destructive' as const };
  if (level === 'REORDER') return { label: 'Reorder', variant: 'warning' as const };
  return { label: 'OK', variant: 'success' as const };
}

export function PackagingMaterialList({ materials, isAdmin }: PackagingMaterialListProps) {
  const router = useRouter();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this packaging material?')) return;

    setRemovingId(id);
    try {
      const result = await deactivatePackagingMaterial(id);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('Failed to deactivate packaging material');
    } finally {
      setRemovingId(null);
    }
  };

  if (materials.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No packaging materials tracked yet. Add your first material above.
      </p>
    );
  }

  return (
    <>
      {/* Inline edit form */}
      {editingId && (
        <div className="rounded-lg border bg-card p-4 mb-4">
          <h3 className="font-semibold mb-3">Edit Packaging Material</h3>
          <PackagingMaterialForm
            editingMaterial={materials.find((m) => m.id === editingId)}
            onCancel={() => setEditingId(null)}
          />
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Qty / Reorder</TableHead>
              <TableHead>Lead Time</TableHead>
              <TableHead>Cost/Unit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((material) => {
              const badge = getStockBadge(material.currentQuantity, material.reorderPoint);
              const isBelow = material.currentQuantity < material.reorderPoint;
              return (
                <TableRow key={material.id}>
                  <TableCell className="font-medium">{material.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{TYPE_LABELS[material.type] ?? material.type}</Badge>
                  </TableCell>
                  <TableCell>{material.supplier}</TableCell>
                  <TableCell>
                    <span className={isBelow ? 'text-destructive font-semibold' : ''}>
                      {material.currentQuantity}
                    </span>{' '}
                    <span className="text-muted-foreground">/ {material.reorderPoint}</span>{' '}
                    <span className="text-xs text-muted-foreground">{material.unit}</span>
                  </TableCell>
                  <TableCell>{material.leadTimeDays} days</TableCell>
                  <TableCell>
                    {material.costPerUnit != null
                      ? `$${Number(material.costPerUnit).toFixed(2)}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(editingId === material.id ? null : material.id)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeactivate(material.id)}
                          disabled={removingId === material.id}
                          title="Deactivate"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {materials.map((material) => {
          const badge = getStockBadge(material.currentQuantity, material.reorderPoint);
          const isBelow = material.currentQuantity < material.reorderPoint;
          return (
            <div key={material.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{material.name}</h3>
                  <p className="text-sm text-muted-foreground">{material.supplier}</p>
                </div>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p>{TYPE_LABELS[material.type] ?? material.type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Qty / Reorder</p>
                  <p>
                    <span className={isBelow ? 'text-destructive font-semibold' : ''}>
                      {material.currentQuantity}
                    </span>{' '}
                    / {material.reorderPoint} {material.unit}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Lead Time</p>
                  <p>{material.leadTimeDays} days</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cost/Unit</p>
                  <p>
                    {material.costPerUnit != null
                      ? `$${Number(material.costPerUnit).toFixed(2)}`
                      : '—'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingId(editingId === material.id ? null : material.id)}
                  className="flex-1"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeactivate(material.id)}
                    disabled={removingId === material.id}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                    Deactivate
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
