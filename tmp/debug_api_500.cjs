
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRegion(regionId, shop) {
  console.log(`Checking region: ${regionId} for shop: ${shop}`);
  try {
    const config = await prisma.regionHomepageConfig.findFirst({
      where: {
        shop: shop,
        OR: [
          { regionId: regionId },
          { regionId: null }
        ]
      },
      orderBy: {
        regionId: 'desc' // specific first, then null
      }
    });
    console.log('Found Config:', JSON.stringify(config, null, 2));
    
    if (config && config.sectionsOrder) {
        console.log('SectionsOrder Length:', config.sectionsOrder.length);
        const sections = typeof config.sectionsOrder === 'string' ? JSON.parse(config.sectionsOrder) : config.sectionsOrder;
        console.log('Parsed Sections Count:', sections.length);
    }
  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}

// Test the failing UUID from subagent
checkRegion('b3a4e106-92ac-4d49-9f87-75a2105305cb', 'grenoa.myshopify.com');
