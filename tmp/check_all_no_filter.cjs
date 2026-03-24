const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAll() {
  console.log("Listing ALL pincodes in database (no filter)...");
  
  const pins = await prisma.pincode.findMany({
    include: { region: true },
    take: 50
  });
  
  console.log(`Found ${pins.length} pincodes.`);
  pins.forEach(p => {
    console.log(`Pincode: ${p.pincode} | Region: ${p.region?.name} (ID: ${p.regionId}) | Shop: ${p.shop}`);
  });
  
  await prisma.$disconnect();
}

checkAll().catch(console.error);
