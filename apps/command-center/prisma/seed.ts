import "dotenv/config";
import { PrismaClient, Role, LocationType, ChannelType } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import * as bcrypt from "bcrypt";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./dev.db",
});
const prisma = new PrismaClient({
  adapter,
  log: ["error"],
});

async function main() {
  console.log("🌱 Starting database seed...");

  // ============================================================================
  // ADMIN USERS (INFRA-04)
  // ============================================================================
  console.log("👥 Seeding admin users...");

  const defaultPassword = await bcrypt.hash("JHB2026!", 10);

  const anthony = await prisma.user.upsert({
    where: { email: "anthony@jamaicahousebrand.com" },
    update: {},
    create: {
      email: "anthony@jamaicahousebrand.com",
      name: "Anthony Amos Jr.",
      password: defaultPassword,
      role: Role.ADMIN,
      emailVerified: new Date(),
      isActive: true,
    },
  });

  const tunde = await prisma.user.upsert({
    where: { email: "olatunde@jamaicahousebrand.com" },
    update: {},
    create: {
      email: "olatunde@jamaicahousebrand.com",
      name: "Olatunde Ogunjulugbe",
      password: defaultPassword,
      role: Role.ADMIN,
      emailVerified: new Date(),
      isActive: true,
    },
  });

  console.log(`✅ Created/verified admin users: ${anthony.name}, ${tunde.name}`);

  // ============================================================================
  // PRODUCTS WITH PRICING TIERS (INFRA-01)
  // ============================================================================
  console.log("🌶️  Seeding products with pricing tiers...");

  // Product 1: Original Jerk Sauce 2oz
  const ojs2oz = await prisma.product.upsert({
    where: { sku: "JHB-OJS-2OZ" },
    update: {},
    create: {
      name: "Original Jerk Sauce",
      sku: "JHB-OJS-2OZ",
      size: "2oz",
      unitsPerCase: 25,
      description: "Original Jamaican jerk sauce in 2oz bottles",
      isActive: true,
    },
  });

  await prisma.pricingTier.upsert({
    where: {
      productId_tierName: {
        productId: ojs2oz.id,
        tierName: "Wholesale Cash",
      },
    },
    update: {},
    create: {
      productId: ojs2oz.id,
      tierName: "Wholesale Cash",
      unitPrice: 3.0,
      casePrice: 75.0,
    },
  });

  await prisma.pricingTier.upsert({
    where: {
      productId_tierName: {
        productId: ojs2oz.id,
        tierName: "Retail",
      },
    },
    update: {},
    create: {
      productId: ojs2oz.id,
      tierName: "Retail",
      unitPrice: 3.75,
      casePrice: null,
    },
  });

  // Product 2: Original Jerk Sauce 5oz
  const ojs5oz = await prisma.product.upsert({
    where: { sku: "JHB-OJS-5OZ" },
    update: {},
    create: {
      name: "Original Jerk Sauce",
      sku: "JHB-OJS-5OZ",
      size: "5oz",
      unitsPerCase: 12,
      description: "Original Jamaican jerk sauce in 5oz bottles",
      isActive: true,
    },
  });

  await prisma.pricingTier.upsert({
    where: {
      productId_tierName: {
        productId: ojs5oz.id,
        tierName: "Wholesale Cash",
      },
    },
    update: {},
    create: {
      productId: ojs5oz.id,
      tierName: "Wholesale Cash",
      unitPrice: 5.0,
      casePrice: 60.0,
    },
  });

  await prisma.pricingTier.upsert({
    where: {
      productId_tierName: {
        productId: ojs5oz.id,
        tierName: "Wholesale Net 30",
      },
    },
    update: {},
    create: {
      productId: ojs5oz.id,
      tierName: "Wholesale Net 30",
      unitPrice: 6.25,
      casePrice: 75.0,
    },
  });

  await prisma.pricingTier.upsert({
    where: {
      productId_tierName: {
        productId: ojs5oz.id,
        tierName: "Retail",
      },
    },
    update: {},
    create: {
      productId: ojs5oz.id,
      tierName: "Retail",
      unitPrice: 7.5,
      casePrice: null,
    },
  });

  // Product 3: Original Jerk Sauce 10oz
  const ojs10oz = await prisma.product.upsert({
    where: { sku: "JHB-OJS-10OZ" },
    update: {},
    create: {
      name: "Original Jerk Sauce",
      sku: "JHB-OJS-10OZ",
      size: "10oz",
      unitsPerCase: 12,
      description: "Original Jamaican jerk sauce in 10oz bottles",
      isActive: true,
    },
  });

  await prisma.pricingTier.upsert({
    where: {
      productId_tierName: {
        productId: ojs10oz.id,
        tierName: "Wholesale Cash",
      },
    },
    update: {},
    create: {
      productId: ojs10oz.id,
      tierName: "Wholesale Cash",
      unitPrice: 10.0,
      casePrice: 110.0,
    },
  });

  await prisma.pricingTier.upsert({
    where: {
      productId_tierName: {
        productId: ojs10oz.id,
        tierName: "Wholesale Net 30",
      },
    },
    update: {},
    create: {
      productId: ojs10oz.id,
      tierName: "Wholesale Net 30",
      unitPrice: 12.5,
      casePrice: 150.0,
    },
  });

  await prisma.pricingTier.upsert({
    where: {
      productId_tierName: {
        productId: ojs10oz.id,
        tierName: "Retail",
      },
    },
    update: {},
    create: {
      productId: ojs10oz.id,
      tierName: "Retail",
      unitPrice: 13.5,
      casePrice: null,
    },
  });

  // Product 4: Escovitch/Pikliz 12oz
  const ep12oz = await prisma.product.upsert({
    where: { sku: "JHB-EP-12OZ" },
    update: {},
    create: {
      name: "Escovitch/Pikliz",
      sku: "JHB-EP-12OZ",
      size: "12oz",
      unitsPerCase: 12,
      description: "Traditional Caribbean pickled vegetables",
      isActive: true,
    },
  });

  await prisma.pricingTier.upsert({
    where: {
      productId_tierName: {
        productId: ep12oz.id,
        tierName: "Wholesale Cash",
      },
    },
    update: {},
    create: {
      productId: ep12oz.id,
      tierName: "Wholesale Cash",
      unitPrice: 4.58,
      casePrice: 55.0,
    },
  });

  await prisma.pricingTier.upsert({
    where: {
      productId_tierName: {
        productId: ep12oz.id,
        tierName: "Retail",
      },
    },
    update: {},
    create: {
      productId: ep12oz.id,
      tierName: "Retail",
      unitPrice: 7.0,
      casePrice: null,
    },
  });

  // Product 5: Original Jerk Sauce 1 Gallon
  const ojs1gal = await prisma.product.upsert({
    where: { sku: "JHB-OJS-1GAL" },
    update: {},
    create: {
      name: "Original Jerk Sauce",
      sku: "JHB-OJS-1GAL",
      size: "1 gallon",
      unitsPerCase: 1,
      description: "Original Jamaican jerk sauce in 1 gallon containers. Introductory price $50 for first 3 months.",
      isActive: true,
    },
  });

  await prisma.pricingTier.upsert({
    where: {
      productId_tierName: {
        productId: ojs1gal.id,
        tierName: "Wholesale Cash",
      },
    },
    update: {},
    create: {
      productId: ojs1gal.id,
      tierName: "Wholesale Cash",
      unitPrice: 80.0,
      casePrice: null,
    },
  });

  await prisma.pricingTier.upsert({
    where: {
      productId_tierName: {
        productId: ojs1gal.id,
        tierName: "Wholesale Net 30",
      },
    },
    update: {},
    create: {
      productId: ojs1gal.id,
      tierName: "Wholesale Net 30",
      unitPrice: 100.0,
      casePrice: null,
    },
  });

  // Product 6: Original Jerk Sauce 9g Sachet (TBD packaging)
  const ojs9g = await prisma.product.upsert({
    where: { sku: "JHB-OJS-9G" },
    update: {},
    create: {
      name: "Original Jerk Sauce",
      sku: "JHB-OJS-9G",
      size: "9g sachet",
      unitsPerCase: null,
      description: "Original Jamaican jerk sauce in 9g single-serve sachets. Packaging configuration TBD.",
      isActive: true,
    },
  });

  console.log("✅ Created/verified 6 products with pricing tiers");

  // ============================================================================
  // VOLUME DISCOUNTS (INFRA-01)
  // ============================================================================
  console.log("📊 Seeding volume discounts...");

  await prisma.volumeDiscount.upsert({
    where: { id: "volume-1-5" },
    update: {},
    create: {
      id: "volume-1-5",
      minCases: 1,
      maxCases: 5,
      discountPercent: 0,
      description: "Standard price (1-5 cases)",
    },
  });

  await prisma.volumeDiscount.upsert({
    where: { id: "volume-6-10" },
    update: {},
    create: {
      id: "volume-6-10",
      minCases: 6,
      maxCases: 10,
      discountPercent: 5,
      description: "5% discount (6-10 cases)",
    },
  });

  await prisma.volumeDiscount.upsert({
    where: { id: "volume-11-plus" },
    update: {},
    create: {
      id: "volume-11-plus",
      minCases: 11,
      maxCases: null,
      discountPercent: 10,
      description: "10% discount (11+ cases)",
    },
  });

  console.log("✅ Created/verified 3 volume discount tiers");

  // ============================================================================
  // FREQUENCY DISCOUNTS (INFRA-01)
  // ============================================================================
  console.log("📅 Seeding frequency discounts...");

  await prisma.frequencyDiscount.upsert({
    where: { id: "freq-quarterly" },
    update: {},
    create: {
      id: "freq-quarterly",
      frequency: "quarterly",
      discountPercent: 2,
      additionalBenefits: null,
    },
  });

  await prisma.frequencyDiscount.upsert({
    where: { id: "freq-annual" },
    update: {},
    create: {
      id: "freq-annual",
      frequency: "annual",
      discountPercent: 5,
      additionalBenefits: "Priority allocation during high demand periods",
    },
  });

  console.log("✅ Created/verified 2 frequency discount tiers");

  // ============================================================================
  // LOCATIONS (INFRA-02)
  // ============================================================================
  console.log("📍 Seeding locations...");

  await prisma.location.upsert({
    where: { name: "Miami Gardens Restaurant" },
    update: {},
    create: {
      name: "Miami Gardens Restaurant",
      type: LocationType.PRODUCTION,
      description: "Production facility + restaurant + retail",
      isActive: true,
    },
  });

  await prisma.location.upsert({
    where: { name: "Broward Blvd Restaurant" },
    update: {},
    create: {
      name: "Broward Blvd Restaurant",
      type: LocationType.RESTAURANT,
      description: "Restaurant + retail location",
      deliverySchedule: "Weekly delivery",
      isActive: true,
    },
  });

  await prisma.location.upsert({
    where: { name: "Miramar Restaurant" },
    update: {},
    create: {
      name: "Miramar Restaurant",
      type: LocationType.RESTAURANT,
      description: "Restaurant + retail location",
      deliverySchedule: "Weekly delivery",
      isActive: true,
    },
  });

  await prisma.location.upsert({
    where: { name: "Amazon FBA Warehouse" },
    update: {},
    create: {
      name: "Amazon FBA Warehouse",
      type: LocationType.FULFILLMENT,
      description: "E-commerce fulfillment center",
      isActive: true,
    },
  });

  await prisma.location.upsert({
    where: { name: "Main Warehouse/Storage" },
    update: {},
    create: {
      name: "Main Warehouse/Storage",
      type: LocationType.WAREHOUSE,
      description: "Finished goods + raw materials storage",
      isActive: true,
    },
  });

  await prisma.location.upsert({
    where: { name: "Farmers Markets" },
    update: {},
    create: {
      name: "Farmers Markets",
      type: LocationType.MARKET,
      description: "Rotating South Florida locations",
      isActive: true,
    },
  });

  await prisma.location.upsert({
    where: { name: "Event/Tailgate Locations" },
    update: {},
    create: {
      name: "Event/Tailgate Locations",
      type: LocationType.EVENT,
      description: "Pop-up sales at events and tailgates",
      isActive: true,
    },
  });

  console.log("✅ Created/verified 7 locations");

  // ============================================================================
  // SALES CHANNELS (INFRA-03)
  // ============================================================================
  console.log("🛒 Seeding sales channels...");

  await prisma.salesChannel.upsert({
    where: { name: "Amazon" },
    update: {},
    create: {
      name: "Amazon",
      type: ChannelType.MARKETPLACE,
      description: "Amazon FBA sales channel",
      isActive: true,
    },
  });

  await prisma.salesChannel.upsert({
    where: { name: "Restaurant Retail" },
    update: {},
    create: {
      name: "Restaurant Retail",
      type: ChannelType.RETAIL,
      description: "Direct retail sales at restaurant locations",
      isActive: true,
    },
  });

  await prisma.salesChannel.upsert({
    where: { name: "Wholesale/Distribution" },
    update: {},
    create: {
      name: "Wholesale/Distribution",
      type: ChannelType.WHOLESALE,
      description: "Wholesale distribution with Net 30 terms",
      isActive: true,
    },
  });

  await prisma.salesChannel.upsert({
    where: { name: "Farmers Markets" },
    update: {},
    create: {
      name: "Farmers Markets",
      type: ChannelType.EVENT,
      description: "Sales at farmers markets (Square/cash)",
      isActive: true,
    },
  });

  await prisma.salesChannel.upsert({
    where: { name: "E-commerce/Website" },
    update: {},
    create: {
      name: "E-commerce/Website",
      type: ChannelType.ONLINE,
      description: "Direct-to-consumer website sales (Stripe)",
      isActive: true,
    },
  });

  await prisma.salesChannel.upsert({
    where: { name: "Etsy" },
    update: {},
    create: {
      name: "Etsy",
      type: ChannelType.MARKETPLACE,
      description: "Etsy marketplace sales",
      isActive: true,
    },
  });

  await prisma.salesChannel.upsert({
    where: { name: "Subscription/Membership" },
    update: {},
    create: {
      name: "Subscription/Membership",
      type: ChannelType.SUBSCRIPTION,
      description: "Monthly and annual subscription plans",
      isActive: true,
    },
  });

  await prisma.salesChannel.upsert({
    where: { name: "Catering" },
    update: {},
    create: {
      name: "Catering",
      type: ChannelType.WHOLESALE,
      description: "Catering orders for events",
      isActive: true,
    },
  });

  await prisma.salesChannel.upsert({
    where: { name: "Events/Tailgates" },
    update: {},
    create: {
      name: "Events/Tailgates",
      type: ChannelType.EVENT,
      description: "Pop-up sales at events and tailgates",
      isActive: true,
    },
  });

  console.log("✅ Created/verified 9 sales channels");

  // ============================================================================
  // SUBSCRIPTION PLANS (INFRA-05)
  // ============================================================================
  console.log("💳 Seeding subscription plans...");

  await prisma.subscriptionPlan.upsert({
    where: { name: "Standard Annual" },
    update: {},
    create: {
      name: "Standard Annual",
      billingCycle: "annual",
      price: 75.0,
      includedProducts: "1x 5oz Original Jerk Sauce monthly + gift bottle",
      loyaltyReward: "1 month free at 6 months",
      cancellationPolicy: "30 days written notice required",
      isActive: true,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { name: "Premium Annual" },
    update: {},
    create: {
      name: "Premium Annual",
      billingCycle: "annual",
      price: 125.0,
      includedProducts: "1x 10oz Original Jerk Sauce monthly + gift bottle",
      loyaltyReward: "1 month free at 6 months",
      cancellationPolicy: "30 days written notice required",
      isActive: true,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { name: "Standard Monthly" },
    update: {},
    create: {
      name: "Standard Monthly",
      billingCycle: "monthly",
      price: 13.0,
      includedProducts: "2x 5oz Original Jerk Sauce monthly",
      loyaltyReward: null,
      cancellationPolicy: "30 days written notice required",
      isActive: true,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { name: "Premium Monthly" },
    update: {},
    create: {
      name: "Premium Monthly",
      billingCycle: "monthly",
      price: 20.0,
      includedProducts: "2x 10oz Original Jerk Sauce monthly",
      loyaltyReward: null,
      cancellationPolicy: "30 days written notice required",
      isActive: true,
    },
  });

  console.log("✅ Created/verified 4 subscription plans");

  // ============================================================================
  // APPROVAL THRESHOLDS (INFRA-06)
  // ============================================================================
  console.log("✔️  Seeding approval thresholds...");

  await prisma.approvalThreshold.upsert({
    where: { id: "threshold-under-150" },
    update: {},
    create: {
      id: "threshold-under-150",
      minAmount: 0,
      maxAmount: 149.99,
      approvalType: "auto",
      description: "Auto-approve transactions under $150",
    },
  });

  await prisma.approvalThreshold.upsert({
    where: { id: "threshold-150-500" },
    update: {},
    create: {
      id: "threshold-150-500",
      minAmount: 150,
      maxAmount: 499.99,
      approvalType: "single_member",
      description: "Single member approval + notification ($150-$500)",
    },
  });

  await prisma.approvalThreshold.upsert({
    where: { id: "threshold-500-2500" },
    update: {},
    create: {
      id: "threshold-500-2500",
      minAmount: 500,
      maxAmount: 2499.99,
      approvalType: "dual_member",
      description: "Dual member authorization ($500-$2,500)",
    },
  });

  await prisma.approvalThreshold.upsert({
    where: { id: "threshold-over-2500" },
    update: {},
    create: {
      id: "threshold-over-2500",
      minAmount: 2500,
      maxAmount: null,
      approvalType: "dual_bank",
      description: "Dual bank authorization (over $2,500)",
    },
  });

  console.log("✅ Created/verified 4 approval thresholds");

  // ============================================================================
  // CO-PACKER PARTNERS (PROD-10)
  // ============================================================================
  console.log("🏭 Seeding co-packer partners...");

  await prisma.coPackerPartner.upsert({
    where: { name: "Space Coast Sauces" },
    update: {},
    create: {
      name: "Space Coast Sauces",
      contactName: null,
      email: null,
      phone: null,
      address: null,
      isActive: true,
    },
  });

  await prisma.coPackerPartner.upsert({
    where: { name: "Tabanero Holdings" },
    update: {},
    create: {
      name: "Tabanero Holdings",
      contactName: null,
      email: null,
      phone: null,
      address: null,
      isActive: true,
    },
  });

  console.log("✅ Created/verified 2 co-packer partners");

  console.log("\n🎉 Database seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
