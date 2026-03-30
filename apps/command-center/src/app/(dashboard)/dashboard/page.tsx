import { getUser } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { RoleBadge } from '@/components/dashboard/RoleBadge';
import { KPICard } from '@/components/dashboard/KPICard';
import { MTDRevenueVsTarget } from '@/components/dashboard/MTDRevenueVsTarget';
import { ARAgingWidget } from '@/components/dashboard/ARAgingWidget';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { getDashboardKPIs } from '@/app/actions/dashboard-kpis';
import { getInventoryAggregation } from '@/app/actions/inventory';
import { InventoryStatusSummary } from '@/components/dashboard/InventoryStatusSummary';
import {
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Plus,
  PackagePlus,
  UserPlus,
  ArrowLeftRight,
  Receipt,
} from 'lucide-react';

async function KPICards({ role }: { role: string }) {
  const kpis = await getDashboardKPIs();

  if (role === 'ADMIN' || role === 'MANAGER') {
    // Units Produced progress bar color
    const unitsCappedPercent = Math.min(kpis.capacityPercent, 100);
    const unitsBarColor =
      kpis.capacityPercent >= 80
        ? 'bg-green-500'
        : kpis.capacityPercent >= 50
        ? 'bg-amber-500'
        : 'bg-red-500';

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {/* DASH-01: Today's Revenue */}
        <KPICard
          title="Today's Revenue"
          value={`$${kpis.todayRevenue.toFixed(2)}`}
          subtitle={`${kpis.todayOrderCount} orders today`}
          icon={<DollarSign className="h-5 w-5" />}
        />

        {/* DASH-02: MTD Revenue with progress bar */}
        <MTDRevenueVsTarget
          mtdRevenue={kpis.mtdRevenue}
          targetRevenue={kpis.targetRevenue}
          mtdRevenuePercent={kpis.mtdRevenuePercent}
        />

        {/* DASH-03: Units Produced with progress bar */}
        <div className="rounded-lg border bg-card p-6 shadow-sm border-l-4 border-l-caribbean-green">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Units Produced (MTD)</p>
              <div className="mt-2">
                <p className="text-3xl font-bold">{kpis.unitsProduced.toLocaleString()}</p>
              </div>
              {/* Progress bar */}
              <div className="mt-3 space-y-1">
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all ${unitsBarColor}`}
                    style={{ width: `${unitsCappedPercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {kpis.capacityPercent.toFixed(1)}% of {kpis.capacityTarget.toLocaleString()} capacity
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-caribbean-green/10 p-3 text-caribbean-green">
              <Package className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* DASH-04: Inventory Value */}
        <KPICard
          title="Inventory Value"
          value={`$${kpis.inventoryValue.toFixed(2)}`}
          subtitle="Across all locations"
          icon={<PackagePlus className="h-5 w-5" />}
        />

        {/* DASH-05: Open Orders (WebsiteOrder + operator Order) */}
        <KPICard
          title="Open Orders"
          value={kpis.openOrderCount.toString()}
          subtitle={`$${kpis.openOrderValue.toFixed(2)} total value`}
          icon={<ShoppingCart className="h-5 w-5" />}
        />

        {/* DASH-06: Accounts Receivable with overdue highlighting */}
        <ARAgingWidget
          totalAR={kpis.totalAR}
          overdueAmount={kpis.overdueAmount}
          overdueCount={kpis.overdueCount}
        />
      </div>
    );
  }

  if (role === 'SALES_REP') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
        <KPICard
          title="My Sales Today"
          value={kpis.todayOrderCount.toString()}
          subtitle={`$${kpis.todayRevenue.toFixed(2)} revenue`}
          icon={<ShoppingCart className="h-5 w-5" />}
        />
        <KPICard
          title="My Revenue MTD"
          value={`$${kpis.mtdRevenue.toFixed(2)}`}
          subtitle={`${kpis.mtdOrderCount} total orders`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KPICard
          title="Active Customers"
          value="0"
          subtitle="Coming in Phase 5"
          icon={<Users className="h-5 w-5" />}
        />
        <KPICard
          title="Pending Follow-ups"
          value="0"
          subtitle="Coming in Phase 5"
          icon={<BarChart3 className="h-5 w-5" />}
        />
      </div>
    );
  }

  return null;
}

async function InventorySummary() {
  const data = await getInventoryAggregation();
  return <InventoryStatusSummary data={data} />;
}

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'INVESTOR') {
    redirect('/dashboard/investor');
  }

  // DASH-07: All 5 quick action buttons enabled with correct hrefs
  const quickActions =
    user.role === 'ADMIN'
      ? [
          { label: 'Purchase Order', href: '/dashboard/orders/new', icon: Plus, enabled: true },
          { label: 'Log Batch', href: '/dashboard/production/new', icon: PackagePlus, enabled: true },
          { label: 'Record Expense', href: '/dashboard/finance/expenses', icon: Receipt, enabled: true },
          { label: 'Transfer', href: '/dashboard/inventory/transfers', icon: ArrowLeftRight, enabled: true },
          { label: 'Invoice', href: '/dashboard/finance/invoices', icon: DollarSign, enabled: true },
        ]
      : user.role === 'MANAGER'
      ? [
          { label: 'Purchase Order', href: '/dashboard/orders/new', icon: Plus, enabled: true },
          { label: 'Log Batch', href: '/dashboard/production/new', icon: PackagePlus, enabled: true },
          { label: 'Record Expense', href: '/dashboard/finance/expenses', icon: Receipt, enabled: true },
          { label: 'Transfer', href: '/dashboard/inventory/transfers', icon: ArrowLeftRight, enabled: true },
        ]
      : user.role === 'SALES_REP'
      ? [
          { label: 'Log Sale', href: '/dashboard/orders', icon: ShoppingCart, enabled: true },
          { label: 'New Customer', href: '/dashboard/crm/customers/new', icon: UserPlus, enabled: true },
        ]
      : [];

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Welcome back, {user.name}
        </h1>
        <p className="text-muted-foreground mt-2">
          Here&apos;s your command center overview
        </p>
        <div className="mt-4">
          <RoleBadge role={user.role} />
        </div>
      </div>

      {/* Quick Actions — all enabled */}
      {quickActions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.label} href={action.href}>
                  <Button
                    variant="outline"
                    className="w-full h-auto flex flex-col items-center gap-2 p-4 border-caribbean-gold hover:bg-caribbean-green/10 hover:border-caribbean-green"
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm">{action.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Cards with Suspense */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Key Metrics</h2>
        <Suspense fallback={<DashboardSkeleton />}>
          <KPICards role={user.role} />
        </Suspense>
      </div>

      {/* Inventory Status */}
      {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Inventory Status</h2>
          <Suspense fallback={<DashboardSkeleton />}>
            <InventorySummary />
          </Suspense>
        </div>
      )}
    </div>
  );
}
