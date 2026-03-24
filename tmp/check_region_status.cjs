const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRegion() {
  const shop = 'grenoa.myshopify.com';
  const regionId = '6dcc60fe-17ec-40d4-931d-37b40e4ef321';
  
  console.log(`Checking Region ${regionId} for shop ${shop}...`);
  
  const region = await prisma.region.findUnique({
    where: { id: regionId, shop }
  });
  
  if (region) {
    console.log("Region Found:", JSON.stringify(region, null, 2));
  } else {
    console.log("Region NOT Found in database.");
    
    // List all regions for this shop to see what's available
    const allRegions = await prisma.region.findMany({
      where: { shop }
    });
    console.log(`Total regions for ${shop}: ${allRegions.length}`);
    allRegions.forEach(r => console.log(`- ${r.id} (${r.name}) [${r.status}]`));
  }
  
  await prisma.$disconnect();
}

checkRegion().catch(console.error);
