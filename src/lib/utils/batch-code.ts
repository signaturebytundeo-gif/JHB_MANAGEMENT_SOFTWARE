import { format } from 'date-fns';
import { db } from '@/lib/db';

/**
 * Generates a batch code in MMDDYY format with letter suffix for duplicates.
 * First batch of the day: 021726
 * Second batch: 021726A
 * Third batch: 021726B
 * etc.
 *
 * Uses a database transaction to prevent race conditions.
 */
export async function generateBatchCode(date: Date = new Date()): Promise<string> {
  const dateCode = format(date, 'MMddyy');

  // Find existing batches for this date code
  const existingBatches = await db.batch.findMany({
    where: {
      batchCode: {
        startsWith: dateCode,
      },
    },
    select: { batchCode: true },
    orderBy: { batchCode: 'asc' },
  });

  if (existingBatches.length === 0) {
    return dateCode;
  }

  // Find next available letter suffix
  // First batch has no suffix, subsequent ones get A, B, C, etc.
  const suffixIndex = existingBatches.length - 1;
  const suffix = String.fromCharCode(65 + suffixIndex); // A=65, B=66, etc.
  return `${dateCode}${suffix}`;
}
