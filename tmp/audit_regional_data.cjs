
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditData(shop) {
  console.log(`Auditing data for shop: ${shop}`);
  try {
    const regions = await prisma.region.findMany({ where: { shop } });
    console.log(`Found ${regions.length} regions.`);
    regions.forEach(r => {
        console.log(`Region: ${r.name} (${r.id}), Multiplier: ${r.priceMultiplier}`);
        if (r.priceMultiplier > 10 || r.priceMultiplier < 0.1) {
            console.warn(`!!! ABNORMAL MULTIPLIER in ${r.name}: ${r.priceMultiplier}`);
        }
    });

    const configs = await prisma.regionHomepageConfig.findMany({ where: { shop } });
    console.log(`Found ${configs.length} configs.`);
    configs.forEach(c => {
        console.log(`Config ${c.id}: regionId=${c.regionId}, sectionsOrder Length=${c.sectionsOrder.length}`);
        try {
            const parsed = JSON.parse(c.sectionsOrder);
            if (Array.isArray(parsed)) {
                parsed.forEach(s => {
                    if (s.settings) {
                        const dr = s.settings.desktopAspectRatio;
                        const mr = s.settings.mobileAspectRatio;
                        if (dr && !dr.includes('/')) console.warn(`! Invalid Desktop Ratio in ${c.id}: ${dr}`);
                        if (mr && !mr.includes('/')) console.warn(`! Invalid Mobile Ratio in ${c.id}: ${mr}`);
                    }
                });
            }
        } catch(e) { console.error(`Failed to parse config ${c.id}:`, e.message); }
    });

  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}

auditData('grenoa.myshopify.com');
