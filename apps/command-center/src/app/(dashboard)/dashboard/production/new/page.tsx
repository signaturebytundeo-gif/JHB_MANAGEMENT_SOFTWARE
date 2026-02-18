import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { verifySession } from '@/lib/dal';
import { db } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BatchForm } from '@/components/production/BatchForm';

export default async function NewBatchPage() {
  // Verify user is authenticated
  await verifySession();

  // Fetch data for form
  const [products, coPackerPartners, locations] = await Promise.all([
    db.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, sku: true },
      orderBy: { name: 'asc' },
    }),
    db.coPackerPartner.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    db.location.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/production"
          className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-caribbean-green mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Production
        </Link>
        <h1 className="text-3xl font-bold">New Production Batch</h1>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Details</CardTitle>
        </CardHeader>
        <CardContent>
          <BatchForm
            products={products}
            coPackerPartners={coPackerPartners}
            locations={locations}
          />
        </CardContent>
      </Card>
    </div>
  );
}
