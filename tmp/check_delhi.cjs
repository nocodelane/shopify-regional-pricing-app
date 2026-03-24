const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const shop = 'grenoa.myshopify.com';
  const delhi = await prisma.region.findFirst({
    where: { name: 'Delhi', shop },
    include: { pricingRules: true }
  });

  console.log('Delhi Region:', JSON.stringify(delhi, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
