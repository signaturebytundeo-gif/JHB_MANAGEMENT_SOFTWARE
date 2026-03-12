import { Suspense } from 'react';
import { getCustomers, getCustomerMetrics } from '@/app/actions/customers';
import { getSubscriptionMembers } from '@/app/actions/crm-subscriptions';
import { getDistributorAgreements } from '@/app/actions/crm-distributors';
import { getLeads } from '@/app/actions/crm-leads';
import { db } from '@/lib/db';
import { CustomersClient } from './client';
import { CRMTabs } from '@/components/crm/CRMTabs';
import { SubscriptionMemberList } from '@/components/crm/SubscriptionMemberList';
import { DistributorList } from '@/components/crm/DistributorList';
import LeadPipeline from '@/components/crm/LeadPipeline';

async function CustomerProfilesContent() {
  const [customers, metrics] = await Promise.all([
    getCustomers(),
    getCustomerMetrics(),
  ]);

  return <CustomersClient initialCustomers={customers} metrics={metrics} />;
}

async function SubscriptionsContent() {
  const [members, customers, plans] = await Promise.all([
    getSubscriptionMembers(),
    db.customer.findMany({
      select: { id: true, firstName: true, lastName: true },
    }),
    db.subscriptionPlan.findMany({
      select: { id: true, name: true, billingCycle: true, price: true },
    }),
  ]);

  const serializedPlans = plans.map((p) => ({
    ...p,
    price: Number(p.price),
  }));

  return (
    <SubscriptionMemberList
      members={members}
      customers={customers}
      plans={serializedPlans}
    />
  );
}

async function DistributorsContent() {
  const [agreements, customers] = await Promise.all([
    getDistributorAgreements(),
    db.customer.findMany({
      select: { id: true, firstName: true, lastName: true, company: true },
    }),
  ]);

  return <DistributorList agreements={agreements} customers={customers} />;
}

async function LeadsContent() {
  const [leads, users] = await Promise.all([
    getLeads(),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    }),
  ]);

  return <LeadPipeline leads={leads} users={users} />;
}

function SectionLoading() {
  return (
    <div className="rounded-lg border bg-card p-6 animate-pulse">
      <div className="h-6 bg-muted rounded w-40 mb-4" />
      <div className="h-64 bg-muted rounded" />
    </div>
  );
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
          Manage customers, subscriptions, distributors, and leads.
        </p>
      </div>

      <CRMTabs
        profiles={
          <Suspense fallback={<CustomersLoading />}>
            <CustomerProfilesContent />
          </Suspense>
        }
        subscriptions={
          <Suspense fallback={<SectionLoading />}>
            <SubscriptionsContent />
          </Suspense>
        }
        distributors={
          <Suspense fallback={<SectionLoading />}>
            <DistributorsContent />
          </Suspense>
        }
        leads={
          <Suspense fallback={<SectionLoading />}>
            <LeadsContent />
          </Suspense>
        }
      />
    </div>
  );
}
