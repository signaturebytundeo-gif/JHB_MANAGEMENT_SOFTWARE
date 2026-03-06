import Link from 'next/link';
import { verifyManagerOrAbove } from '@/lib/dal';
import { getInventoryValuation } from '@/app/actions/packaging';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronRight, Download } from 'lucide-react';

export default async function InventoryValuationPage() {
  await verifyManagerOrAbove();

  const valuation = await getInventoryValuation();
  const { rows, grandTotalValue, grandTotalUnits, totalProducts, totalLocations } = valuation;

  // Group rows by product
  const byProduct = rows.reduce<Record<string, typeof rows>>((acc, row) => {
    if (!acc[row.productId]) acc[row.productId] = [];
    acc[row.productId].push(row);
    return acc;
  }, {});

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  return (
    <div className="space-y-6">
      {/* Header with breadcrumb */}
      <div>
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          <Link href="/dashboard/inventory" className="hover:text-foreground transition-colors">
            Inventory
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">Valuation Report</span>
        </nav>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Inventory Valuation Report</h1>
            <p className="text-muted-foreground mt-2">
              Estimated inventory value based on FIFO stock levels and wholesale pricing.
            </p>
          </div>
          <Button
            variant="outline"
            disabled
            title="Export coming in Phase 7: Reporting & Analytics"
            className="shrink-0"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Est. Value</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(grandTotalValue)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Units</p>
          <p className="text-2xl font-bold mt-1">{grandTotalUnits.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Products w/ Stock</p>
          <p className="text-2xl font-bold mt-1">{totalProducts}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Locations w/ Stock</p>
          <p className="text-2xl font-bold mt-1">{totalLocations}</p>
        </div>
      </div>

      {/* Valuation Table — Desktop */}
      {rows.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            No inventory on hand. Stock will appear here once batches are released and allocated to
            locations.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Est. Unit Cost</TableHead>
                  <TableHead className="text-right">Est. Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.values(byProduct).map((productRows) => {
                  const firstRow = productRows[0];
                  const productSubtotal = productRows.reduce(
                    (sum, r) => sum + r.totalValue,
                    0
                  );
                  const productUnits = productRows.reduce((sum, r) => sum + r.quantity, 0);
                  return (
                    <>
                      {productRows.map((row, idx) => (
                        <TableRow key={row.locationId}>
                          {idx === 0 && (
                            <TableCell
                              rowSpan={productRows.length}
                              className="align-top border-r"
                            >
                              <div>
                                <p className="font-medium">{row.productName}</p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {row.productSku}
                                </p>
                              </div>
                            </TableCell>
                          )}
                          <TableCell>{row.locationName}</TableCell>
                          <TableCell className="text-right">{row.quantity}</TableCell>
                          <TableCell className="text-right">
                            {row.unitCost > 0 ? formatCurrency(row.unitCost) : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(row.totalValue)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Product subtotal */}
                      <TableRow className="bg-muted/40 font-medium">
                        <TableCell colSpan={2} className="text-right text-sm text-muted-foreground">
                          {firstRow.productName} subtotal
                        </TableCell>
                        <TableCell className="text-right">{productUnits}</TableCell>
                        <TableCell />
                        <TableCell className="text-right">
                          {formatCurrency(productSubtotal)}
                        </TableCell>
                      </TableRow>
                    </>
                  );
                })}
                {/* Grand total */}
                <TableRow className="bg-muted font-bold">
                  <TableCell colSpan={2}>Grand Total</TableCell>
                  <TableCell className="text-right">{grandTotalUnits}</TableCell>
                  <TableCell />
                  <TableCell className="text-right">{formatCurrency(grandTotalValue)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View — grouped by product */}
          <div className="md:hidden space-y-6">
            {Object.values(byProduct).map((productRows) => {
              const productSubtotal = productRows.reduce((sum, r) => sum + r.totalValue, 0);
              const productUnits = productRows.reduce((sum, r) => sum + r.quantity, 0);
              return (
                <div key={productRows[0].productId} className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{productRows[0].productName}</h3>
                      <p className="text-xs text-muted-foreground font-mono">
                        {productRows[0].productSku}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {formatCurrency(productSubtotal)}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {productRows.map((row) => (
                      <div
                        key={row.locationId}
                        className="flex items-center justify-between text-sm border-t pt-2"
                      >
                        <span className="text-muted-foreground">{row.locationName}</span>
                        <div className="text-right">
                          <p className="font-medium">{row.quantity} units</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(row.totalValue)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center border-t pt-2 font-medium text-sm">
                    <span>Subtotal</span>
                    <span>
                      {productUnits} units / {formatCurrency(productSubtotal)}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Grand total card */}
            <div className="rounded-lg border bg-muted p-4 flex justify-between items-center font-bold">
              <span>Grand Total</span>
              <span>
                {grandTotalUnits} units / {formatCurrency(grandTotalValue)}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Disclaimer */}
      <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Values shown are estimates based on wholesale pricing with a 40%
          cost ratio applied as a COGS approximation. Detailed cost of goods sold (COGS) tracking
          including materials, labor, and overhead will be available in Phase 6: Financial
          Management.
        </p>
      </div>
    </div>
  );
}
