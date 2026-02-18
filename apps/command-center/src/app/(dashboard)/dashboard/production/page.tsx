import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { getBatches, getProductionMetrics } from '@/app/actions/production';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { BatchList } from '@/components/production/BatchList';
import { CapacityMetrics } from '@/components/production/CapacityMetrics';

export default async function ProductionPage() {
  await verifySession();

  // Fetch batches and metrics
  const batches = await getBatches();
  const metrics = await getProductionMetrics();

  // Fetch products for filter dropdown
  const products = await db.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Production Tracking</h1>
          <p className="text-muted-foreground mt-2">
            Track hot sauce batches from production through quality control.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/production/new">New Batch</Link>
        </Button>
      </div>

      {/* Capacity Metrics */}
      <CapacityMetrics
        totalUnits={metrics.totalUnits}
        target={metrics.target}
        batchCount={metrics.batchCount}
        utilizationPercent={metrics.utilizationPercent}
      />

      {/* Batch List */}
      <BatchList initialBatches={batches} products={products} />
    </div>
  );
}
