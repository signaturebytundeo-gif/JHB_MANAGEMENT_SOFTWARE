import { Package } from 'lucide-react';

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
        <p className="text-muted-foreground mt-2">
          Monitor stock levels across all locations and manage transfers.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-12 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-caribbean-green/10 flex items-center justify-center mb-6">
          <Package className="h-8 w-8 text-caribbean-green" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Coming in Phase 3</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Multi-location inventory tracking, stock transfers, low-stock alerts, and inventory valuation reports.
        </p>
      </div>
    </div>
  );
}
