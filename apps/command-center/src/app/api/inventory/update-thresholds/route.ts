import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/dal';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateThresholdsSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  reorderThreshold: z.number().int().min(1, 'Reorder threshold must be at least 1'),
  criticalThreshold: z.number().int().min(1, 'Critical threshold must be at least 1'),
}).refine((data) => data.criticalThreshold < data.reorderThreshold, {
  message: 'Critical threshold must be less than reorder threshold',
  path: ['criticalThreshold'],
});

export async function POST(request: NextRequest) {
  try {
    // Verify session and role
    const session = await verifySession();
    if (!session || !['ADMIN', 'MANAGER'].includes(session.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin or Manager role required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = updateThresholdsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const { productId, reorderThreshold, criticalThreshold } = validation.data;

    // Verify product exists
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, isActive: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    if (!product.isActive) {
      return NextResponse.json(
        { error: 'Cannot update thresholds for inactive product' },
        { status: 400 }
      );
    }

    // Update the product thresholds
    await db.product.update({
      where: { id: productId },
      data: {
        reorderThreshold,
        criticalThreshold,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Updated thresholds for ${product.name}`,
      data: {
        productId,
        reorderThreshold,
        criticalThreshold,
      },
    });

  } catch (error) {
    console.error('Error updating product thresholds:', error);
    return NextResponse.json(
      { error: 'Failed to update thresholds' },
      { status: 500 }
    );
  }
}