import { Settings } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage users, roles, and application configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/dashboard/settings/users" className="block">
          <div className="rounded-lg border bg-card p-6 hover:border-caribbean-green/50 transition-colors">
            <h3 className="text-lg font-semibold mb-2">User Management</h3>
            <p className="text-sm text-muted-foreground">
              Invite users, manage roles, and deactivate accounts.
            </p>
          </div>
        </Link>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold">App Configuration</h3>
            <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">Phase 7</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Products, pricing tiers, locations, and sales channels.
          </p>
        </div>
      </div>
    </div>
  );
}
