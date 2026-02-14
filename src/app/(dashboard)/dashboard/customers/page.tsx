import { Users } from 'lucide-react';

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Customer Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage wholesale accounts, retail customers, and sales relationships.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-12 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-caribbean-green/10 flex items-center justify-center mb-6">
          <Users className="h-8 w-8 text-caribbean-green" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Coming in Phase 4</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Customer profiles, contact management, order history, credit terms, and sales rep assignments.
        </p>
      </div>
    </div>
  );
}
