'use client';

import { useState } from 'react';
import { ShipmentForm } from '@/components/shipping/ShipmentForm';
import { ShipmentList } from '@/components/shipping/ShipmentList';
import { Button } from '@/components/ui/button';
import { Package, PlusCircle, History, Truck } from 'lucide-react';
import { format } from 'date-fns';
import type { StripeOrderData } from '@/app/actions/shipping';
import type { ShipmentStatus } from '@prisma/client';

type Tab = 'pending' | 'create' | 'history';

type LocationData = {
  id: string;
  name: string;
  type: string;
  address: string | null;
};

type ShipmentRow = {
  id: string;
  status: ShipmentStatus;
  recipientName: string;
  trackingNumber: string | null;
  labelData: string | null;
  shippingCost: number | null;
  serviceCode: string;
  createdAt: Date;
  createdBy: { name: string };
  shipFromLocation: { name: string } | null;
};

interface ShippingPageClientProps {
  stripeOrders: StripeOrderData[];
  locations: LocationData[];
  shipments: ShipmentRow[];
  shipmentsTotal: number;
  shipmentsPage: number;
  shipmentsTotalPages: number;
}

export function ShippingPageClient({
  stripeOrders,
  locations,
  shipments,
  shipmentsTotal,
  shipmentsPage,
  shipmentsTotalPages,
}: ShippingPageClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [selectedOrder, setSelectedOrder] = useState<StripeOrderData | null>(null);

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'pending', label: 'Pending Orders', icon: Package },
    { id: 'create', label: 'Create Label', icon: PlusCircle },
    { id: 'history', label: 'Shipment History', icon: History },
  ];

  const handleShipOrder = (order: StripeOrderData) => {
    setSelectedOrder(order);
    setActiveTab('create');
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex gap-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id !== 'create') setSelectedOrder(null);
                }}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors inline-flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-caribbean-green text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.id === 'pending' && stripeOrders.length > 0 && (
                  <span className="bg-caribbean-green text-white text-xs rounded-full px-2 py-0.5">
                    {stripeOrders.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Pending Orders Tab */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {stripeOrders.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No pending orders to ship</p>
              <p className="text-sm text-muted-foreground mt-1">
                Orders from jamaicahousebrand.com will appear here
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {stripeOrders.map((order) => (
                <div
                  key={order.paymentIntentId}
                  className="rounded-lg border bg-card p-4 hover:border-caribbean-green/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{order.customerName}</h3>
                        <span className="text-sm text-caribbean-gold font-medium">
                          ${order.amount.toFixed(2)}
                        </span>
                      </div>
                      {order.customerEmail && (
                        <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
                      )}
                      {order.shippingAddress && (
                        <p className="text-sm text-muted-foreground">
                          {order.shippingAddress.line1}
                          {order.shippingAddress.line2 && `, ${order.shippingAddress.line2}`}
                          {', '}
                          {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                          {order.shippingAddress.zip}
                        </p>
                      )}
                      {order.items && (
                        <p className="text-xs text-muted-foreground mt-1">{order.items}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleShipOrder(order)}
                      className="bg-caribbean-green hover:bg-caribbean-green/90 text-white shrink-0"
                      disabled={!order.shippingAddress}
                    >
                      <Truck className="w-4 h-4 mr-2" />
                      Create Label
                    </Button>
                  </div>
                  {!order.shippingAddress && (
                    <p className="text-xs text-red-400 mt-2">
                      No shipping address found — use manual entry instead
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Label Tab */}
      {activeTab === 'create' && (
        <div className="max-w-2xl">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">
              {selectedOrder ? 'Ship Order' : 'Manual Shipment'}
            </h2>
            <ShipmentForm
              locations={locations}
              prefillOrder={selectedOrder}
              onSuccess={() => {
                setSelectedOrder(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Shipment History Tab */}
      {activeTab === 'history' && (
        <ShipmentList
          initialShipments={shipments}
          initialTotal={shipmentsTotal}
          initialPage={shipmentsPage}
          initialTotalPages={shipmentsTotalPages}
        />
      )}
    </div>
  );
}
