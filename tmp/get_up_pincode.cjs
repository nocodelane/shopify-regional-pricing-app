const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const pincodes = await prisma.pincode.findMany({
    where: { region: { name: 'UP' } }
  });
  console.log('UP Pincodes:', JSON.stringify(pincodes, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
