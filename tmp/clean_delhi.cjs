const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const regionId = '4fd567fd-03ce-4cdd-b06e-8511a68294fe'; // CORRECT Delhi0 ID
  
  // 1. Delete all PricingRules for this region
  const deleted = await prisma.pricingRule.deleteMany({
    where: { regionId }
  });
  console.log('Deleted rules for Delhi0:', deleted.count);

  // 2. Ensure the region itself has the correct multiplier
  await prisma.region.update({
    where: { id: regionId },
    data: { priceMultiplier: 1.2 }
  });
  console.log('Updated region Delhi0 to 1.2 multiplier');

  await prisma.$disconnect();
}

main().catch(console.error);
