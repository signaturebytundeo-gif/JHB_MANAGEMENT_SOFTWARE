import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

type PackagingAlert = {
  id: string;
  name: string;
  type: string;
  currentQuantity: number;
  reorderPoint: number;
  leadTimeDays: number;
  level: 'CRITICAL' | 'WARNING';
};

type RawMaterialAlert = {
  id: string;
  name: string;
  supplier: string;
  lotNumber: string;
  expirationDate: Date;
  daysUntilExpiration: number;
  level: 'CRITICAL' | 'WARNING';
};

interface ReorderAlertPanelProps {
  packagingAlerts: PackagingAlert[];
  rawMaterialAlerts: RawMaterialAlert[];
}

const TYPE_LABELS: Record<string, string> = {
  BOTTLE: 'Bottle',
  CAP: 'Cap',
  LABEL: 'Label',
  BOX: 'Box',
  OTHER: 'Other',
};

export function ReorderAlertPanel({ packagingAlerts, rawMaterialAlerts }: ReorderAlertPanelProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Packaging Material Alerts */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">
          Packaging Alerts
          {packagingAlerts.length > 0 && (
            <span className="ml-2 text-sm font-normal text-destructive">
              ({packagingAlerts.length})
            </span>
          )}
        </h2>

        {packagingAlerts.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4">
            <span className="text-green-700 dark:text-green-300 text-sm font-medium">
              All packaging materials adequately stocked
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {packagingAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border p-4 ${
                  alert.level === 'CRITICAL'
                    ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                    : 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-sm">{alert.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {TYPE_LABELS[alert.type] ?? alert.type}
                    </p>
                  </div>
                  <Badge variant={alert.level === 'CRITICAL' ? 'destructive' : 'warning'}>
                    {alert.level === 'CRITICAL' ? 'Critical' : 'Reorder Soon'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">Current:</span>{' '}
                    <span
                      className={
                        alert.level === 'CRITICAL' ? 'text-destructive font-semibold' : ''
                      }
                    >
                      {alert.currentQuantity}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Reorder at:</span>{' '}
                    {alert.reorderPoint}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Lead time:</span>{' '}
                    {alert.leadTimeDays} days
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Raw Material Alerts */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">
          Raw Material Alerts
          {rawMaterialAlerts.length > 0 && (
            <span className="ml-2 text-sm font-normal text-destructive">
              ({rawMaterialAlerts.length})
            </span>
          )}
        </h2>

        {rawMaterialAlerts.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4">
            <span className="text-green-700 dark:text-green-300 text-sm font-medium">
              All raw materials within acceptable range
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {rawMaterialAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border p-4 ${
                  alert.level === 'CRITICAL'
                    ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                    : 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-sm">{alert.name}</p>
                    <p className="text-xs text-muted-foreground">{alert.supplier}</p>
                  </div>
                  <Badge variant={alert.level === 'CRITICAL' ? 'destructive' : 'warning'}>
                    {alert.level === 'CRITICAL' ? 'Expiring Soon' : 'Watch'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">Lot:</span>{' '}
                    <span className="font-mono">{alert.lotNumber}</span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Expires:</span>{' '}
                    {format(alert.expirationDate, 'MMM dd, yyyy')}
                  </div>
                  <div className="col-span-2">
                    <span
                      className={
                        alert.level === 'CRITICAL' ? 'text-destructive font-semibold' : ''
                      }
                    >
                      {alert.daysUntilExpiration <= 0
                        ? 'Expired'
                        : `${alert.daysUntilExpiration} days until expiration`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
