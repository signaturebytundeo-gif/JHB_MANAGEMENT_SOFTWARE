import { getUser } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RoleBadge } from '@/components/dashboard/RoleBadge';
import { KPICard } from '@/components/dashboard/KPICard';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { getProductionMetrics } from '@/app/actions/production';
import { getSalesMetrics } from '@/app/actions/sales';
import {
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  BarChart3,
  Plus,
  PackagePlus,
  UserPlus,
  ArrowLeftRight,
  Receipt,
} from 'lucide-react';

async function KPICards({ role }: { role: string }) {
  const [productionMetrics, salesMetrics] = await Promise.all([
    getProductionMetrics(),
    getSalesMetrics(),
  ]);

  if (role === 'ADMIN' || role === 'MANAGER') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KPICard
          title="Today's Revenue"
          value={`$${salesMetrics.todayRevenue.toFixed(2)}`}
          subtitle={`${salesMetrics.todaySaleCount} sale${salesMetrics.todaySaleCount !== 1 ? 's' : ''} today`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KPICard
          title="MTD Revenue"
          value={`$${salesMetrics.mtdRevenue.toFixed(2)}`}
          subtitle={`${salesMetrics.mtdSaleCount} sale${salesMetrics.mtdSaleCount !== 1 ? 's' : ''} this month`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KPICard
          title="Units Produced (MTD)"
          value={productionMetrics.totalUnits.toLocaleString()}
          subtitle={`${productionMetrics.batchCount} batch${productionMetrics.batchCount !== 1 ? 'es' : ''} — ${productionMetrics.utilizationPercent}% of ${productionMetrics.target.toLocaleString()} target`}
          icon={<Package className="h-5 w-5" />}
        />
        <KPICard
          title="Units Sold (MTD)"
          value={salesMetrics.mtdUnits.toLocaleString()}
          subtitle="Across all channels"
          icon={<PackagePlus className="h-5 w-5" />}
        />
        <KPICard
          title="Open Orders"
          value={salesMetrics.openOrderCount.toString()}
          subtitle={`${salesMetrics.openOrderCount} order${salesMetrics.openOrderCount !== 1 ? 's' : ''} this month`}
          icon={<ShoppingCart className="h-5 w-5" />}
        />
        <KPICard
          title="Accounts Receivable"
          value={`$${salesMetrics.accountsReceivable.toFixed(2)}`}
          subtitle="Net 30 sales (last 30 days)"
          icon={<Receipt className="h-5 w-5" />}
        />
      </div>
    );
  }

  if (role === 'SALES_REP') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <KPICard
          title="My Sales Today"
          value={salesMetrics.todaySaleCount.toString()}
          subtitle={`$${salesMetrics.todayRevenue.toFixed(2)} revenue`}
          icon={<ShoppingCart className="h-5 w-5" />}
        />
        <KPICard
          title="My Revenue MTD"
          value={`$${salesMetrics.mtdRevenue.toFixed(2)}`}
          subtitle={`${salesMetrics.mtdSaleCount} total sales`}
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

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'INVESTOR') {
    redirect('/dashboard/investor');
  }

  const quickActions =
    user.role === 'ADMIN'
      ? [
          { label: 'New Batch', href: '/dashboard/production/new', icon: Plus, enabled: true },
          { label: 'Log Sale', href: '/dashboard/orders', icon: ShoppingCart, enabled: true },
          { label: 'Record Expense', phase: 6, icon: Receipt, enabled: false },
          { label: 'Transfer Inventory', href: '/dashboard/inventory', icon: ArrowLeftRight, enabled: true },
        ]
      : user.role === 'MANAGER'
      ? [
          { label: 'New Batch', href: '/dashboard/production/new', icon: Plus, enabled: true },
          { label: 'Log Sale', href: '/dashboard/orders', icon: ShoppingCart, enabled: true },
          { label: 'Transfer Inventory', href: '/dashboard/inventory', icon: ArrowLeftRight, enabled: true },
        ]
      : user.role === 'SALES_REP'
      ? [
          { label: 'Log Sale', href: '/dashboard/orders', icon: ShoppingCart, enabled: true },
          { label: 'New Customer', phase: 5, icon: UserPlus, enabled: false },
        ]
      : [];

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {/* Welcome section */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {user.name}
          </h1>
          <p className="text-muted-foreground mt-2">
            Here's your command center overview
          </p>
          <div className="mt-4">
            <RoleBadge role={user.role} />
          </div>
        </div>

        {/* Quick Actions */}
        {quickActions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon;

                if (action.enabled && action.href) {
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
                }

                return (
                  <Tooltip key={action.label}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        disabled
                        className="h-auto flex flex-col items-center gap-2 p-4 border-caribbean-gold"
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-sm">{action.label}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Coming soon in Phase {action.phase}</p>
                    </TooltipContent>
                  </Tooltip>
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
      </div>
    </TooltipProvider>
  );
}
