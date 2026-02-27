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
    'orders',
    'shipping',
    'customers',
    'finance',
    'reports',
    'settings',
    'investor',
  ],
  MANAGER: [
    'dashboard',
    'production',
    'inventory',
    'orders',
    'shipping',
    'customers',
    'reports',
  ],
  SALES_REP: ['dashboard', 'orders', 'customers'],
  INVESTOR: ['investor'],
};

export function hasPermission(role: string, section: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(section);
}
