const { PrismaClient } = require('@prisma/client');
const path = require('path');

const dbPath = path.join(process.cwd(), 'prisma', 'dev.sqlite');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`
    }
  }
});

async function main() {
  const rules = await prisma.pricingRule.findMany({
    where: { 
      OR: [
        { value: 6 },
        { value: { gt: 1.5 } } // Check for any high multipliers
      ]
    }
  });
  console.log("SUSPICIOUS RULES:");
  console.log(JSON.stringify(rules, null, 2));

  const regions = await prisma.region.findMany({
    where: { 
      OR: [
        { priceMultiplier: 6 },
        { priceMultiplier: { gt: 1.5 } }
      ]
    }
  });
  console.log("SUSPICIOUS REGIONS:");
  console.log(JSON.stringify(regions, null, 2));

  await prisma.$disconnect();
}
main().catch(console.error);
