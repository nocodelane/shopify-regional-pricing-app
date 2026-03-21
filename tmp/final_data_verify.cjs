const fetch = require('node-fetch');

async function verify() {
  const shop = 'grenoa.myshopify.com';
  const regions = [
    { name: 'Del', id: '6dcc60fe-17ec-40d4-931d-37b40e4ef321' },
    { name: 'UP', id: 'b3a4e106-92ac-4d49-9f87-75a2105305cb' }
  ];

  for (const region of regions) {
    console.log(`Verifying API for region: ${region.name} (${region.id})`);
    try {
      // Note: We use the local port if possible, but here we'll try to hit the app proxy URL if we can 
      // or just simulate the loader call if we had a way.
      // Since I can't easily hit the live proxy from here without auth, 
      // I will instead run a script that imports the loader and calls it directly!
      console.log('Simulating loader call...');
    } catch (e) {
      console.error(`Failed for ${region.name}:`, e.message);
    }
  }
}

// Instead of fetch, let's just use Prisma to verify the data is what the loader would return.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  const shop = 'grenoa.myshopify.com';
  
  // 1. Check Global Config
  const globalConfig = await prisma.regionHomepageConfig.findFirst({
    where: { shop, regionId: null }
  });
  console.log('Global Config found:', !!globalConfig);
  if (globalConfig) console.log('Global Layout:', globalConfig.sectionsOrder);

  // 2. Check UP Region Overrides
  const upOverrides = await prisma.regionalComponentOverride.findMany({
    where: { regionId: 'b3a4e106-92ac-4d49-9f87-75a2105305cb' }
  });
  console.log('UP Overrides found:', upOverrides.length);
  upOverrides.forEach(o => console.log(`Override settings: ${o.settings}`));

  // 3. Confirm Del Region Config
  const delConfig = await prisma.regionHomepageConfig.findFirst({
    where: { regionId: '6dcc60fe-17ec-40d4-931d-37b40e4ef321' }
  });
  console.log('Del Config found:', !!delConfig);
}

checkData().catch(console.error).finally(() => prisma.$disconnect());
