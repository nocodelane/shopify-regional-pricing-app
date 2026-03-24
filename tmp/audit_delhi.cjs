const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const shop = 'grenoa.myshopify.com';
  const rules = await prisma.pricingRule.findMany({
    where: { regionId: '4fd567fd-03ce-4cdd-b06e-8511a68294fe' }
  });
  console.log('Delhi0 Rules:', JSON.stringify(rules, null, 2));

  // If there's a 2x rule, delete or fix it.
  for (const rule of rules) {
    if (rule.value === 2) {
      console.log('Found 2x rule, deleting...');
      await prisma.pricingRule.delete({ where: { id: rule.id } });
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
