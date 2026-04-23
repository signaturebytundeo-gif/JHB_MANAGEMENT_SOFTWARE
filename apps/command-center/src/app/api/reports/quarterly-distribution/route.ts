import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/dal';
import { z } from 'zod';

const quarterlyReportSchema = z.object({
  year: z.number().min(2020).max(2030),
  quarter: z.number().min(1).max(4),
  locationId: z.string().optional(), // Optional - if not provided, includes all restaurant locations
});

type QuarterlyDistributionData = {
  location: {
    id: string;
    name: string;
    type: string;
  };
  products: Array<{
    productId: string;
    productName: string;
    sku: string;
    size: string;
    totalQuantitySold: number;
    totalRevenue: number;
    averageSellingPrice: number;
    lastSaleDate: Date | null;
  }>;
  summary: {
    totalBottlesDistributed: number;
    totalRevenue: number;
    quarterStart: Date;
    quarterEnd: Date;
  };
};

function getQuarterDates(year: number, quarter: number) {
  const quarterStart = new Date(year, (quarter - 1) * 3, 1); // First day of quarter
  const quarterEnd = new Date(year, quarter * 3, 0, 23, 59, 59); // Last day of quarter
  return { quarterStart, quarterEnd };
}

export async function GET(req: Request) {
  try {
    const session = await verifySession();
    const url = new URL(req.url);

    const validation = quarterlyReportSchema.safeParse({
      year: parseInt(url.searchParams.get('year') || new Date().getFullYear().toString()),
      quarter: parseInt(url.searchParams.get('quarter') || Math.ceil((new Date().getMonth() + 1) / 3).toString()),
      locationId: url.searchParams.get('locationId') || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { year, quarter, locationId } = validation.data;
    const { quarterStart, quarterEnd } = getQuarterDates(year, quarter);

    // Get target locations (restaurant locations by default)
    const locationFilter = locationId
      ? { id: locationId }
      : {
          type: {
            in: ['RESTAURANT', 'PRODUCTION'] // Include both restaurant and production locations
          }
        };

    const locations = await prisma.location.findMany({
      where: {
        ...locationFilter,
        isActive: true,
      },
    });

    const reportsData: QuarterlyDistributionData[] = [];

    for (const location of locations) {
      // Get sales data for this location and quarter
      const sales = await prisma.sale.findMany({
        where: {
          saleDate: {
            gte: quarterStart,
            lte: quarterEnd,
          },
          // Note: We'll need to add locationId to Sale model or use a different approach
          // For now, let's aggregate all sales and assume they're distributed to restaurants
        },
        include: {
          product: true,
          channel: true,
        },
      });

      // Group sales by product
      const productMap = new Map<string, {
        productId: string;
        productName: string;
        sku: string;
        size: string;
        totalQuantitySold: number;
        totalRevenue: number;
        lastSaleDate: Date | null;
      }>();

      for (const sale of sales) {
        const key = sale.product.id;
        const existing = productMap.get(key);

        if (existing) {
          existing.totalQuantitySold += sale.quantity;
          existing.totalRevenue += Number(sale.totalAmount);
          if (!existing.lastSaleDate || sale.saleDate > existing.lastSaleDate) {
            existing.lastSaleDate = sale.saleDate;
          }
        } else {
          productMap.set(key, {
            productId: sale.product.id,
            productName: sale.product.name,
            sku: sale.product.sku,
            size: sale.product.size,
            totalQuantitySold: sale.quantity,
            totalRevenue: Number(sale.totalAmount),
            lastSaleDate: sale.saleDate,
          });
        }
      }

      const products = Array.from(productMap.values()).map(product => ({
        ...product,
        averageSellingPrice: product.totalQuantitySold > 0
          ? product.totalRevenue / product.totalQuantitySold
          : 0,
      }));

      const summary = {
        totalBottlesDistributed: products.reduce((sum, p) => sum + p.totalQuantitySold, 0),
        totalRevenue: products.reduce((sum, p) => sum + p.totalRevenue, 0),
        quarterStart,
        quarterEnd,
      };

      reportsData.push({
        location: {
          id: location.id,
          name: location.name,
          type: location.type,
        },
        products,
        summary,
      });
    }

    // Calculate overall totals
    const overallSummary = {
      totalLocations: reportsData.length,
      totalBottlesDistributed: reportsData.reduce((sum, report) => sum + report.summary.totalBottlesDistributed, 0),
      totalRevenue: reportsData.reduce((sum, report) => sum + report.summary.totalRevenue, 0),
      quarterLabel: `Q${quarter} ${year}`,
      quarterStart,
      quarterEnd,
    };

    return NextResponse.json({
      success: true,
      data: {
        reports: reportsData,
        summary: overallSummary,
        metadata: {
          year,
          quarter,
          locationFilter: locationId || 'all-restaurants',
          generatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('[quarterly-distribution] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate quarterly distribution report' },
      { status: 500 }
    );
  }
}