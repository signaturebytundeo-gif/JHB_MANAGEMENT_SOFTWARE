import { Suspense } from 'react';
import { getUser } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { getInvestorMetrics } from '@/app/actions/investor-metrics';
import { KPICard } from '@/components/dashboard/KPICard';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { RevenueTrendChart } from '@/components/investor/RevenueTrendChart';
import { ChannelPieChart } from '@/components/investor/ChannelPieChart';
import { CapacityGauge } from '@/components/investor/CapacityGauge';
import { FinancialHealthCards } from '@/components/investor/FinancialHealthCards';
import { DarkModeToggle } from '@/components/investor/DarkModeToggle';
import { PrintButton } from '@/components/investor/PrintButton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DollarSign,
  TrendingUp,
  Package,
  Users,
  BarChart3,
} from 'lucide-react';

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

export default async function InvestorDashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  const metrics = await getInvestorMetrics();

  const yoyLabel =
    metrics.yoyGrowth !== null
      ? `${metrics.yoyGrowth >= 0 ? '+' : ''}${metrics.yoyGrowth.toFixed(1)}% YoY`
      : 'N/A (first year)';

  const yoyTrend =
    metrics.yoyGrowth !== null
      ? metrics.yoyGrowth >= 0
        ? ('up' as const)
        : ('down' as const)
      : ('neutral' as const);

  const topChannelLabel = metrics.topChannel
    ? `Top: ${metrics.topChannel}`
    : 'No channel data';

  return (
    <div className="space-y-8 print:p-0">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Investor Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Read-only view of Jamaica House Brand operations and metrics
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <DarkModeToggle />
          <PrintButton />
        </div>
      </div>

      {/* Revenue Overview (INVST-01) */}
      <Suspense fallback={<DashboardSkeleton />}>
        <div>
          <h2 className="text-lg font-semibold mb-4">Revenue Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <KPICard
              title="MTD Revenue"
              value={formatCurrency(metrics.mtdRevenue)}
              subtitle="Current month to date"
              icon={<DollarSign className="h-5 w-5" />}
            />
            <KPICard
              title="YTD Revenue"
              value={formatCurrency(metrics.ytdRevenue)}
              subtitle={`${new Date().getFullYear()} year to date`}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <KPICard
              title="Revenue Growth"
              value={yoyLabel}
              subtitle="Year over year comparison"
              icon={<BarChart3 className="h-5 w-5" />}
              trend={yoyTrend}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueTrendChart data={metrics.revenueTrend} />
            </CardContent>
          </Card>
        </div>
      </Suspense>

      {/* Channel Diversification (INVST-02) */}
      <Suspense fallback={<DashboardSkeleton />}>
        <div>
          <h2 className="text-lg font-semibold mb-4">Channel Diversification</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue by Channel</CardTitle>
              </CardHeader>
              <CardContent>
                <ChannelPieChart data={metrics.channelRevenue} />
              </CardContent>
            </Card>

            <div className="space-y-4">
              <KPICard
                title="Active Channels"
                value={metrics.activeChannelCount}
                subtitle="Enabled sales channels"
                icon={<BarChart3 className="h-5 w-5" />}
              />
              <KPICard
                title="Top Channel"
                value={topChannelLabel}
                subtitle="Highest revenue channel this period"
                icon={<TrendingUp className="h-5 w-5" />}
              />
              <KPICard
                title="Active Customers"
                value={metrics.activeCustomerCount}
                subtitle="Total registered customers"
                icon={<Users className="h-5 w-5" />}
              />
            </div>
          </div>
        </div>
      </Suspense>

      {/* Production Capacity (INVST-03) */}
      <Suspense fallback={<DashboardSkeleton />}>
        <div>
          <h2 className="text-lg font-semibold mb-4">Production Capacity</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-5 w-5" />
                Monthly Production Utilization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CapacityGauge
                utilization={metrics.capacityUtilization}
                totalUnits={metrics.totalUnitsProduced}
                target={metrics.capacityTarget}
              />
            </CardContent>
          </Card>
        </div>
      </Suspense>

      {/* Financial Health (INVST-04) */}
      <Suspense fallback={<DashboardSkeleton />}>
        <div>
          <h2 className="text-lg font-semibold mb-4">Financial Health</h2>
          <FinancialHealthCards
            grossMargin={metrics.grossMargin}
            netMargin={metrics.netMargin}
            totalRevenue={metrics.totalRevenue}
            totalExpenses={metrics.totalExpenses}
            monthlyProjection={metrics.monthlyProjection}
          />
        </div>
      </Suspense>

      {/* Ownership Structure (INVST-05) */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Ownership Structure</h2>
        <Card>
          <CardHeader>
            <CardTitle>Equity Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b">
                <div>
                  <p className="font-semibold">Anthony Amos Jr.</p>
                  <p className="text-sm text-muted-foreground">CEO/Founder</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-caribbean-green">55%</p>
                </div>
              </div>
              <div className="flex items-center justify-between pb-4 border-b">
                <div>
                  <p className="font-semibold">Olatunde Ogunjulugbe</p>
                  <p className="text-sm text-muted-foreground">President</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-caribbean-green">30%</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Olutomiwa Ogunjulube</p>
                  <p className="text-sm text-muted-foreground">Partner</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-caribbean-green">15%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
