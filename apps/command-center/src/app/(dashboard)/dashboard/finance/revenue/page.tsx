import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getRevenueByChannel,
  getMonthlyRevenueTrend,
} from '@/app/actions/financial-reports';
import { RevenueByChannelChart } from '@/components/finance/RevenueByChannelChart';
import { RevenueVsProjectionChart } from '@/components/finance/RevenueVsProjectionChart';

export default async function RevenuePage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const currentYear = new Date().getFullYear();

  const [dailyRevenue, monthlyTrend] = await Promise.all([
    getRevenueByChannel(today),
    getMonthlyRevenueTrend(currentYear),
  ]);

  const totalDailyRevenue = dailyRevenue.reduce((sum, r) => sum + r.revenue, 0);

  // MTD = sum of months up to current month (index = current month - 1)
  const currentMonth = new Date().getMonth(); // 0-indexed
  const mtdRevenue = monthlyTrend
    .slice(0, currentMonth + 1)
    .reduce((sum, m) => sum + m.revenue, 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Revenue Analytics</h1>
        <p className="text-gray-400 text-sm mt-1">
          Daily revenue by channel and monthly performance vs projections
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-caribbean-black border-caribbean-gold/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 font-normal">
              Today&apos;s Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{formatCurrency(totalDailyRevenue)}</p>
            <p className="text-xs text-gray-500 mt-1">{format(new Date(), 'MMMM d, yyyy')}</p>
          </CardContent>
        </Card>

        <Card className="bg-caribbean-black border-caribbean-gold/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 font-normal">
              Month-to-Date Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{formatCurrency(mtdRevenue)}</p>
            <p className="text-xs text-gray-500 mt-1">{format(new Date(), 'MMMM yyyy')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily revenue by channel */}
      <Card className="bg-caribbean-black border-caribbean-gold/20">
        <CardHeader>
          <CardTitle className="text-white text-lg">
            Daily Revenue by Channel
          </CardTitle>
          <p className="text-sm text-gray-400">{format(new Date(), 'MMMM d, yyyy')}</p>
        </CardHeader>
        <CardContent>
          <RevenueByChannelChart data={dailyRevenue} />
        </CardContent>
      </Card>

      {/* Monthly revenue vs projections */}
      <Card className="bg-caribbean-black border-caribbean-gold/20">
        <CardHeader>
          <CardTitle className="text-white text-lg">
            Monthly Revenue vs Projections ({currentYear})
          </CardTitle>
          <p className="text-sm text-gray-400">
            Projection benchmark: $100K/month (Year 1 target: $1.2M)
          </p>
        </CardHeader>
        <CardContent>
          <RevenueVsProjectionChart data={monthlyTrend} />
        </CardContent>
      </Card>
    </div>
  );
}
