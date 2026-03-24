const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rules = await prisma.pricingRule.findMany({
    where: { value: 182 },
    include: { region: true }
  });
  console.log('RULES WITH 182:', JSON.stringify(rules, null, 2));

  const regions = await prisma.region.findMany({
    where: { priceMultiplier: 182 }
  });
  console.log('REGIONS WITH 182:', JSON.stringify(regions, null, 2));
  
  await prisma.$disconnect();
}

main().catch(console.error);
