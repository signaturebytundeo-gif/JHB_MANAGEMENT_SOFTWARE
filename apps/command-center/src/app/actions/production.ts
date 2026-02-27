'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { verifyManagerOrAbove } from '@/lib/dal';
import {
  createBatchSchema,
  type CreateBatchFormState,
  qcTestSchema,
  type QCTestFormState,
  updateBatchStatusSchema,
  deleteBatchSchema,
  type DeleteBatchFormState,
  updateBatchSchema,
  type UpdateBatchFormState,
} from '@/lib/validators/production';
import { generateBatchCode } from '@/lib/utils/batch-code';
import { ProductionSource, BatchStatus, TransactionType, LocationType } from '@prisma/client';

/** Find or create the "Main Warehouse / Storage" location for batch completion inventory */
async function getOrCreateMainWarehouse(tx: any) {
  let warehouse = await tx.location.findFirst({
    where: { name: 'Main Warehouse / Storage' },
  });

  if (!warehouse) {
    warehouse = await tx.location.create({
      data: {
        name: 'Main Warehouse / Storage',
        type: LocationType.WAREHOUSE,
        description: 'Primary storage for released production batches',
        isActive: true,
      },
    });
  }

  return warehouse;
}

/** Create BATCH_COMPLETION inventory transaction when batch is released */
async function createBatchCompletionTransaction(
  tx: any,
  batch: { id: string; productId: string; batchCode: string; totalUnits: number },
  userId: string
) {
  const warehouse = await getOrCreateMainWarehouse(tx);

  await tx.inventoryTransaction.create({
    data: {
      productId: batch.productId,
      locationId: warehouse.id,
      type: TransactionType.BATCH_COMPLETION,
      quantityChange: batch.totalUnits,
      referenceId: batch.id,
      notes: `Batch ${batch.batchCode} released`,
      createdById: userId,
    },
  });
}

