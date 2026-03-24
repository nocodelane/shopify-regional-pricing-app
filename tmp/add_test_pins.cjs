const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const shop = 'grenoa.myshopify.com';
  
  // 1. Find UP and WB regions
  const up = await prisma.region.findFirst({ where: { name: 'Uttar Pradesh', shop } });
  const wb = await prisma.region.findFirst({ where: { name: 'West Bengal', shop } });

  if (up) {
    await prisma.pincode.upsert({
      where: { shop_pincode: { shop, pincode: '201001' } },
      update: { regionId: up.id },
      create: { shop, pincode: '201001', regionId: up.id }
    });
    console.log('Added 201001 to UP');
  }

  if (wb) {
    await prisma.pincode.upsert({
      where: { shop_pincode: { shop, pincode: '700001' } },
      update: { regionId: wb.id },
      create: { shop, pincode: '700001', regionId: wb.id }
    });
    console.log('Added 700001 to WB');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
