import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getBatchCOGS,
  getGrossMarginByProduct,
} from '@/app/actions/financial-reports';
import { COGSTable } from '@/components/finance/COGSTable';
import { GrossMarginTable } from '@/components/finance/GrossMarginTable';

export default async function COGSPage() {
  const [batches, products] = await Promise.all([getBatchCOGS(), getGrossMarginByProduct()]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  // Summary calculations
  const avgCogsPerUnit =
    batches.length > 0
      ? batches.reduce((sum, b) => sum + b.cogsPerUnit, 0) / batches.length
      : 0;

  const overallGrossMargin =
    products.length > 0
      ? products.reduce((sum, p) => sum + p.grossMarginPct, 0) / products.length
      : 0;

  const incompleteCount = batches.filter((b) => b.costDataIncomplete).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">COGS &amp; Gross Margin</h1>
        <p className="text-gray-400 text-sm mt-1">
          Cost of goods sold per batch and gross margin analysis by product
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-caribbean-black border-caribbean-gold/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 font-normal">Avg COGS/Unit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{formatCurrency(avgCogsPerUnit)}</p>
            <p className="text-xs text-gray-500 mt-1">Across {batches.length} batches</p>
          </CardContent>
        </Card>

        <Card className="bg-caribbean-black border-caribbean-gold/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 font-normal">Avg Gross Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                overallGrossMargin >= 50
                  ? 'text-green-400'
                  : overallGrossMargin >= 30
                  ? 'text-yellow-400'
                  : 'text-red-400'
              }`}
            >
              {overallGrossMargin.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Across {products.length} products</p>
          </CardContent>
        </Card>

        <Card className="bg-caribbean-black border-caribbean-gold/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 font-normal">Incomplete Cost Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${incompleteCount > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
              {incompleteCount}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {incompleteCount > 0 ? 'Batches missing cost data' : 'All cost data complete'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* COGS by Batch */}
      <Card className="bg-caribbean-black border-caribbean-gold/20">
        <CardHeader>
          <CardTitle className="text-white text-lg">COGS by Batch</CardTitle>
          <p className="text-sm text-gray-400">
            Materials + labor + overhead cost breakdown per production batch
          </p>
        </CardHeader>
        <CardContent>
          <COGSTable batches={batches} />
        </CardContent>
      </Card>

      {/* Gross Margin by Product */}
      <Card className="bg-caribbean-black border-caribbean-gold/20">
        <CardHeader>
          <CardTitle className="text-white text-lg">Gross Margin by Product</CardTitle>
          <p className="text-sm text-gray-400">
            Average COGS vs sale price — green &gt;50%, yellow 30-50%, red &lt;30%
          </p>
        </CardHeader>
        <CardContent>
          <GrossMarginTable products={products} />
        </CardContent>
      </Card>
    </div>
  );
}
