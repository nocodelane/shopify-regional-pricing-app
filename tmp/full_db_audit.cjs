const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const regions = await prisma.region.findMany({
    include: { pricingRules: true }
  });
  console.log("REGIONS AND RULES:");
  console.log(JSON.stringify(regions, null, 2));
  
  const config = await prisma.appConfig.findMany();
  console.log("APP CONFIGS:");
  console.log(JSON.stringify(config, null, 2));

  await prisma.$disconnect();
}
main().catch(console.error);
