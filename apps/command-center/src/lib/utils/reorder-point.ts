/**
 * Stock level classification type.
 * HEALTHY  - Stock is well above reorder threshold
 * REORDER  - Stock is near reorder threshold (within 20% buffer)
 * CRITICAL - Stock has dropped below reorder threshold
 */
export type StockLevel = 'HEALTHY' | 'REORDER' | 'CRITICAL';

/**
 * Calculates the reorder point threshold.
 *
 * Formula: (averageDailyDemand * leadTimeDays) + (averageDailyDemand * safetyStockDays)
 *
 * The result is the minimum stock level at which a reorder should be triggered
 * to avoid stockout during the supplier lead time.
 *
 * @param averageDailyDemand - Average units sold or consumed per day
 * @param leadTimeDays - Number of days for supplier to deliver after order
 * @param safetyStockDays - Buffer days of stock to maintain (default: 7)
 * @returns Reorder point threshold in units (rounded up to nearest integer)
 */
export function calculateReorderPoint(
  averageDailyDemand: number,
  leadTimeDays: number,
  safetyStockDays: number = 7
): number {
  const leadTimeDemand = averageDailyDemand * leadTimeDays;
  const safetyStock = averageDailyDemand * safetyStockDays;
  return Math.ceil(leadTimeDemand + safetyStock);
}

/**
 * Classifies current stock level relative to the reorder threshold.
 *
 * - CRITICAL: currentStock < reorderPoint (action required immediately)
 * - REORDER:  currentStock < reorderPoint * 1.2 (approaching threshold, order soon)
 * - HEALTHY:  currentStock >= reorderPoint * 1.2 (sufficient stock)
 *
 * @param currentStock - Current units available
 * @param reorderPoint - Threshold at which to reorder
 * @returns StockLevel classification
 */
export function classifyStockLevel(
  currentStock: number,
  reorderPoint: number
): StockLevel {
  if (currentStock < reorderPoint) return 'CRITICAL';
  if (currentStock < reorderPoint * 1.2) return 'REORDER';
  return 'HEALTHY';
}