export async function createBatch(
  prevState: CreateBatchFormState,
  formData: FormData
): Promise<CreateBatchFormState> {
  let batchId: string;

  try {
    // Verify user has manager or admin role
    const session = await verifyManagerOrAbove();

    // Extract form data
    const productId = formData.get('productId') as string;
    const productionDate = formData.get('productionDate') as string;
    const productionSource = formData.get('productionSource') as string;
    const totalUnits = formData.get('totalUnits') as string;
    const notes = formData.get('notes') as string;
    const coPackerPartnerId = formData.get('coPackerPartnerId') as string;
    const coPackerLotNumber = formData.get('coPackerLotNumber') as string;
    const coPackerReceivingDate = formData.get('coPackerReceivingDate') as string;

    // Extract allocations from FormData
    const allocations: { locationId: string; quantity: number }[] = [];
    let index = 0;
    while (formData.has(`allocation_locationId_${index}`)) {
      const locationId = formData.get(`allocation_locationId_${index}`) as string;
      const quantity = formData.get(`allocation_quantity_${index}`) as string;
      if (locationId && quantity) {
        allocations.push({ locationId, quantity: parseInt(quantity, 10) });
      }
      index++;
    }

    // Validate input
    const validatedFields = createBatchSchema.safeParse({
      productId,
      productionDate,
      productionSource,
      totalUnits,
      notes: notes || undefined,
      coPackerPartnerId: coPackerPartnerId || undefined,
      coPackerLotNumber: coPackerLotNumber || undefined,
      coPackerReceivingDate: coPackerReceivingDate || undefined,
      allocations: allocations.length > 0 ? allocations : undefined,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const data = validatedFields.data;

    // Generate batch code
    const batchCode = await generateBatchCode(data.productionDate);

    // Create batch and allocations in transaction
    const newBatch = await db.$transaction(async (tx) => {
      // Create batch
      const batch = await tx.batch.create({
        data: {
          productId: data.productId,
          batchCode,
          productionDate: data.productionDate,
          productionSource: data.productionSource,
          totalUnits: data.totalUnits,
          notes: data.notes,
          coPackerPartnerId: data.coPackerPartnerId,
          coPackerLotNumber: data.coPackerLotNumber,
          coPackerReceivingDate: data.coPackerReceivingDate,
          status: BatchStatus.PLANNED,
          createdById: session.userId,
        },
      });

      // Create allocations if provided
      if (data.allocations && data.allocations.length > 0) {
        await tx.batchAllocation.createMany({
          data: data.allocations.map((allocation) => ({
            batchId: batch.id,
            locationId: allocation.locationId,
            quantity: allocation.quantity,
          })),
        });
      }

      return batch;
    });

    batchId = newBatch.id;
  } catch (error) {
    console.error('Error creating batch:', error);
    return {
      message: 'Failed to create batch',
    };
  }

  // Redirect outside try/catch — redirect() throws a special error
  // that must not be caught
  redirect(`/dashboard/production/${batchId}`);
}

export async function submitQCTest(
  prevState: QCTestFormState,
  formData: FormData
): Promise<QCTestFormState> {
  try {
    // Verify user has manager or admin role
    const session = await verifyManagerOrAbove();

    // Validate input
    const validatedFields = qcTestSchema.safeParse({
      batchId: formData.get('batchId'),
      testType: formData.get('testType'),
      phLevel: formData.get('phLevel'),
      passed: formData.get('passed'),
      notes: formData.get('notes'),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const data = validatedFields.data;

    // Auto-fail if pH >= 4.6 (food safety)
    let passed = data.passed;
    if (data.testType === 'pH' && data.phLevel !== undefined && data.phLevel >= 4.6) {
      passed = false;
    }

    // Create QC test and update batch status
    await db.$transaction(async (tx) => {
      // Create QC test
      await tx.qCTest.create({
        data: {
          batchId: data.batchId,
          testType: data.testType,
          phLevel: data.phLevel,
          passed,
          notes: data.notes,
          testedById: session.userId,
        },
      });

      // Get all QC tests for this batch
      const allTests = await tx.qCTest.findMany({
        where: { batchId: data.batchId },
      });

      // Determine new batch status
      let newStatus: BatchStatus;
      if (!passed) {
        // Failed test = HOLD
        newStatus = BatchStatus.HOLD;
      } else {
        // Check if all required tests pass
        const hasPassingPh = allTests.some((t) => t.testType === 'pH' && t.passed);
        const hasPassingVisualTaste = allTests.some(
          (t) => t.testType === 'visual_taste' && t.passed
        );

        if (hasPassingPh && hasPassingVisualTaste) {
          newStatus = BatchStatus.RELEASED;
        } else {
          newStatus = BatchStatus.QC_REVIEW;
        }
      }

      // Update batch status
      await tx.batch.update({
        where: { id: data.batchId },
        data: { status: newStatus },
      });

      // Auto-create inventory transaction when batch is RELEASED
      if (newStatus === BatchStatus.RELEASED) {
        const batch = await tx.batch.findUnique({
          where: { id: data.batchId },
          select: { id: true, productId: true, batchCode: true, totalUnits: true },
        });
        if (batch) {
          await createBatchCompletionTransaction(tx, batch, session.userId);
        }
      }
    });

    revalidatePath('/dashboard/production');
    revalidatePath('/dashboard/inventory');

    return {
      success: true,
      message: 'QC test recorded',
    };
  } catch (error) {
    console.error('Error submitting QC test:', error);
    return {
      message: 'Failed to submit QC test',
    };
  }
}

export async function updateBatchStatus(
  prevState: any,
  formData: FormData
): Promise<{ message?: string; success?: boolean }> {
  try {
    // Verify user has manager or admin role
    const session = await verifyManagerOrAbove();

    // Validate input
    const validatedFields = updateBatchStatusSchema.safeParse({
      batchId: formData.get('batchId'),
      status: formData.get('status'),
    });

    if (!validatedFields.success) {
      return {
        message: 'Invalid input',
      };
    }

    const { batchId, status } = validatedFields.data;

    // Get current batch
    const batch = await db.batch.findUnique({
      where: { id: batchId },
      select: { status: true, productId: true, batchCode: true, totalUnits: true },
    });

    if (!batch) {
      return {
        message: 'Batch not found',
      };
    }

    // Enforce valid state transitions
    const validTransitions: Record<BatchStatus, BatchStatus[]> = {
      PLANNED: [BatchStatus.IN_PROGRESS],
      IN_PROGRESS: [BatchStatus.QC_REVIEW],
      QC_REVIEW: [BatchStatus.RELEASED, BatchStatus.HOLD],
      RELEASED: [],
      HOLD: [BatchStatus.QC_REVIEW],
    };

    if (!validTransitions[batch.status].includes(status)) {
      return {
        message: `Cannot transition from ${batch.status} to ${status}`,
      };
    }

    // Update batch status and auto-create inventory if RELEASED
    await db.$transaction(async (tx) => {
      await tx.batch.update({
        where: { id: batchId },
        data: { status },
      });

      if (status === BatchStatus.RELEASED && batch) {
        await createBatchCompletionTransaction(
          tx,
          { id: batchId, productId: batch.productId, batchCode: batch.batchCode, totalUnits: batch.totalUnits },
          session.userId
        );
      }
    });

    revalidatePath('/dashboard/production');
    revalidatePath('/dashboard/inventory');

    return {
      success: true,
      message: 'Batch status updated',
    };
  } catch (error) {
    console.error('Error updating batch status:', error);
    return {
      message: 'Failed to update batch status',
    };
  }
}

export async function getBatches(filters?: {
  status?: string;
  productId?: string;
  source?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  try {
    // Build where clause
    const where: any = { isActive: true };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.productId) {
      where.productId = filters.productId;
    }

    if (filters?.source) {
      where.productionSource = filters.source;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.productionDate = {};
      if (filters.dateFrom) {
        where.productionDate.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.productionDate.lte = filters.dateTo;
      }
    }

    // Fetch batches
    const batches = await db.batch.findMany({
      where,
      include: {
        product: true,
        coPackerPartner: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        qcTests: true,
        allocations: {
          include: {
            location: true,
          },
        },
      },
      orderBy: {
        productionDate: 'desc',
      },
    });

    return batches;
  } catch (error) {
    console.error('Error fetching batches:', error);
    return [];
  }
}

export async function getBatchById(id: string) {
  try {
    const batch = await db.batch.findUnique({
      where: { id, isActive: true },
      include: {
        product: true,
        coPackerPartner: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        qcTests: {
          include: {
            testedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        allocations: {
          include: {
            location: true,
          },
        },
        materials: {
          include: {
            rawMaterial: true,
          },
        },
      },
    });

    return batch;
  } catch (error) {
    console.error('Error fetching batch:', error);
    return null;
  }
}

export async function getProductionMetrics(month?: Date) {
  try {
    // Default to current month
    const targetMonth = month || new Date();
    const startOfMonth = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth(),
      1
    );
    const endOfMonth = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    // Count units from RELEASED batches in the month
    const batches = await db.batch.findMany({
      where: {
        status: BatchStatus.RELEASED,
        productionDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        isActive: true,
      },
      select: {
        totalUnits: true,
      },
    });

    const totalUnits = batches.reduce((sum, batch) => sum + batch.totalUnits, 0);
    const target = 15000;
    const utilizationPercent = (totalUnits / target) * 100;

    return {
      totalUnits,
      target,
      utilizationPercent: Math.round(utilizationPercent * 10) / 10, // Round to 1 decimal
      batchCount: batches.length,
    };
  } catch (error) {
    console.error('Error fetching production metrics:', error);
    return {
      totalUnits: 0,
      target: 15000,
      utilizationPercent: 0,
      batchCount: 0,
    };
  }
}

export async function deleteBatch(
  prevState: DeleteBatchFormState,
  formData: FormData
): Promise<DeleteBatchFormState> {
  try {
    await verifyManagerOrAbove();

    const validatedFields = deleteBatchSchema.safeParse({
      batchId: formData.get('batchId'),
      reason: formData.get('reason'),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { batchId, reason } = validatedFields.data;

    const batch = await db.batch.findUnique({
      where: { id: batchId, isActive: true },
      select: { status: true },
    });

    if (!batch) {
      return { message: 'Batch not found' };
    }

    if (batch.status !== 'PLANNED' && batch.status !== 'IN_PROGRESS') {
      return { message: 'Only PLANNED or IN_PROGRESS batches can be deleted' };
    }

    await db.batch.update({
      where: { id: batchId },
      data: {
        isActive: false,
        deletedAt: new Date(),
        deletedReason: reason,
      },
    });

    revalidatePath('/dashboard/production');
  } catch (error) {
    console.error('Error deleting batch:', error);
    return { message: 'Failed to delete batch' };
  }

  redirect('/dashboard/production');
}

export async function updateBatch(
  prevState: UpdateBatchFormState,
  formData: FormData
): Promise<UpdateBatchFormState> {
  try {
    await verifyManagerOrAbove();

    const validatedFields = updateBatchSchema.safeParse({
      batchId: formData.get('batchId'),
      totalUnits: formData.get('totalUnits'),
      notes: formData.get('notes') || undefined,
      productionDate: formData.get('productionDate'),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { batchId, totalUnits, notes, productionDate } = validatedFields.data;

    const batch = await db.batch.findUnique({
      where: { id: batchId, isActive: true },
      select: { status: true },
    });

    if (!batch) {
      return { message: 'Batch not found' };
    }

    if (batch.status !== 'PLANNED' && batch.status !== 'IN_PROGRESS') {
      return { message: 'Only PLANNED or IN_PROGRESS batches can be edited' };
    }

    await db.batch.update({
      where: { id: batchId },
      data: {
        totalUnits,
        notes,
        productionDate,
      },
    });

    revalidatePath('/dashboard/production');
    revalidatePath(`/dashboard/production/${batchId}`);

    return {
      success: true,
      message: 'Batch updated successfully',
    };
  } catch (error) {
    console.error('Error updating batch:', error);
    return { message: 'Failed to update batch' };
  }
}
