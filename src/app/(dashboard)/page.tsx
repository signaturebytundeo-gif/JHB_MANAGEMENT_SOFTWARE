import { getUser } from '@/lib/dal';
import { redirect } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DollarSign, Package, ShoppingCart, TrendingUp } from 'lucide-react';

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  // Placeholder KPI data
  const kpis = [
    {
      title: "Today's Revenue",
      value: 'Coming soon',
      icon: DollarSign,
      color: 'text-caribbean-green',
    },
    {
      title: 'Units Produced',
      value: 'Coming soon',
      icon: Package,
      color: 'text-caribbean-gold',
    },
    {
      title: 'Open Orders',
      value: 'Coming soon',
      icon: ShoppingCart,
      color: 'text-blue-500',
    },
    {
      title: 'Growth This Month',
      value: 'Coming soon',
      icon: TrendingUp,
      color: 'text-green-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {user.name}
        </h1>
        <p className="text-muted-foreground mt-2">
          Here's what's happening in your business today.
        </p>
        <div className="inline-flex items-center mt-4 px-3 py-1 rounded-full bg-caribbean-green/10 border border-caribbean-green/20">
          <span className="text-sm font-medium text-caribbean-green">
            {user.role}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="border-caribbean-gold/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {kpi.title}
                </CardTitle>
                <Icon className={`w-5 h-5 ${kpi.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-muted-foreground">
                  {kpi.value}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Data will be available after module implementation
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Coming soon section */}
      <Card className="border-caribbean-green/20">
        <CardHeader>
          <CardTitle>Your Dashboard</CardTitle>
          <CardDescription>
            Real-time insights and analytics coming soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 rounded-full bg-caribbean-green animate-pulse" />
              <p className="text-sm text-muted-foreground">
                Production tracking module in development
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 rounded-full bg-caribbean-gold animate-pulse" />
              <p className="text-sm text-muted-foreground">
                Inventory management module in development
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <p className="text-sm text-muted-foreground">
                Order management module in development
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
