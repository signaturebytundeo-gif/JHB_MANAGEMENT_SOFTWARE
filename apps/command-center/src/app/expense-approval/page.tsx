'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

type ApprovalResult = {
  success: boolean;
  message: string;
  expense?: {
    id: string;
    description: string;
    amount: number;
    createdBy: string;
    status: string;
  };
  error?: string;
};

export default function ExpenseApprovalPage() {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<ApprovalResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const processApproval = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setResult({
          success: false,
          message: 'No approval token provided',
          error: 'Missing token parameter'
        });
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/approve-expense?token=${token}`);
        const data = await response.json();

        setResult(data);
      } catch (error) {
        setResult({
          success: false,
          message: 'Failed to process approval',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        setLoading(false);
      }
    };

    processApproval();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-caribbean-green mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Processing approval...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
        <div className="text-center">
          {result?.success ? (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {result.expense?.status === 'approved' ? 'Expense Approved!' : 'Approval Recorded'}
              </h1>
              <p className="text-gray-600 mb-6">{result.message}</p>

              {result.expense && (
                <div className="bg-gray-50 p-4 rounded-lg text-left mb-6">
                  <h3 className="font-semibold mb-2">Expense Details:</h3>
                  <p><strong>Description:</strong> {result.expense.description}</p>
                  <p><strong>Amount:</strong> ${result.expense.amount.toFixed(2)}</p>
                  <p><strong>Submitted by:</strong> {result.expense.createdBy}</p>
                  <p><strong>Status:</strong>
                    <span className={`ml-1 px-2 py-1 rounded text-xs ${
                      result.expense.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {result.expense.status.replace('_', ' ')}
                    </span>
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Approval Failed</h1>
              <p className="text-gray-600 mb-4">{result?.message || 'An error occurred'}</p>

              {result?.error && (
                <div className="bg-red-50 p-3 rounded-lg text-left">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                    <p className="text-sm text-red-800">{result.error}</p>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mt-6">
            <p className="text-sm text-gray-500">
              You can now close this window.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}