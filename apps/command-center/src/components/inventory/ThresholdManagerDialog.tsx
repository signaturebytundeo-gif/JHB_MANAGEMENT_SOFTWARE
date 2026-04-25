'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings2 } from 'lucide-react';
import { toast } from 'sonner';

interface ThresholdManagerDialogProps {
  product: {
    id: string;
    name: string;
    sku: string;
    reorderThreshold: number | null;
    criticalThreshold: number | null;
  };
  onUpdate: () => void;
}

export function ThresholdManagerDialog({ product, onUpdate }: ThresholdManagerDialogProps) {
  const [open, setOpen] = useState(false);
  const [reorderThreshold, setReorderThreshold] = useState(
    product.reorderThreshold?.toString() ?? '20'
  );
  const [criticalThreshold, setCriticalThreshold] = useState(
    product.criticalThreshold?.toString() ?? '10'
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const reorderValue = parseInt(reorderThreshold);
      const criticalValue = parseInt(criticalThreshold);

      if (isNaN(reorderValue) || isNaN(criticalValue)) {
        toast.error('Please enter valid numbers for both thresholds');
        return;
      }

      if (criticalValue >= reorderValue) {
        toast.error('Critical threshold must be less than reorder threshold');
        return;
      }

      const response = await fetch('/api/inventory/update-thresholds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          reorderThreshold: reorderValue,
          criticalThreshold: criticalValue,
        }),
      });

      if (response.ok) {
        toast.success(`Updated thresholds for ${product.name}`);
        setOpen(false);
        onUpdate();
      } else {
        throw new Error('Failed to update thresholds');
      }
    } catch (error) {
      toast.error('Failed to update thresholds');
      console.error('Error updating thresholds:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-2">
          <Settings2 className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Stock Thresholds</DialogTitle>
          <DialogDescription>
            Set custom reorder and critical thresholds for {product.name} ({product.sku})
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reorderThreshold">
              Reorder Threshold
              <span className="text-xs text-muted-foreground ml-2">
                (triggers REORDER alerts)
              </span>
            </Label>
            <Input
              id="reorderThreshold"
              type="number"
              min="1"
              value={reorderThreshold}
              onChange={(e) => setReorderThreshold(e.target.value)}
              placeholder="20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="criticalThreshold">
              Critical Threshold
              <span className="text-xs text-muted-foreground ml-2">
                (triggers CRITICAL alerts)
              </span>
            </Label>
            <Input
              id="criticalThreshold"
              type="number"
              min="1"
              value={criticalThreshold}
              onChange={(e) => setCriticalThreshold(e.target.value)}
              placeholder="10"
            />
          </div>
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
            <p>
              <strong>Guidelines:</strong>
            </p>
            <ul className="mt-1 space-y-1">
              <li>• Critical threshold should be less than reorder threshold</li>
              <li>• Consider lead times and consumption patterns</li>
              <li>• High-volume products may need higher thresholds</li>
            </ul>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Thresholds'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}