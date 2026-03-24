const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAll() {
  const shop = 'grenoa.myshopify.com';
  console.log(`Checking all pincodes for shop: ${shop}`);
  
  const pins = await prisma.pincode.findMany({
    where: { shop },
    include: { region: true },
    take: 20
  });
  
  console.log(`Found ${pins.length} pincodes.`);
  pins.forEach(p => {
    console.log(`Pincode: ${p.pincode} | Region: ${p.region?.name} (ID: ${p.regionId})`);
  });
  
  await prisma.$disconnect();
}

checkAll().catch(console.error);
