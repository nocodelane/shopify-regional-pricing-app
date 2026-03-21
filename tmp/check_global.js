const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const allConfigs = await prisma.regionHomepageConfig.findMany({
    include: { region: true }
  });
  console.log('All Configs:', JSON.stringify(allConfigs, null, 2));
  
  const allRegions = await prisma.region.findMany();
  console.log('All Regions:', JSON.stringify(allRegions, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
