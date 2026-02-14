import { ShoppingCart } from 'lucide-react';

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Orders & Sales</h1>
        <p className="text-muted-foreground mt-2">
          Create and manage wholesale, retail, and subscription orders.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-12 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-caribbean-green/10 flex items-center justify-center mb-6">
          <ShoppingCart className="h-8 w-8 text-caribbean-green" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Coming in Phase 4</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Order entry, pricing tier application, volume discounts, approval workflows, and fulfillment tracking.
        </p>
      </div>
    </div>
  );
}
