const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const shop = 'grenoa.myshopify.com';
  // We can't easily hit the admin API from a script without a session token.
  // But we can check if there are any PricingRules or something that might interfere.
  
  const rules = await prisma.pricingRule.findMany({ where: { shop } });
  console.log("Pricing Rules count:", rules.length);
  
  await prisma.$disconnect();
}

check().catch(console.error);
