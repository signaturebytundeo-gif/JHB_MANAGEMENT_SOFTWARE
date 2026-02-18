import { getUser } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { KPICard } from '@/components/dashboard/KPICard';
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
  Percent,
} from 'lucide-react';

export default async function InvestorDashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Investor Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Read-only view of Jamaica House Brand operations and metrics
        </p>
      </div>

      {/* Revenue Overview */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Revenue Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KPICard
            title="MTD Revenue"
            value="$0"
            subtitle="Coming in Phase 6"
            icon={<DollarSign className="h-5 w-5" />}
          />
          <KPICard
            title="YTD Revenue"
            value="$0"
            subtitle="Coming in Phase 6"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <KPICard
            title="Revenue Growth"
            value="0%"
            subtitle="Coming in Phase 6"
            icon={<BarChart3 className="h-5 w-5" />}
          />
        </div>
      </div>

      {/* Production Metrics */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Production Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <KPICard
            title="Units Produced MTD"
            value="0"
            subtitle="Coming in Phase 2"
            icon={<Package className="h-5 w-5" />}
          />
          <KPICard
            title="Production Capacity"
            value="0%"
            subtitle="Coming in Phase 2"
            icon={<Percent className="h-5 w-5" />}
          />
        </div>
      </div>

      {/* Market Traction */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Market Traction</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <KPICard
            title="Active Customers"
            value="0"
            subtitle="Coming in Phase 5"
            icon={<Users className="h-5 w-5" />}
          />
          <KPICard
            title="Channel Count"
            value="0"
            subtitle="Coming in Phase 5"
            icon={<BarChart3 className="h-5 w-5" />}
          />
        </div>
      </div>

      {/* Financial Health */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Financial Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <KPICard
            title="Gross Margin"
            value="0%"
            subtitle="Coming in Phase 6"
            icon={<Percent className="h-5 w-5" />}
          />
          <KPICard
            title="Net Margin"
            value="0%"
            subtitle="Coming in Phase 6"
            icon={<Percent className="h-5 w-5" />}
          />
        </div>
      </div>

      {/* Ownership Structure */}
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
                  <p className="text-2xl font-bold text-caribbean-green">70%</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Olatunde Ogunjulugbe</p>
                  <p className="text-sm text-muted-foreground">President</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-caribbean-green">30%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
