'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Edit, ShoppingCart, DollarSign, TrendingUp, Mail, Phone, Building2, MapPin, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CustomerForm } from './CustomerForm';
import type { CustomerType, OperatorOrderStatus, OperatorOrderType } from '@prisma/client';

interface LineItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product: { id: string; name: string; sku: string };
}

interface Order {
  id: string;
  orderNumber: string;
  status: OperatorOrderStatus;
  orderType: OperatorOrderType;
  totalAmount: number;
  orderDate: Date;
  channel: { id: string; name: string };
  lineItems: LineItem[];
}

interface CustomerDetailProps {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    customerType: CustomerType;
    company: string | null;
    paymentTerms: string | null;
    creditLimit: number | null;
    billingAddress: string | null;
    shippingAddress: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    notes: string | null;
    totalSpent: number;
    orderCount: number;
    createdAt: Date;
    operatorOrders: Order[];
  };
}

const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  RETAIL: 'Retail',
  WHOLESALE: 'Wholesale',
  DISTRIBUTOR: 'Distributor',
  RESTAURANT: 'Restaurant',
  SUBSCRIPTION: 'Subscription',
  EVENT: 'Event',
};

const CUSTOMER_TYPE_COLORS: Record<CustomerType, string> = {
  RETAIL: 'bg-blue-100 text-blue-800',
  WHOLESALE: 'bg-purple-100 text-purple-800',
  DISTRIBUTOR: 'bg-orange-100 text-orange-800',
  RESTAURANT: 'bg-red-100 text-red-800',
  SUBSCRIPTION: 'bg-green-100 text-green-800',
  EVENT: 'bg-yellow-100 text-yellow-800',
};

const ORDER_STATUS_LABELS: Record<OperatorOrderStatus, string> = {
  DRAFT: 'Draft',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS: Record<OperatorOrderStatus, string> = {
  DRAFT: 'secondary',
  CONFIRMED: 'secondary',
  PROCESSING: 'secondary',
  SHIPPED: 'secondary',
  DELIVERED: 'secondary',
  COMPLETED: 'secondary',
  CANCELLED: 'secondary',
};

function formatCurrency(amount: number) {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPaymentTerms(terms: string | null) {
  if (!terms) return '—';
  const map: Record<string, string> = {
    net_30: 'Net 30',
    net_15: 'Net 15',
    cash: 'Cash',
  };
  return map[terms] ?? terms;
}

export function CustomerDetail({ customer }: CustomerDetailProps) {
  const [showEditModal, setShowEditModal] = useState(false);

  const lifetimeValue = customer.operatorOrders.reduce(
    (sum, o) => sum + o.totalAmount,
    0
  );
  const orderCount = customer.operatorOrders.length;
  const avgOrderValue = orderCount > 0 ? lifetimeValue / orderCount : 0;

  const addressParts = [
    customer.billingAddress || customer.shippingAddress,
    customer.city,
    customer.state,
    customer.zip,
  ].filter(Boolean);
  const fullAddress = addressParts.join(', ');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-caribbean-green/20 flex items-center justify-center text-2xl font-bold text-caribbean-green">
            {customer.firstName[0]}{customer.lastName[0]}
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {customer.firstName} {customer.lastName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CUSTOMER_TYPE_COLORS[customer.customerType]}`}>
                {CUSTOMER_TYPE_LABELS[customer.customerType]}
              </span>
              {customer.company && (
                <span className="text-sm text-muted-foreground">{customer.company}</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowEditModal(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>
      </div>

      {/* Lifetime Value Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            Lifetime Value
          </div>
          <div className="text-2xl font-bold">{formatCurrency(lifetimeValue)}</div>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <ShoppingCart className="w-4 h-4" />
            Total Orders
          </div>
          <div className="text-2xl font-bold">{orderCount}</div>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            Avg Order Value
          </div>
          <div className="text-2xl font-bold">{formatCurrency(avgOrderValue)}</div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Profile</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">Email</div>
              <div className="text-sm">{customer.email}</div>
            </div>
          </div>
          {customer.phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Phone</div>
                <div className="text-sm">{customer.phone}</div>
              </div>
            </div>
          )}
          {customer.company && (
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Company</div>
                <div className="text-sm">{customer.company}</div>
              </div>
            </div>
          )}
          {fullAddress && (
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Address</div>
                <div className="text-sm">{fullAddress}</div>
              </div>
            </div>
          )}
          <div>
            <div className="text-xs text-muted-foreground">Payment Terms</div>
            <div className="text-sm font-medium">{formatPaymentTerms(customer.paymentTerms)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Credit Limit</div>
            <div className="text-sm font-medium">
              {customer.creditLimit != null ? formatCurrency(customer.creditLimit) : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Customer Since</div>
            <div className="text-sm">{format(new Date(customer.createdAt), 'MMM d, yyyy')}</div>
          </div>
        </div>
        {customer.notes && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground mb-1">Notes</div>
                <div className="text-sm text-muted-foreground">{customer.notes}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Purchase History */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Purchase History</h3>
        {customer.operatorOrders.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            No operator orders yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-2 font-medium text-muted-foreground">Date</th>
                  <th className="text-left pb-2 font-medium text-muted-foreground">Order #</th>
                  <th className="text-left pb-2 font-medium text-muted-foreground">Channel</th>
                  <th className="text-left pb-2 font-medium text-muted-foreground">Type</th>
                  <th className="text-left pb-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-right pb-2 font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {customer.operatorOrders.map((order) => (
                  <tr key={order.id} className="border-b last:border-0">
                    <td className="py-3 text-muted-foreground">
                      {format(new Date(order.orderDate), 'MMM d, yyyy')}
                    </td>
                    <td className="py-3 font-medium">{order.orderNumber}</td>
                    <td className="py-3 text-muted-foreground">{order.channel.name}</td>
                    <td className="py-3">
                      <span className="capitalize text-xs">{order.orderType.toLowerCase().replace('_', ' ')}</span>
                    </td>
                    <td className="py-3">
                      <Badge variant={STATUS_COLORS[order.status] as 'secondary'}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </td>
                    <td className="py-3 text-right font-medium">{formatCurrency(order.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Edit Customer</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  &times;
                </button>
              </div>
              <CustomerForm
                customer={customer}
                onClose={() => setShowEditModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
