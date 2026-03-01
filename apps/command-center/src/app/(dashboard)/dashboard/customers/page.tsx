import { Suspense } from 'react';
import { getCustomers, getCustomerMetrics } from '@/app/actions/customers';
import { CustomersClient } from './client';

async function CustomersContent() {
  const [customers, metrics] = await Promise.all([
    getCustomers(),
    getCustomerMetrics(),
  ]);

  return <CustomersClient initialCustomers={customers} metrics={metrics} />;
}

function CustomersLoading() {
  return (
    <div className="space-y-6">
      {/* Metrics skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6 animate-pulse">
            <div className="h-4 bg-muted rounded w-24 mb-2" />
            <div className="h-8 bg-muted rounded w-16" />
          </div>
        ))}
      </div>
      {/* Table skeleton */}
      <div className="rounded-lg border bg-card p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-40 mb-4" />
        <div className="h-64 bg-muted rounded" />
      </div>
    </div>
  );
}

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Customer Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage website customers, view order history, and track spending.
        </p>
      </div>

      <Suspense fallback={<CustomersLoading />}>
        <CustomersContent />
      </Suspense>
    </div>
  );
}
