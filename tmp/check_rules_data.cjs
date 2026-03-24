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

async function check() {
  const rules = await prisma.pricingRule.findMany();
  console.log(JSON.stringify(rules, null, 2));
  await prisma.$disconnect();
}

check().catch(console.error);
