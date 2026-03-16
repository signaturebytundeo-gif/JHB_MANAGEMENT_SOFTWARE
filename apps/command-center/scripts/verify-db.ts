import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  try {
    const counts = {
      users: await prisma.user.count(),
      products: await prisma.product.count(),
      locations: await prisma.location.count(),
      salesChannels: await prisma.salesChannel.count(),
      subscriptionPlans: await prisma.subscriptionPlan.count(),
    };
    console.log("Verification counts:", JSON.stringify(counts, null, 2));
    const allNonZero = Object.values(counts).every((v) => v > 0);
    console.log(allNonZero ? "PASS: All counts > 0" : "FAIL: Some counts are 0");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Verification failed:", err.message);
  process.exit(1);
});
