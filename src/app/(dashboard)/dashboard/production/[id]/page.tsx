import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ChevronLeft, Info } from 'lucide-react';
import { verifySession } from '@/lib/dal';
import { getBatchById } from '@/app/actions/production';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BatchStatusBadge } from '@/components/production/BatchStatusBadge';
import { QCTestingForm } from '@/components/production/QCTestingForm';
import { StatusTransitionButton } from '@/components/production/StatusTransitionButton';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BatchDetailPage({ params }: PageProps) {
  await verifySession();
  const { id } = await params;

  const batch = await getBatchById(id);

  if (!batch) {
    notFound();
  }

  const showQCTesting = batch.status === 'QC_REVIEW' || batch.status === 'HOLD';
  const showStatusTransition =
    batch.status !== 'RELEASED' && batch.status !== 'HOLD';

  // Determine next status for transition
  let nextStatus: string | null = null;
  let transitionLabel: string | null = null;
  if (batch.status === 'PLANNED') {
    nextStatus = 'IN_PROGRESS';
    transitionLabel = 'Start Production';
  } else if (batch.status === 'IN_PROGRESS') {
    nextStatus = 'QC_REVIEW';
    transitionLabel = 'Send to QC Review';
  } else if (batch.status === 'HOLD') {
    nextStatus = 'QC_REVIEW';
    transitionLabel = 'Re-submit for QC Review';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/dashboard/production"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Production
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">{batch.batchCode}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Created by {batch.createdBy.name} on{' '}
              {format(new Date(batch.productionDate), 'MMM d, yyyy')}
            </p>
          </div>
          <BatchStatusBadge status={batch.status} />
        </div>
      </div>

      {/* Batch Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Product</div>
              <div className="mt-1">
                {batch.product.name} • {batch.product.sku}
              </div>
              <div className="text-sm text-muted-foreground">{batch.product.size}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Production Date</div>
              <div className="mt-1">{format(new Date(batch.productionDate), 'MMMM d, yyyy')}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Production Source</div>
              <div className="mt-1">
                {batch.productionSource === 'IN_HOUSE' ? (
                  'In-House'
                ) : (
                  <>
                    Co-Packer: {batch.coPackerPartner?.name || 'Unknown'}
                    {batch.coPackerLotNumber && (
                      <div className="text-sm text-muted-foreground">
                        Lot: {batch.coPackerLotNumber}
                      </div>
                    )}
                  </>
                )}
              </div>
              {batch.coPackerReceivingDate && (
                <div className="text-sm text-muted-foreground mt-1">
                  Received: {format(new Date(batch.coPackerReceivingDate), 'MMM d, yyyy')}
                </div>
              )}
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Total Units</div>
              <div className="mt-1 text-2xl font-bold">{batch.totalUnits.toLocaleString()}</div>
            </div>
          </div>

          {batch.notes && (
            <div className="pt-3 border-t">
              <div className="text-sm font-medium text-muted-foreground">Notes</div>
              <div className="mt-1 text-sm">{batch.notes}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Transition Section */}
      {showStatusTransition && nextStatus && transitionLabel && (
        <Card>
          <CardHeader>
            <CardTitle>Status Transition</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusTransitionButton
              batchId={batch.id}
              nextStatus={nextStatus}
              label={transitionLabel}
              variant={batch.status === 'HOLD' ? 'destructive' : 'default'}
            />
          </CardContent>
        </Card>
      )}

      {/* QC Testing Section */}
      {showQCTesting && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Quality Control Testing</h2>
          <QCTestingForm batchId={batch.id} batchStatus={batch.status} />

          {/* QC Test History */}
          {batch.qcTests && batch.qcTests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>QC Test History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Test Type</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>pH Level</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Tested By</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...batch.qcTests]
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                        )
                        .map((test) => (
                          <TableRow key={test.id}>
                            <TableCell className="font-medium">
                              {test.testType === 'pH' ? 'pH Test' : 'Visual/Taste Test'}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  test.passed
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                }`}
                              >
                                {test.passed ? 'Pass' : 'Fail'}
                              </span>
                            </TableCell>
                            <TableCell>
                              {test.phLevel !== null ? test.phLevel.toString() : '—'}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {test.notes || '—'}
                            </TableCell>
                            <TableCell>{test.testedBy.name}</TableCell>
                            <TableCell>
                              {format(new Date(test.createdAt), 'MMM d, yyyy h:mm a')}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Location Allocations Section */}
      {batch.allocations && batch.allocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Location Allocations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batch.allocations.map((allocation) => (
                    <TableRow key={allocation.id}>
                      <TableCell>{allocation.location.name}</TableCell>
                      <TableCell className="text-right">
                        {allocation.quantity.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      {batch.allocations
                        .reduce((sum, a) => sum + a.quantity, 0)
                        .toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Immutability Notice */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          <strong>Regulatory Compliance</strong>
        </div>
        <p className="mt-1">
          Batch records are retained permanently for regulatory compliance and cannot be deleted.
        </p>
      </div>
    </div>
  );
}
