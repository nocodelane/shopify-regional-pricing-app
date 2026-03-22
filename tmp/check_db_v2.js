
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Checking ModalConfig...");
    try {
        const configs = await prisma.modalConfig.findMany();
        console.log("Total configs:", configs.length);
        if (configs.length > 0) {
            console.log("First config sample:", JSON.stringify(configs[0], null, 2));
        }
        
        console.log("\nChecking AppConfig...");
        const appConfigs = await prisma.appConfig.findMany();
        console.log("Total appConfigs:", appConfigs.length);

    } catch (e) {
        console.error("DB Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
