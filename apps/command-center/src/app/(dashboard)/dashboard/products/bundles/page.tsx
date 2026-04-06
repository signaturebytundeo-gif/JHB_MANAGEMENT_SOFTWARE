import { verifyManagerOrAbove } from '@/lib/dal';
import { getBundles } from '@/app/actions/bundles';
import { getProducts } from '@/app/actions/sales';
import { BundlesClient } from './client';

export default async function BundlesPage() {
  await verifyManagerOrAbove();
  const [bundles, products] = await Promise.all([getBundles(), getProducts()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Product Bundles</h1>
        <p className="text-muted-foreground mt-1">
          Define bundle SKUs that automatically deduct component inventory when sold.
        </p>
      </div>
      <BundlesClient initialBundles={bundles as any} products={products as any} />
    </div>
  );
}
