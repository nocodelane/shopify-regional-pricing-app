const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const shop = 'grenoa.myshopify.com';
  const regionId = '6dcc60fe-17ec-40d4-931d-37b40e4ef321'; // Delhi0
  const productIds = [
    'gid://shopify/Product/8171811635334', // Adenium
    'gid://shopify/Product/9081821817134'  // Bird's Nest Fern? (IDs guessed from subagent mention of 81,718 and 90,818)
  ];

  console.log('Faking request for region:', regionId);

  // Check what the DB says for these products
  const rules = await prisma.pricingRule.findMany({
    where: { regionId }
  });

  console.log('Found rules:', JSON.stringify(rules, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
