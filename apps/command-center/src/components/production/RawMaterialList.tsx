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
import { deactivateRawMaterial } from '@/app/actions/raw-materials';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { differenceInDays, format } from 'date-fns';

type RawMaterial = {
  id: string;
  name: string;
  supplier: string;
  lotNumber: string;
  receivedDate: Date;
  expirationDate: Date;
  quantity: number | { toString(): string };
  unit: string;
  isActive: boolean;
};

interface RawMaterialListProps {
  materials: RawMaterial[];
}

export function RawMaterialList({ materials }: RawMaterialListProps) {
  const router = useRouter();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (id: string) => {
    if (!confirm('Are you sure you want to remove this raw material?')) {
      return;
    }

    setRemovingId(id);
    try {
      const result = await deactivateRawMaterial(id);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to remove raw material');
    } finally {
      setRemovingId(null);
    }
  };

  const getExpirationStatus = (expirationDate: Date) => {
    const today = new Date();
    const daysUntilExpiration = differenceInDays(expirationDate, today);

    if (daysUntilExpiration < 0) {
      return { label: 'Expired', variant: 'destructive' as const };
    } else if (daysUntilExpiration <= 30) {
      return { label: 'Expiring Soon', variant: 'warning' as const };
    } else {
      return { label: 'OK', variant: 'success' as const };
    }
  };

  if (materials.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No raw materials tracked yet. Add your first material above.
      </p>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Lot #</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((material) => {
              const status = getExpirationStatus(material.expirationDate);
              return (
                <TableRow key={material.id}>
                  <TableCell className="font-medium">{material.name}</TableCell>
                  <TableCell>{material.supplier}</TableCell>
                  <TableCell className="font-mono text-sm">{material.lotNumber}</TableCell>
                  <TableCell>
                    {material.quantity.toString()} {material.unit}
                  </TableCell>
                  <TableCell>{format(material.receivedDate, 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{format(material.expirationDate, 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(material.id)}
                      disabled={removingId === material.id}
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
          const status = getExpirationStatus(material.expirationDate);
          return (
            <div
              key={material.id}
              className="rounded-lg border bg-card p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{material.name}</h3>
                  <p className="text-sm text-muted-foreground">{material.supplier}</p>
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Lot #</p>
                  <p className="font-mono">{material.lotNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Quantity</p>
                  <p>
                    {material.quantity.toString()} {material.unit}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Received</p>
                  <p>{format(material.receivedDate, 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expires</p>
                  <p>{format(material.expirationDate, 'MMM dd, yyyy')}</p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRemove(material.id)}
                disabled={removingId === material.id}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                Remove
              </Button>
            </div>
          );
        })}
      </div>
    </>
  );
}
