'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import { toast } from 'sonner';

interface ThresholdManagerProps {
  product: {
    id: string;
    name: string;
    sku: string;
    reorderThreshold: number | null;
    criticalThreshold: number | null;
  };
  onUpdate: () => void;
}

export function ThresholdManagerDialog({ product, onUpdate }: ThresholdManagerProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleQuickUpdate = async () => {
    const reorderValue = prompt(
      `Set reorder threshold for ${product.name}:`,
      (product.reorderThreshold ?? 20).toString()
    );

    if (!reorderValue) return;

    const criticalValue = prompt(
      `Set critical threshold for ${product.name}:`,
      (product.criticalThreshold ?? 10).toString()
    );

    if (!criticalValue) return;

    const reorderNum = parseInt(reorderValue);
    const criticalNum = parseInt(criticalValue);

    if (isNaN(reorderNum) || isNaN(criticalNum)) {
      toast.error('Please enter valid numbers');
      return;
    }

    if (criticalNum >= reorderNum) {
      toast.error('Critical threshold must be less than reorder threshold');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch('/api/inventory/update-thresholds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          reorderThreshold: reorderNum,
          criticalThreshold: criticalNum,
        }),
      });

      if (response.ok) {
        toast.success(`Updated thresholds for ${product.name}`);
        onUpdate();
      } else {
        throw new Error('Failed to update thresholds');
      }
    } catch (error) {
      toast.error('Failed to update thresholds');
      console.error('Error updating thresholds:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 px-2"
      onClick={handleQuickUpdate}
      disabled={isUpdating}
      title="Edit thresholds"
    >
      <Settings2 className="h-3 w-3" />
    </Button>
  );
}