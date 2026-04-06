import { verifyManagerOrAbove } from '@/lib/dal';
import { getRestaurantLeads, getLeadMetrics } from '@/app/actions/restaurant-leads';
import { RestaurantLeadsClient } from './client';

export default async function RestaurantLeadsPage() {
  await verifyManagerOrAbove();

  const [leads, metrics] = await Promise.all([
    getRestaurantLeads(),
    getLeadMetrics(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Restaurant Leads</h1>
        <p className="text-muted-foreground mt-1">
          Wholesale leads from jamaicahousebrand.com/restaurant-partners
        </p>
      </div>

      <RestaurantLeadsClient initialLeads={leads as any} metrics={metrics} />
    </div>
  );
}
