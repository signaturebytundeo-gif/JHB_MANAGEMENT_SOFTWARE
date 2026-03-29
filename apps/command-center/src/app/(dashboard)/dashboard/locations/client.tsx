'use client';

import { useState, useActionState, useEffect, useRef } from 'react';
import { LocationType } from '@prisma/client';
import { createLocation, deleteLocation, reactivateLocation } from '@/app/actions/locations';
import {
  MapPin,
  Plus,
  Trash2,
  X,
  RotateCcw,
  Building2,
  Warehouse,
  Store,
  ShoppingBag,
  CalendarDays,
  Factory,
} from 'lucide-react';

type Location = {
  id: string;
  name: string;
  type: LocationType;
  address: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
};

const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  PRODUCTION: 'Production',
  RESTAURANT: 'Restaurant',
  WAREHOUSE: 'Warehouse',
  FULFILLMENT: 'Fulfillment',
  MARKET: 'Farmers Market',
  EVENT: 'Pop-Up / Event',
};

const LOCATION_TYPE_ICONS: Record<LocationType, React.ComponentType<{ className?: string }>> = {
  PRODUCTION: Factory,
  RESTAURANT: Store,
  WAREHOUSE: Warehouse,
  FULFILLMENT: ShoppingBag,
  MARKET: Building2,
  EVENT: CalendarDays,
};

export function LocationsClient({ locations }: { locations: Location[] }) {
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  const activeLocations = locations.filter((l) => l.isActive);
  const inactiveLocations = locations.filter((l) => !l.isActive);

  const handleReactivate = async (locationId: string) => {
    setReactivatingId(locationId);
    await reactivateLocation(locationId);
    setReactivatingId(null);
  };

  return (
    <>
      {/* Add button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-caribbean-gold text-black font-medium text-sm hover:bg-caribbean-gold/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add New Location
        </button>
      </div>

      {/* Active locations */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          Active Locations
          <span className="text-sm font-normal text-muted-foreground ml-2">
            ({activeLocations.length})
          </span>
        </h2>
        {activeLocations.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
            No active locations. Add one to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeLocations.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                onDelete={() => setDeleteTarget(location)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Inactive locations */}
      {inactiveLocations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 text-muted-foreground">
            Inactive Locations
            <span className="text-sm font-normal ml-2">
              ({inactiveLocations.length})
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveLocations.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                onReactivate={() => handleReactivate(location.id)}
                isReactivating={reactivatingId === location.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add location modal */}
      {showForm && (
        <AddLocationModal onClose={() => setShowForm(false)} />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          location={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}

// ============================================================================
// Location Card
// ============================================================================

function LocationCard({
  location,
  onDelete,
  onReactivate,
  isReactivating,
}: {
  location: Location;
  onDelete?: () => void;
  onReactivate?: () => void;
  isReactivating?: boolean;
}) {
  const Icon = LOCATION_TYPE_ICONS[location.type];

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 transition-colors ${
        location.isActive
          ? 'bg-card border-border hover:border-caribbean-gold/40'
          : 'bg-card/50 border-border/50 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-caribbean-gold flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">{location.name}</p>
            <p className="text-xs text-caribbean-gold">
              {LOCATION_TYPE_LABELS[location.type]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {location.isActive ? (
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="Active" />
          ) : (
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" title="Inactive" />
          )}
        </div>
      </div>

      {location.address && (
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
          {location.address}
        </p>
      )}

      {location.description && (
        <p className="text-xs text-muted-foreground">{location.description}</p>
      )}

      <div className="flex justify-end pt-1">
        {location.isActive && onDelete ? (
          <button
            onClick={onDelete}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Deactivate
          </button>
        ) : onReactivate ? (
          <button
            onClick={onReactivate}
            disabled={isReactivating}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border border-caribbean-gold/50 text-caribbean-gold hover:bg-caribbean-gold/10 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-3 h-3 ${isReactivating ? 'animate-spin' : ''}`} />
            Reactivate
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================================
// Add Location Modal
// ============================================================================

function AddLocationModal({ onClose }: { onClose: () => void }) {
  const [state, formAction, isPending] = useActionState(createLocation, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      onClose();
    }
  }, [state.success, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg w-full max-w-md p-6 space-y-5 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add New Location</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form ref={formRef} action={formAction} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Location Name <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g., Miramar Restaurant"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caribbean-gold/50"
            />
            {state.errors?.name && (
              <p className="text-xs text-red-400 mt-1">{state.errors.name[0]}</p>
            )}
          </div>

          {/* Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium mb-1">
              Location Type <span className="text-red-400">*</span>
            </label>
            <select
              id="type"
              name="type"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caribbean-gold/50"
            >
              <option value="">Select type...</option>
              {Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {state.errors?.type && (
              <p className="text-xs text-red-400 mt-1">{state.errors.type[0]}</p>
            )}
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium mb-1">
              Address
            </label>
            <input
              id="address"
              name="address"
              type="text"
              placeholder="e.g., 123 Main St, Miami, FL"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caribbean-gold/50"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">
              Notes / Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              placeholder="Optional notes about this location"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caribbean-gold/50 resize-none"
            />
          </div>

          {/* Active toggle */}
          <input type="hidden" name="isActive" value="true" />

          {/* Error message */}
          {state.message && !state.success && (
            <p className="text-sm text-red-400">{state.message}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm rounded-md bg-caribbean-gold text-black font-medium hover:bg-caribbean-gold/90 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Creating...' : 'Create Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Delete Confirmation Modal
// ============================================================================

function DeleteConfirmModal({
  location,
  onClose,
}: {
  location: Location;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(deleteLocation, {});

  useEffect(() => {
    if (state.success) {
      onClose();
    }
  }, [state.success, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg w-full max-w-sm p-6 space-y-4 z-10">
        <h2 className="text-lg font-semibold">Deactivate Location</h2>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to deactivate <strong className="text-foreground">{location.name}</strong>?
          It will no longer appear in transfer dropdowns but historical records will be preserved.
        </p>

        {state.message && !state.success && (
          <p className="text-sm text-red-400">{state.message}</p>
        )}

        <form action={formAction}>
          <input type="hidden" name="locationId" value={location.id} />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm rounded-md border border-red-500 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Deactivating...' : 'Yes, Deactivate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
