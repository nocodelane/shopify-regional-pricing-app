const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addTestPincode() {
  const shop = 'grenoa.myshopify.com';
  const regionId = '11a68294fe'; // Delhi0
  const testPincode = '110001';
  
  console.log(`Adding test pincode ${testPincode} to region ${regionId} for ${shop}`);
  
  try {
    const existing = await prisma.pincode.findFirst({
      where: { pincode: testPincode, regionId }
    });
    
    if (existing) {
      console.log("Pincode already exists.");
    } else {
      await prisma.pincode.create({
        data: {
          pincode: testPincode,
          regionId: regionId,
          shop: shop
        }
      });
      console.log("Successfully added test pincode.");
    }
  } catch (e) {
    console.error("Error adding pincode:", e);
  } finally {
    await prisma.$disconnect();
  }
}

addTestPincode().catch(console.error);
