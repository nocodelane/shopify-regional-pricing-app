const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const pin = await prisma.pincode.findFirst({
    where: { pincode: '110001' },
    include: { region: { include: { pricingRules: true } } }
  });
  console.log(JSON.stringify(pin, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
