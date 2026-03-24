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

async function update() {
  await prisma.region.updateMany({
    where: { name: 'Delhi0' },
    data: { priceMultiplier: 1.2 }
  });
  console.log('Region Delhi0 multiplier set to 1.2');
  await prisma.$disconnect();
}

update().catch(console.error);
