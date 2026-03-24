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

async function finalCheck() {
  const shop = 'grenoa.myshopify.com';
  console.log(`Explicitly checking: file:${dbPath}`);
  
  const regions = await prisma.region.findMany({
    where: { shop }
  });
  console.log(`Regions Found: ${regions.length}`);
  regions.forEach(r => console.log(`- ${r.name} (ID: ${r.id}) [${r.status}]`));
  
  const pincodes = await prisma.pincode.findMany({
    where: { shop }
  });
  console.log(`Pincodes Found: ${pincodes.length}`);
  pincodes.forEach(p => console.log(`- ${p.pincode} (Region: ${p.regionId})`));
  
  await prisma.$disconnect();
}

finalCheck().catch(console.error);
