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
 * Classifies current stock level using per-SKU thresholds.
 *
 * - CRITICAL: currentStock <= criticalThreshold (immediate action required)
 * - REORDER:  currentStock <= reorderThreshold (order soon)
 * - HEALTHY:  currentStock > reorderThreshold (sufficient stock)
 *
 * @param currentStock - Current units available
 * @param criticalThreshold - Threshold for critical alerts
 * @param reorderThreshold - Threshold for reorder alerts
 * @returns StockLevel classification
 */
export function classifyStockLevel(
  currentStock: number,
  criticalThreshold: number = 10,
  reorderThreshold: number = 20
): StockLevel {
  if (currentStock <= criticalThreshold) return 'CRITICAL';
  if (currentStock <= reorderThreshold) return 'REORDER';
  return 'HEALTHY';
}

/**
 * Legacy function for backward compatibility.
 * @deprecated Use the new classifyStockLevel with explicit thresholds
 */
export function classifyStockLevelLegacy(
  currentStock: number,
  reorderPoint: number
): StockLevel {
  if (currentStock < reorderPoint) return 'CRITICAL';
  if (currentStock < reorderPoint * 1.2) return 'REORDER';
  return 'HEALTHY';
}
