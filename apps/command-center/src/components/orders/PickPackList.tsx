'use client';

import { format } from 'date-fns';
import type { PickPackList } from '@/app/actions/operator-orders';

interface PickPackListProps {
  data: PickPackList;
}

export function PickPackList({ data }: PickPackListProps) {
  function handlePrint() {
    window.print();
  }

  const totalUnits = data.items.reduce((sum, item) => sum + item.totalQuantity, 0);

  return (
    <>
      {/* Print-only styles injected via style tag */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #pick-pack-list, #pick-pack-list * {
            visibility: visible;
          }
          #pick-pack-list {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div id="pick-pack-list" className="border rounded-lg p-6 bg-white text-black">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Pick / Pack List</h2>
            <p className="text-sm text-gray-600 mt-1">
              Order: <span className="font-mono font-semibold">{data.orderNumber}</span>
            </p>
            <p className="text-sm text-gray-600">
              Location: {data.locationName}
            </p>
            <p className="text-sm text-gray-600">
              Date: {format(new Date(), 'MMMM d, yyyy')}
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="no-print px-4 py-2 bg-black text-white text-sm rounded hover:bg-gray-800 transition-colors"
          >
            Print
          </button>
        </div>

        {/* Items table */}
        {data.items.length === 0 ? (
          <p className="text-gray-500 text-sm">No inventory movements found for this order.</p>
        ) : (
          <div className="space-y-6">
            {data.items.map((item) => (
              <div key={item.sku} className="border rounded overflow-hidden">
                {/* Product header */}
                <div className="bg-gray-100 px-4 py-2 flex items-center justify-between">
                  <div>
                    <span className="font-semibold">{item.productName}</span>
                    <span className="ml-2 text-sm text-gray-500 font-mono">({item.sku})</span>
                  </div>
                  <div className="text-sm font-medium">
                    Total: <span className="font-bold">{item.totalQuantity} units</span>
                  </div>
                </div>

                {/* Batch rows */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Batch Code</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Qty to Pick</th>
                      <th className="text-center px-4 py-2 font-medium text-gray-600 no-print w-16">
                        Done
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.batches.map((batch, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="px-4 py-3 font-mono">{batch.batchCode}</td>
                        <td className="px-4 py-3 text-right font-semibold">{batch.quantity}</td>
                        <td className="px-4 py-3 text-center no-print">
                          <input
                            type="checkbox"
                            className="h-5 w-5 rounded border-gray-300"
                            aria-label={`Mark ${batch.batchCode} as picked`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            {/* Totals footer */}
            <div className="border-t pt-4 flex justify-between items-center font-semibold text-sm">
              <span>Total Units to Pick</span>
              <span className="text-lg">{totalUnits}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
