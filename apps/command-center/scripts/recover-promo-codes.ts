/**
 * Data Recovery Script: Restore Lost Promo Codes
 * Run: npx tsx scripts/recover-promo-codes.ts
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function recoverPromoCodes() {
  console.log('🔄 Starting promo code recovery...');

  try {
    // PROMO CODE 1: AJBAR26 - 10% off
    const ajbar26 = await db.promoCode.upsert({
      where: { code: 'AJBAR26' },
      update: {}, // Don't update if exists
      create: {
        code: 'AJBAR26',
        discountType: 'percentage',
        discountValue: 10,
        assignedTo: 'AJ Bar', // Inferred from code name
        isActive: true,
        usageCount: 0,
        maxUses: null, // Unlimited unless specified
        expiresAt: null, // No expiration unless specified
      },
    });

    console.log('✅ Recovered AJBAR26:', ajbar26);

    // PROMO CODE 2: TOM2026! - 20% off
    const tom2026 = await db.promoCode.upsert({
      where: { code: 'TOM2026!' },
      update: {}, // Don't update if exists
      create: {
        code: 'TOM2026!',
        discountType: 'percentage',
        discountValue: 20,
        assignedTo: 'Tom', // Inferred from code name
        isActive: true,
        usageCount: 0,
        maxUses: null, // Unlimited unless specified
        expiresAt: null, // No expiration unless specified
      },
    });

    console.log('✅ Recovered TOM2026!:', tom2026);

    console.log('\n🎉 Promo code recovery complete!');
    console.log('📝 Next steps:');
    console.log('1. Verify codes in /dashboard/promo-codes');
    console.log('2. Update assigned_to fields if names are incorrect');
    console.log('3. Set max_uses and expiration dates if needed');

  } catch (error) {
    console.error('❌ Recovery failed:', error);
  } finally {
    await db.$disconnect();
  }
}

// Run recovery
recoverPromoCodes().catch(console.error);