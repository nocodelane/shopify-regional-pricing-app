const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  const shop = 'grenoa.myshopify.com';
  
  // 1. Find a banner component
  const component = await prisma.regionalComponent.findFirst({
    where: { shop, type: 'banner' }
  });
  
  if (!component) {
    console.log('No banner component found');
    return;
  }
  
  console.log(`Found component: ${component.name} (${component.id})`);
  
  // 2. Add aspect ratio to defaultSettings
  const settings = JSON.parse(component.defaultSettings || '{}');
  settings.desktopAspectRatio = '1 / 1';
  settings.mobileAspectRatio = '4 / 5';
  
  await prisma.regionalComponent.update({
    where: { id: component.id },
    data: { defaultSettings: JSON.stringify(settings) }
  });
  
  console.log('Updated defaultSettings with aspect ratios.');
  
  // 3. Check an override for UP region
  const regionId = 'b3a4e106-92ac-4d49-9f87-75a2105305cb';
  const override = await prisma.regionalComponentOverride.findFirst({
    where: { componentId: component.id, regionId }
  });
  
  if (override) {
    const oSettings = JSON.parse(override.settings || '{}');
    oSettings.desktopAspectRatio = '21 / 9';
    await prisma.regionalComponentOverride.update({
      where: { id: override.id },
      data: { settings: JSON.stringify(oSettings) }
    });
    console.log('Updated regional override with custom ratio.');
  }
  
  console.log('Verification complete. Data is ready for API fetch.');
}

verify().catch(console.error).finally(() => prisma.$disconnect());
