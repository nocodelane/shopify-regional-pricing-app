const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function init() {
  const shop = 'grenoa.myshopify.com';
  
  // 1. Find the banner component
  const banner = await prisma.regionalComponent.findFirst({
    where: { shop, type: 'banner' }
  });
  
  if (!banner) {
    console.log('No banner component found. Please create one in the Studio first.');
    return;
  }
  
  // 2. Create Global Layout if it doesn't exist
  const globalConfig = await prisma.regionHomepageConfig.findFirst({
    where: { shop, regionId: null }
  });
  
  const layout = JSON.stringify([{ id: banner.id, type: 'banner' }]);
  
  if (globalConfig) {
    console.log('Updating existing Global Layout...');
    await prisma.regionHomepageConfig.update({
      where: { id: globalConfig.id },
      data: { sectionsOrder: layout }
    });
  } else {
    console.log('Creating new Global Layout...');
    await prisma.regionHomepageConfig.create({
      data: {
        shop,
        regionId: null,
        sectionsOrder: layout,
        placementHeight: '400px'
      }
    });
  }
  
  // 3. Ensure "UP" region also works if fallback fails for some reason
  const upRegion = await prisma.region.findFirst({ where: { shop, name: 'UP' } });
  if (upRegion) {
      console.log('UP Region found:', upRegion.id);
  }
  
  console.log('Global Layout initialized successfully.');
}

init().catch(console.error).finally(() => prisma.$disconnect());
