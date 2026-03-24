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

async function addPincode() {
  const shop = 'grenoa.myshopify.com';
  const regionId = '4fd567fd-03ce-4cdd-b06e-8511a68294fe';
  const pincode = '110001';
  
  console.log(`Adding pincode ${pincode} to region ${regionId} for ${shop}`);
  
  try {
    await prisma.pincode.upsert({
      where: {
        shop_pincode: { shop, pincode }
      },
      update: { regionId },
      create: { shop, pincode, regionId }
    });
    console.log("Successfully added/updated pincode.");
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

addPincode().catch(console.error);
