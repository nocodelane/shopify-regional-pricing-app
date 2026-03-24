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

async function run() {
  const shop = 'grenoa.myshopify.com';
  const regionId = '11a68294fe';
  const pincode = '110001';
  
  console.log(`Explicitly connecting to: file:${dbPath}`);
  
  try {
    const p = await prisma.pincode.create({
      data: {
        shop,
        pincode,
        regionId
      }
    });
    console.log("Successfully Created:", JSON.stringify(p));
  } catch (e) {
    console.log("Creation FAILED!");
    console.log("Error Code:", e.code);
    console.log("Error Meta:", JSON.stringify(e.meta));
    console.log("Full Error Message:", e.message);
    
    // Check if it exists now
    const existing = await prisma.pincode.findFirst({
        where: { shop, pincode }
    });
    console.log("Existing Record:", JSON.stringify(existing));
  }
  
  await prisma.$disconnect();
}

run().catch(console.error);
