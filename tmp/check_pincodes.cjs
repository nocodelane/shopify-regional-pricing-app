const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPincodes() {
  const shop = 'grenoa.myshopify.com';
  const regionId = '11a68294fe'; // Delhi0
  
  console.log(`Checking pincodes for region ${regionId} on shop ${shop}`);
  
  const region = await prisma.region.findUnique({
    where: { id: regionId, shop },
    include: { pincodes: true }
  });
  
  if (region) {
    console.log(`Region found: ${region.name}. Total pincodes: ${region.pincodes.length}`);
    region.pincodes.slice(0, 10).forEach(p => console.log(`- ${p.pincode}`));
  } else {
    console.log("Region not found.");
  }
  
  await prisma.$disconnect();
}

checkPincodes().catch(console.error);
