export function getRoleDashboard(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/dashboard';
    case 'MANAGER':
      return '/dashboard';
    case 'SALES_REP':
      return '/dashboard';
    case 'INVESTOR':
      return '/dashboard/investor';
    default:
      return '/dashboard';
  }
}

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    'dashboard',
    'production',
    'inventory',
    'locations',
    'orders',
    'events',
    'shipping',
    'customers',
    'promo-codes',
    'finance',
    'reports',
    'settings',
    'investor',
    'documents',
  ],
  MANAGER: [
    'dashboard',
    'production',
    'inventory',
    'locations',
    'orders',
    'events',
    'shipping',
    'customers',
    'promo-codes',
    'reports',
    'documents',
  ],
  SALES_REP: ['dashboard', 'orders', 'events', 'customers'],
  INVESTOR: ['investor'],
};

export function hasPermission(role: string, section: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(section);
}
