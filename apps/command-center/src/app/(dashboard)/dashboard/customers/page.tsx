import { Suspense } from 'react';
import { getCustomers, getCustomerMetrics } from '@/app/actions/customers';
import { CustomersClient } from './client';
import { CRMTabs } from '@/components/crm/CRMTabs';

async function CustomerProfilesContent() {
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

function ComingSoonPlaceholder({ section }: { section: string }) {
  return (
    <div className="rounded-lg border bg-card p-12 text-center">
      <p className="text-muted-foreground text-sm">
        {section} — Coming soon
      </p>
    </div>
  );
}

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Customer Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage customers, subscriptions, distributors, and leads.
        </p>
      </div>

      <CRMTabs
        profiles={
          <Suspense fallback={<CustomersLoading />}>
            <CustomerProfilesContent />
          </Suspense>
        }
        subscriptions={<ComingSoonPlaceholder section="Subscriptions" />}
        distributors={<ComingSoonPlaceholder section="Distributors" />}
        leads={<ComingSoonPlaceholder section="Leads" />}
      />
    </div>
  );
}
