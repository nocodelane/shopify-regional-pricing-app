const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.pricingRule.deleteMany({
    where: {
      OR: [
        { value: 6 },
        { value: 10 }
      ]
    }
  });
  console.log(`DELETED ${result.count} stray rules.`);
  await prisma.$disconnect();
}
main().catch(console.error);
