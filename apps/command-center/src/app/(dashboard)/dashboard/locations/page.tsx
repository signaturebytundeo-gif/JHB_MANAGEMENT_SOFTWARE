import { verifyManagerOrAbove } from '@/lib/dal';
import { getLocations } from '@/app/actions/locations';
import { LocationsClient } from './client';

export default async function LocationsPage() {
  await verifyManagerOrAbove();
  const locations = await getLocations();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Locations</h1>
        <p className="text-muted-foreground mt-1">
          Manage inventory locations — restaurants, warehouses, markets, and events.
        </p>
      </div>

      <LocationsClient locations={locations} />
    </div>
  );
}
