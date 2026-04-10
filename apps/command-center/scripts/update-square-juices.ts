/**
 * update-square-juices.ts — Ensure all juice items in Square have correct
 * pricing ($7.99), are grouped under a "Juices" category, and add Water ($2).
 *
 * Run:  npx tsx scripts/update-square-juices.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config();
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter, log: ['error'] });

const SQUARE_TOKEN = process.env.SQUARE_ACCESS_TOKEN ?? '';
const SQUARE_ENV = process.env.SQUARE_ENVIRONMENT ?? 'sandbox';
const SQUARE_BASE =
  SQUARE_ENV === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
const SQUARE_VERSION = '2024-01-18';

const headers = {
  Authorization: `Bearer ${SQUARE_TOKEN}`,
  'Content-Type': 'application/json',
  'Square-Version': SQUARE_VERSION,
};

// ── Square API helpers ───────────────────────────────────────────

async function squareGet(path: string) {
  const res = await fetch(`${SQUARE_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function squarePost(path: string, body: any) {
  const res = await fetch(`${SQUARE_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

// List all catalog items
async function listCatalog(types: string): Promise<any[]> {
  const items: any[] = [];
  let cursor: string | undefined;
  do {
    const url = `/v2/catalog/list?types=${types}${cursor ? `&cursor=${cursor}` : ''}`;
    const data = await squareGet(url);
    if (data.objects) items.push(...data.objects);
    cursor = data.cursor;
  } while (cursor);
  return items;
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  if (!SQUARE_TOKEN) {
    console.error('❌ SQUARE_ACCESS_TOKEN not set');
    process.exit(1);
  }
  console.log(`🔗 Square environment: ${SQUARE_ENV}\n`);

  // ── 1. Create or find "Juices" category ──
  console.log('📂 Setting up "Juices" category...');
  const categories = await listCatalog('CATEGORY');
  let juiceCategory = categories.find(
    (c: any) => c.category_data?.name?.toLowerCase() === 'juices'
  );

  if (!juiceCategory) {
    const catResult = await squarePost('/v2/catalog/object', {
      idempotency_key: `jhb-cat-juices-${Date.now()}`,
      object: {
        type: 'CATEGORY',
        id: '#juices-category',
        category_data: { name: 'Juices' },
      },
    });
    juiceCategory = catResult.catalog_object;
    console.log(`   Created "Juices" category: ${juiceCategory.id}`);
  } else {
    console.log(`   Found existing "Juices" category: ${juiceCategory.id}`);
  }

  // ── 2. Find all juice items + update price/category ──
  console.log('\n🧃 Updating juice items...');
  const allItems = await listCatalog('ITEM');

  const juiceNames = [
    'Pineapple Passion',
    'Pineapple Ginger',
    'Fruit Punch',
    'Guava',
    'Guava Mango',
    'Mango Passion',
    'Guava Pineapple',
    'Guava Passion',
  ];

  const priceCents = 799;

  for (const jName of juiceNames) {
    const item = allItems.find(
      (i: any) => i.item_data?.name?.toLowerCase() === jName.toLowerCase()
    );
    if (!item) {
      console.log(`   ⚠ ${jName}: not found in Square — skipping`);
      continue;
    }

    // Update the item: set category + ensure price on first variation
    const variations = (item.item_data?.variations ?? []).map((v: any) => ({
      ...v,
      item_variation_data: {
        ...v.item_variation_data,
        pricing_type: 'FIXED_PRICING',
        price_money: { amount: priceCents, currency: 'USD' },
      },
    }));

    await squarePost('/v2/catalog/object', {
      idempotency_key: `jhb-update-${item.id}-${Date.now()}`,
      object: {
        type: 'ITEM',
        id: item.id,
        version: item.version,
        item_data: {
          ...item.item_data,
          category_id: juiceCategory.id,
          variations,
        },
      },
    });
    console.log(`   ✅ ${jName}: price=$7.99, category=Juices`);
  }

  // ── 3. Add Water ($2.00) to DB + Square ──
  console.log('\n💧 Adding Water...');

  // DB
  const waterProduct = await prisma.product.upsert({
    where: { sku: 'JHB-WTR' },
    update: { name: 'Water', isActive: true },
    create: {
      name: 'Water',
      sku: 'JHB-WTR',
      size: 'bottle',
      unitsPerCase: null,
      description: 'Bottled water',
      reorderPoint: 0,
      leadTimeDays: 1,
      isActive: true,
    },
  });

  await prisma.pricingTier.upsert({
    where: {
      productId_tierName: { productId: waterProduct.id, tierName: 'Retail' },
    },
    update: { unitPrice: 2.0 },
    create: {
      productId: waterProduct.id,
      tierName: 'Retail',
      unitPrice: 2.0,
      casePrice: null,
    },
  });
  console.log(`   DB: Water (JHB-WTR) upserted at $2.00`);

  // Square — check if exists
  const existingWater = allItems.find(
    (i: any) => i.item_data?.name?.toLowerCase() === 'water'
  );

  if (existingWater) {
    // Update price
    const variations = (existingWater.item_data?.variations ?? []).map((v: any) => ({
      ...v,
      item_variation_data: {
        ...v.item_variation_data,
        pricing_type: 'FIXED_PRICING',
        price_money: { amount: 200, currency: 'USD' },
      },
    }));
    await squarePost('/v2/catalog/object', {
      idempotency_key: `jhb-update-water-${Date.now()}`,
      object: {
        type: 'ITEM',
        id: existingWater.id,
        version: existingWater.version,
        item_data: { ...existingWater.item_data, variations },
      },
    });
    console.log(`   Square: Water updated → ${existingWater.id}`);
  } else {
    const created = await squarePost('/v2/catalog/object', {
      idempotency_key: `jhb-create-water-${Date.now()}`,
      object: {
        type: 'ITEM',
        id: '#water',
        item_data: {
          name: 'Water',
          description: 'Bottled water',
          abbreviation: 'JHB-WTR',
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#water-var',
              item_variation_data: {
                name: 'Regular',
                sku: 'JHB-WTR',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 200, currency: 'USD' },
              },
            },
          ],
        },
      },
    });
    console.log(`   Square: Water created → ${created.catalog_object?.id}`);
  }

  console.log('\n🎉 Done. All juices at $7.99 under "Juices" category. Water at $2.00.');
}

main()
  .catch((e) => {
    console.error('❌ Fatal:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
