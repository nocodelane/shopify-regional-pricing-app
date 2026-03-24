const { PrismaClient } = require('@prisma/client');
const path = require('path');

const dbPath = path.join(process.cwd(), 'prisma', 'dev.sqlite');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`
    }
  }
});

async function checkPincodes() {
  const shop = 'grenoa.myshopify.com';
  console.log(`Connecting to: file:${dbPath}`);
  
  const pins = await prisma.pincode.findMany({
    where: { shop }
  });
  
  console.log(`Found ${pins.length} pincodes.`);
  pins.forEach(p => console.log(`- ${p.pincode}`));
  
  await prisma.$disconnect();
}

checkPincodes().catch(console.error);
