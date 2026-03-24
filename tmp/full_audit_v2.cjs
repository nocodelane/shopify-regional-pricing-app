const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rules = await prisma.pricingRule.findMany({
    include: { region: true }
  });
  console.log('ALL RULES:');
  rules.forEach(r => {
    console.log(`Region: ${r.region.name}, Type: ${r.ruleType}, Value: ${r.multiplier}, productId: ${r.productId}`);
  });
  
  const regions = await prisma.region.findMany();
  console.log('\nALL REGIONS:');
  regions.forEach(reg => {
    console.log(`Region: ${reg.name}, Multiplier: ${reg.multiplier}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
