'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Factory,
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  BarChart,
  Settings,
  TrendingUp,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { hasPermission } from '@/lib/auth/permissions';
import { logout } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';

type User = {
  name: string;
  email: string;
  role: string;
};

type SidebarProps = {
  user: User;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: string;
};

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home, permission: 'dashboard' },
  { label: 'Production', href: '/dashboard/production', icon: Factory, permission: 'production' },
  { label: 'Inventory', href: '/dashboard/inventory', icon: Package, permission: 'inventory' },
  { label: 'Orders', href: '/dashboard/orders', icon: ShoppingCart, permission: 'orders' },
  { label: 'Customers', href: '/dashboard/customers', icon: Users, permission: 'customers' },
  { label: 'Finance', href: '/dashboard/finance', icon: DollarSign, permission: 'finance' },
  { label: 'Reports', href: '/dashboard/reports', icon: BarChart, permission: 'reports' },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings, permission: 'settings' },
  { label: 'Investor Portal', href: '/dashboard/investor', icon: TrendingUp, permission: 'investor' },
];

export function Sidebar({ user }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  // Filter nav items based on user role permissions
  const filteredNavItems = navItems.filter((item) =>
    hasPermission(user.role, item.permission)
  );

  const handleLogout = async () => {
    await logout();
  };

  return (
    <aside
      className={`
        fixed left-0 top-0 h-full bg-caribbean-black border-r border-caribbean-gold/20
        transition-all duration-300 ease-in-out z-40
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-caribbean-gold/20">
          {!collapsed && (
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-caribbean-green to-caribbean-gold flex items-center justify-center text-white font-bold">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.name}
                </p>
                <p className="text-xs text-caribbean-green truncate">
                  {user.role}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-2 rounded-md hover:bg-caribbean-green/10 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5 text-caribbean-gold" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-caribbean-gold" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center space-x-3 px-3 py-2 rounded-md transition-colors
                      ${
                        isActive
                          ? 'bg-caribbean-green text-white'
                          : 'text-gray-400 hover:bg-caribbean-green/10 hover:text-caribbean-gold'
                      }
                      ${collapsed ? 'justify-center' : ''}
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span className="text-sm">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout button */}
        <div className="p-4 border-t border-caribbean-gold/20">
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center space-x-3 px-3 py-2 rounded-md
              text-red-400 hover:bg-red-500/10 transition-colors
              ${collapsed ? 'justify-center' : ''}
            `}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
