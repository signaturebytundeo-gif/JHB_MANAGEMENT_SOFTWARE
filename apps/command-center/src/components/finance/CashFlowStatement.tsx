'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CashFlowStatement as CashFlowStatementType } from '@/app/actions/financial-reports';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

type Props = {
  data: CashFlowStatementType;
};

export function CashFlowStatement({ data }: Props) {
  const netChangeColor = data.netChange >= 0 ? 'text-green-600' : 'text-red-600';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Cash Flow Statement — {data.period}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Operating Activities */}
        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
            Operating Activities
          </h3>

          {/* Inflows */}
          <div className="mb-3">
            <p className="text-sm font-medium mb-1 pl-2">Cash Inflows</p>
            <table className="w-full text-sm">
              <tbody>
                {data.operatingInflows.map((item) => (
                  <tr key={item.source} className="border-b last:border-0">
                    <td className="py-1 text-muted-foreground pl-6">{item.source}</td>
                    <td className="py-1 text-right text-green-700">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
                {data.operatingInflows.length === 0 && (
                  <tr>
                    <td className="py-1 text-muted-foreground pl-6 italic">No inflows recorded</td>
                    <td className="py-1 text-right">{formatCurrency(0)}</td>
                  </tr>
                )}
                <tr className="font-medium border-t">
                  <td className="py-1 pl-4">Total Inflows</td>
                  <td className="py-1 text-right text-green-700">{formatCurrency(data.totalInflows)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Outflows */}
          <div className="mb-3">
            <p className="text-sm font-medium mb-1 pl-2">Cash Outflows</p>
            <table className="w-full text-sm">
              <tbody>
                {data.operatingOutflows.map((item) => (
                  <tr key={item.category} className="border-b last:border-0">
                    <td className="py-1 text-muted-foreground pl-6 capitalize">
                      {item.category.replace(/_/g, ' ').toLowerCase()}
                    </td>
                    <td className="py-1 text-right text-red-600">({formatCurrency(item.amount)})</td>
                  </tr>
                ))}
                {data.operatingOutflows.length === 0 && (
                  <tr>
                    <td className="py-1 text-muted-foreground pl-6 italic">No outflows recorded</td>
                    <td className="py-1 text-right">{formatCurrency(0)}</td>
                  </tr>
                )}
                <tr className="font-medium border-t">
                  <td className="py-1 pl-4">Total Outflows</td>
                  <td className="py-1 text-right text-red-600">({formatCurrency(data.totalOutflows)})</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Net Operating */}
          <div className={`flex justify-between font-bold border-t-2 pt-2 ${data.netOperating >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            <span className="pl-2">Net Operating Cash Flow</span>
            <span>{formatCurrency(data.netOperating)}</span>
          </div>
        </div>

        {/* Investing Activities */}
        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
            Investing Activities
          </h3>
          <p className="text-sm text-muted-foreground pl-4 italic">No investing activities tracked</p>
          <div className="flex justify-between font-medium border-t mt-2 pt-2">
            <span className="pl-2 text-sm">Net Investing Cash Flow</span>
            <span className="text-sm">{formatCurrency(0)}</span>
          </div>
        </div>

        {/* Financing Activities */}
        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
            Financing Activities
          </h3>
          <p className="text-sm text-muted-foreground pl-4 italic">No financing activities tracked</p>
          <div className="flex justify-between font-medium border-t mt-2 pt-2">
            <span className="pl-2 text-sm">Net Financing Cash Flow</span>
            <span className="text-sm">{formatCurrency(0)}</span>
          </div>
        </div>

        {/* Net Change */}
        <div className={`flex justify-between items-center font-bold text-xl border-t-4 pt-3 ${netChangeColor}`}>
          <span>Net Change in Cash</span>
          <span>{formatCurrency(data.netChange)}</span>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground border-t pt-3">
          <div>
            <p className="font-medium text-foreground">Opening Balance</p>
            <p>{data.openingBalance !== null ? formatCurrency(data.openingBalance) : 'N/A — set opening balance in settings'}</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Closing Balance</p>
            <p>{data.closingBalance !== null ? formatCurrency(data.closingBalance) : 'N/A — set opening balance in settings'}</p>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
