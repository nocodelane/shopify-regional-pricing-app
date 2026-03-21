const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const count = await prisma.pincodeSearch.count();
    console.log("PincodeSearch exists and has", count, "rows.");
  } catch (e) {
    console.error("PincodeSearch table check failed:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
