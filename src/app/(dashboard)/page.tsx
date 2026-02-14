import { getUser } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
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
  // Simulate data loading delay for Suspense demonstration
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Role-specific KPIs
  if (role === 'ADMIN' || role === 'MANAGER') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KPICard
          title="Today's Revenue"
          value="$0"
          subtitle="Coming in Phase 6"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KPICard
          title="MTD Revenue"
          value="$0"
          subtitle="Coming in Phase 6"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KPICard
          title="Units Produced"
          value="0"
          subtitle="Coming in Phase 2"
          icon={<Package className="h-5 w-5" />}
        />
        <KPICard
          title="Current Inventory"
          value="0"
          subtitle="Coming in Phase 3"
          icon={<PackagePlus className="h-5 w-5" />}
        />
        <KPICard
          title="Open Orders"
          value="0"
          subtitle="Coming in Phase 4"
          icon={<ShoppingCart className="h-5 w-5" />}
        />
        <KPICard
          title="Accounts Receivable"
          value="$0"
          subtitle="Coming in Phase 4"
          icon={<Receipt className="h-5 w-5" />}
        />
      </div>
    );
  }

  if (role === 'SALES_REP') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <KPICard
          title="My Orders Today"
          value="0"
          subtitle="Coming in Phase 4"
          icon={<ShoppingCart className="h-5 w-5" />}
        />
        <KPICard
          title="My Revenue MTD"
          value="$0"
          subtitle="Coming in Phase 6"
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

  // Redirect investor to their dedicated dashboard
  if (user.role === 'INVESTOR') {
    redirect('/dashboard/investor');
  }

  // Quick action buttons by role
  const quickActions =
    user.role === 'ADMIN'
      ? [
          { label: 'New Batch', phase: 2, icon: Plus },
          { label: 'New Order', phase: 4, icon: ShoppingCart },
          { label: 'Record Expense', phase: 6, icon: Receipt },
          { label: 'Transfer Inventory', phase: 3, icon: ArrowLeftRight },
        ]
      : user.role === 'MANAGER'
      ? [
          { label: 'New Batch', phase: 2, icon: Plus },
          { label: 'New Order', phase: 4, icon: ShoppingCart },
          { label: 'Transfer Inventory', phase: 3, icon: ArrowLeftRight },
        ]
      : user.role === 'SALES_REP'
      ? [
          { label: 'New Order', phase: 4, icon: ShoppingCart },
          { label: 'New Customer', phase: 5, icon: UserPlus },
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
