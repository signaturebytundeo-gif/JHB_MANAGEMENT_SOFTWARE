'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Factory,
  Package,
  ShoppingCart,
  Truck,
  Users,
  DollarSign,
  BarChart,
  Settings,
  TrendingUp,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { hasPermission } from '@/lib/auth/permissions';
import { logout } from '@/app/actions/auth';

type User = {
  name: string;
  email: string;
  role: string;
};

type SidebarProps = {
  user: User;
  isOpen?: boolean;
  onClose?: () => void;
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
  { label: 'Shipping', href: '/dashboard/shipping', icon: Truck, permission: 'shipping' },
  { label: 'Customers', href: '/dashboard/customers', icon: Users, permission: 'customers' },
  { label: 'Finance', href: '/dashboard/finance', icon: DollarSign, permission: 'finance' },
  { label: 'Reports', href: '/dashboard/reports', icon: BarChart, permission: 'reports' },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings, permission: 'settings' },
  { label: 'Investor Portal', href: '/dashboard/investor', icon: TrendingUp, permission: 'investor' },
];

function SidebarContent({
  user,
  collapsed,
  onLinkClick,
}: {
  user: User;
  collapsed: boolean;
  onLinkClick?: () => void;
}) {
  const pathname = usePathname();

  const filteredNavItems = navItems.filter((item) =>
    hasPermission(user.role, item.permission)
  );

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-caribbean-gold/20">
        {!collapsed ? (
          <div className="mb-4">
            <div className="flex justify-center mb-3">
              <img
                src="/images/logo.jpg"
                alt="Jamaica House Brand"
                className="w-20 h-20 rounded-full object-cover border-2 border-caribbean-gold/40"
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white truncate">
                {user.name}
              </p>
              <p className="text-xs text-caribbean-gold truncate">
                {user.role}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-2">
            <img
              src="/images/logo.jpg"
              alt="JHB"
              className="w-10 h-10 rounded-full object-cover border border-caribbean-gold/40"
            />
          </div>
        )}
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
                  onClick={onLinkClick}
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
  );
}

export function Sidebar({ user, isOpen = false, onClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* ====== DESKTOP SIDEBAR — always visible at lg+ ====== */}
      <aside
        className={`
          hidden lg:block fixed left-0 top-0 h-full z-50
          bg-caribbean-black border-r border-caribbean-gold/20
          transition-all duration-300
          ${collapsed ? 'w-16' : 'w-64'}
        `}
      >
        <SidebarContent user={user} collapsed={collapsed} />
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute bottom-20 -right-3 w-6 h-6 rounded-full bg-caribbean-black border border-caribbean-gold/20 flex items-center justify-center hover:bg-caribbean-green/10 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3 text-caribbean-gold" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-caribbean-gold" />
          )}
        </button>
      </aside>

      {/* ====== MOBILE DRAWER — only rendered when open, completely absent otherwise ====== */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />
          {/* Drawer */}
          <aside className="fixed left-0 top-0 h-full w-64 z-50 bg-caribbean-black border-r border-caribbean-gold/20 lg:hidden">
            {/* Close button */}
            <div className="absolute top-3 right-3">
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-caribbean-green/10 transition-colors"
              >
                <X className="w-5 h-5 text-caribbean-gold" />
              </button>
            </div>
            <SidebarContent user={user} collapsed={false} onLinkClick={onClose} />
          </aside>
        </>
      )}
    </>
  );
}
