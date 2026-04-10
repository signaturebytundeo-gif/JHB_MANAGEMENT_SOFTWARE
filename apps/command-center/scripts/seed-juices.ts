/**
 * seed-juices.ts — Add 8 new juice SKUs to the Product table,
 * create Retail pricing tiers, set starting stock, and sync with Square catalog.
 *
 * Run:  npx tsx scripts/seed-juices.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter, log: ["error"] });

// ── Juice definitions ────────────────────────────────────────────
const JUICES = [
  { name: "Pineapple Passion",  sku: "JHB-JC-PIN-PAS" },
  { name: "Pineapple Ginger",   sku: "JHB-JC-PIN-GIN" },
  { name: "Fruit Punch",        sku: "JHB-JC-FRU-PUN" },
  { name: "Guava",              sku: "JHB-JC-GUA"     },
  { name: "Guava Mango",        sku: "JHB-JC-GUA-MAN" },
  { name: "Mango Passion",      sku: "JHB-JC-MAN-PAS" },
  { name: "Guava Pineapple",    sku: "JHB-JC-GUA-PIN" },
  { name: "Guava Passion",      sku: "JHB-JC-GUA-PAS" },
] as const;

const RETAIL_PRICE = 7.99;
const STARTING_STOCK = 24;
const STOCK_LOCATION_NAME = "Farmers Markets";

// ── Square helpers ───────────────────────────────────────────────
const SQUARE_TOKEN = process.env.SQUARE_ACCESS_TOKEN ?? "";
const SQUARE_ENV = process.env.SQUARE_ENVIRONMENT ?? "sandbox";
const SQUARE_BASE =
  SQUARE_ENV === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";

interface SquareCatalogItem {
  id: string;
  type: string;
  item_data?: {
    name?: string;
    variations?: {
      id: string;
      item_variation_data?: {
        sku?: string;
        name?: string;
        pricing_type?: string;
        price_money?: { amount: number; currency: string };
      };
    }[];
  };
}

async function listSquareCatalogItems(): Promise<SquareCatalogItem[]> {
  if (!SQUARE_TOKEN) return [];
  const items: SquareCatalogItem[] = [];
  let cursor: string | undefined;

  try {
    do {
      const url = new URL(`${SQUARE_BASE}/v2/catalog/list`);
      url.searchParams.set("types", "ITEM");
      if (cursor) url.searchParams.set("cursor", cursor);

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${SQUARE_TOKEN}`,
          "Square-Version": "2024-01-18",
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        console.error(`Square list failed: ${res.status} ${await res.text()}`);
        return items;
      }

      const data = await res.json();
      if (data.objects) items.push(...data.objects);
      cursor = data.cursor;
    } while (cursor);
  } catch (err) {
    console.error("Square catalog list error:", err);
  }

  return items;
}

async function createSquareCatalogItem(
  name: string,
  sku: string,
  priceCents: number
): Promise<{ id: string } | null> {
  if (!SQUARE_TOKEN) return null;

  const idempotencyKey = `jhb-juice-${sku}-${Date.now()}`;
  const tempId = `#${sku}`;
  const tempVarId = `#${sku}-var`;

  try {
    const res = await fetch(`${SQUARE_BASE}/v2/catalog/object`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SQUARE_TOKEN}`,
        "Square-Version": "2024-01-18",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        object: {
          type: "ITEM",
          id: tempId,
          item_data: {
            name,
            description: `Jamaica House Brand ${name} Juice — bottle`,
            abbreviation: sku,
            variations: [
              {
                type: "ITEM_VARIATION",
                id: tempVarId,
                item_variation_data: {
                  name: "Regular",
                  sku,
                  pricing_type: "FIXED_PRICING",
                  price_money: {
                    amount: priceCents,
                    currency: "USD",
                  },
                },
              },
            ],
          },
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Square create failed for ${name}: ${res.status} ${errText}`);
      return null;
    }

    const data = await res.json();
    return { id: data.catalog_object?.id ?? "unknown" };
  } catch (err) {
    console.error(`Square create error for ${name}:`, err);
    return null;
  }
}

// ── Main ─────────────────────────────────────────────────────────
type ResultRow = {
  item: string;
  sku: string;
  squareStatus: string;
  supabaseStatus: string;
};

async function main() {
  console.log("🧃 Seeding 8 juice SKUs into JHB Command Center...\n");

  // 1. Fetch existing Square catalog for matching
  console.log("📡 Fetching Square catalog...");
  const squareItems = await listSquareCatalogItems();
  console.log(`   Found ${squareItems.length} items in Square catalog\n`);

  // Build a lookup: lowercase name → catalog item
  const squareByName = new Map<string, SquareCatalogItem>();
  for (const item of squareItems) {
    const name = item.item_data?.name?.toLowerCase();
    if (name) squareByName.set(name, item);
  }

  // 2. Get stock location for initial inventory
  const stockLocation = await prisma.location.findFirst({
    where: { name: STOCK_LOCATION_NAME },
  });
  if (!stockLocation) {
    console.warn(`⚠ Location "${STOCK_LOCATION_NAME}" not found — skipping initial stock`);
  }

  // 3. Get first admin user for createdById
  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!adminUser) {
    console.error("❌ No active admin user found — cannot create inventory records");
    process.exit(1);
  }

  const results: ResultRow[] = [];

  for (const juice of JUICES) {
    console.log(`── ${juice.name} (${juice.sku}) ──`);

    // ── Check Square ──
    let squareStatus = "—";
    const squareMatch = squareByName.get(juice.name.toLowerCase());

    if (squareMatch) {
      const squareId = squareMatch.id;
      const squareSku =
        squareMatch.item_data?.variations?.[0]?.item_variation_data?.sku ?? "—";
      squareStatus = `EXISTS (${squareId.slice(0, 12)}…) SKU: ${squareSku}`;
      console.log(`   Square: found existing → ${squareId}`);
    } else {
      // Create in Square
      const created = await createSquareCatalogItem(
        juice.name,
        juice.sku,
        Math.round(RETAIL_PRICE * 100)
      );
      if (created) {
        squareStatus = `CREATED (${created.id.slice(0, 12)}…)`;
        console.log(`   Square: created → ${created.id}`);
      } else {
        squareStatus = SQUARE_TOKEN ? "FAILED" : "NO_TOKEN";
        console.log(`   Square: ${squareStatus}`);
      }
    }

    // ── Upsert into Product table ──
    let supabaseStatus: string;
    try {
      const product = await prisma.product.upsert({
        where: { sku: juice.sku },
        update: { name: juice.name, isActive: true },
        create: {
          name: juice.name,
          sku: juice.sku,
          size: "bottle",
          unitsPerCase: 24,
          description: `Jamaica House Brand ${juice.name} Juice`,
          reorderPoint: 24,
          leadTimeDays: 7,
          isActive: true,
        },
      });

      // ── Retail pricing tier ──
      await prisma.pricingTier.upsert({
        where: {
          productId_tierName: {
            productId: product.id,
            tierName: "Retail",
          },
        },
        update: { unitPrice: RETAIL_PRICE },
        create: {
          productId: product.id,
          tierName: "Retail",
          unitPrice: RETAIL_PRICE,
          casePrice: null,
        },
      });

      // ── Starting stock (InventoryTransaction) ──
      if (stockLocation) {
        // Check if we already seeded stock for this product+location
        const existingTx = await prisma.inventoryTransaction.findFirst({
          where: {
            productId: product.id,
            locationId: stockLocation.id,
            type: "ADJUSTMENT",
            reason: "Initial juice stock seed",
          },
        });

        if (!existingTx) {
          await prisma.inventoryTransaction.create({
            data: {
              productId: product.id,
              locationId: stockLocation.id,
              type: "ADJUSTMENT",
              quantityChange: STARTING_STOCK,
              reason: "Initial juice stock seed",
              notes: `Seeded ${STARTING_STOCK} bottles via seed-juices.ts`,
              createdById: adminUser.id,
            },
          });
          supabaseStatus = `UPSERTED + ${STARTING_STOCK} stock`;
        } else {
          supabaseStatus = "UPSERTED (stock already seeded)";
        }
      } else {
        supabaseStatus = "UPSERTED (no stock location)";
      }

      console.log(`   DB: ${supabaseStatus}`);
    } catch (err) {
      supabaseStatus = `ERROR: ${(err as Error).message.slice(0, 60)}`;
      console.error(`   DB error:`, err);
    }

    results.push({
      item: juice.name,
      sku: juice.sku,
      squareStatus,
      supabaseStatus,
    });
  }

  // ── Summary table ──
  console.log("\n" + "=".repeat(100));
  console.log("SUMMARY");
  console.log("=".repeat(100));
  console.log(
    "Item".padEnd(22) +
    "SKU".padEnd(20) +
    "Square Status".padEnd(32) +
    "DB Status"
  );
  console.log("-".repeat(100));
  for (const r of results) {
    console.log(
      r.item.padEnd(22) +
      r.sku.padEnd(20) +
      r.squareStatus.padEnd(32) +
      r.supabaseStatus
    );
  }
  console.log("=".repeat(100));
  console.log(`\n🎉 Done. ${results.length} juice products processed.`);
}

main()
  .catch((e) => {
    console.error("❌ Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
