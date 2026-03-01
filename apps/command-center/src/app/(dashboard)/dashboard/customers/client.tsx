'use client';

import { useState, useTransition } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getCustomers } from '@/app/actions/customers';
import { Search, Users, UserPlus, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

type CustomerRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  orderCount: number;
  totalSpent: number | { toString(): string };
  createdAt: Date;
  orders: { orderDate: Date }[];
};

type Metrics = {
  totalCustomers: number;
  newThisMonth: number;
  topSpenders: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    totalSpent: number | { toString(): string };
    orderCount: number;
  }[];
};

interface CustomersClientProps {
  initialCustomers: CustomerRow[];
  metrics: Metrics;
}

export function CustomersClient({ initialCustomers, metrics }: CustomersClientProps) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    startTransition(async () => {
      const result = await getCustomers(query || undefined);
      setCustomers(result);
    });
  };

  const totalRevenue = customers.reduce(
    (sum, c) => sum + Number(c.totalSpent),
    0
  );

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Users className="w-4 h-4" />
            Total Customers
          </div>
          <div className="text-2xl font-bold mt-1">{metrics.totalCustomers}</div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <UserPlus className="w-4 h-4" />
            New This Month
          </div>
          <div className="text-2xl font-bold mt-1">{metrics.newThisMonth}</div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <TrendingUp className="w-4 h-4" />
            Total Revenue
          </div>
          <div className="text-2xl font-bold mt-1">
            ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Search + Table */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <span className="text-sm text-muted-foreground ml-auto">
            {customers.length} customer{customers.length !== 1 ? 's' : ''}
            {isPending && ' (loading...)'}
          </span>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Last Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {searchQuery ? 'No customers match your search' : 'No customers yet — they appear when orders come in via the website'}
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => {
                  const isExpanded = expandedId === customer.id;
                  const lastOrder = customer.orders[0]?.orderDate;
                  return (
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : customer.id)}
                    >
                      <TableCell className="w-8">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {customer.firstName} {customer.lastName}
                      </TableCell>
                      <TableCell className="text-sm">{customer.email}</TableCell>
                      <TableCell className="text-sm">{customer.phone || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{customer.orderCount}</Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        ${Number(customer.totalSpent).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {lastOrder
                          ? format(new Date(lastOrder), 'MMM d, yyyy')
                          : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Top Spenders */}
      {metrics.topSpenders.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Top Spenders</h3>
          <div className="space-y-3">
            {metrics.topSpenders.map((customer, i) => (
              <div key={customer.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground w-6">
                    #{i + 1}
                  </span>
                  <div>
                    <div className="text-sm font-medium">
                      {customer.firstName} {customer.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">{customer.email}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    ${Number(customer.totalSpent).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {customer.orderCount} order{customer.orderCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
