import Link from 'next/link';
import { verifyManagerOrAbove } from '@/lib/dal';
import { db } from '@/lib/db';
import { AddProductForm } from '@/components/inventory/AddProductForm';

export default async function NewProductPage() {
  await verifyManagerOrAbove();

  const locations = await db.location.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/inventory"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Inventory
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Add Product</h1>
        <p className="text-muted-foreground mt-1">
          Create a new product with SKU, pricing, and starting stock. Or tap the
          mic and say something like "New juice, Mango Lime, SKU JHB-JC-MAN-LIM,
          seven ninety-nine, 24 bottles at Farmers Markets."
        </p>
      </div>

      <AddProductForm locations={locations} />
    </div>
  );
}
