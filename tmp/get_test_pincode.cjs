const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findOneValidPincode() {
  const shop = 'grenoa.myshopify.com';
  console.log(`Searching for any active region and its pincodes for ${shop}...`);
  
  const regions = await prisma.region.findMany({
    where: { shop, status: 'active' },
    include: { pincodes: { take: 1 } }
  });
  
  if (regions.length > 0) {
    const r = regions[0];
    console.log(`Found active region: ${r.name} (ID: ${r.id})`);
    if (r.pincodes.length > 0) {
      console.log(`Valid test pincode: ${r.pincodes[0].pincode}`);
    } else {
      console.log("Region has NO pincodes assigned.");
    }
  } else {
    console.log("No active regions found for this shop.");
    
    // Check all regions regardless of status
    const all = await prisma.region.findMany({ where: { shop } });
    console.log(`Total regions: ${all.length}`);
    all.forEach(r => console.log(`- ${r.id} (${r.name}) [${r.status}]`));
  }
  
  await prisma.$disconnect();
}

findOneValidPincode().catch(console.error);
