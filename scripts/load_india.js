
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const INDIA_REGIONS = [
  { name: "Andaman and Nicobar Islands", ranges: ["744101-744304"] },
  { name: "Andhra Pradesh", ranges: ["515001-535548"] },
  { name: "Arunachal Pradesh", ranges: ["790001-792131"] },
  { name: "Assam", ranges: ["781001-788806"] },
  { name: "Bihar", ranges: ["800001-855117"] },
  { name: "Chandigarh", ranges: ["160001-160062"] },
  { name: "Chhattisgarh", ranges: ["490001-497778"] },
  { name: "Dadra and Nagar Haveli and Daman and Diu", ranges: ["396191-396240"] },
  { name: "Delhi", ranges: ["110001-110098"] },
  { name: "Goa", ranges: ["403001-403806"] },
  { name: "Gujarat", ranges: ["360001-396590"] },
  { name: "Haryana", ranges: ["121001-136156"] },
  { name: "Himachal Pradesh", ranges: ["171001-177605"] },
  { name: "Jammu and Kashmir", ranges: ["180001-193504"] },
  { name: "Jharkhand", ranges: ["814101-835325"] },
  { name: "Karnataka", ranges: ["560001-587313"] },
  { name: "Kerala", ranges: ["670001-695615"] },
  { name: "Ladakh", ranges: ["194101-194404"] },
  { name: "Lakshadweep", ranges: ["682551-682559"] },
  { name: "Madhya Pradesh", ranges: ["450001-488448"] },
  { name: "Maharashtra", ranges: ["400001-402999", "404000-445501"] }, // Excluded Goa (403)
  { name: "Manipur", ranges: ["795001-795159"] },
  { name: "Meghalaya", ranges: ["793001-794115"] },
  { name: "Mizoram", ranges: ["796001-796901"] },
  { name: "Nagaland", ranges: ["797001-798627"] },
  { name: "Odisha", ranges: ["751001-770076"] },
  { name: "Puducherry", ranges: ["605001-605014", "607101-607110", "608001-608003", "609601-609609"] },
  { name: "Punjab", ranges: ["140001-159999", "160063-160067"] }, // Excluded Chandigarh (160001-160062)
  { name: "Rajasthan", ranges: ["301001-345034"] },
  { name: "Sikkim", ranges: ["737101-737139"] },
  { name: "Tamil Nadu", ranges: ["600001-604999", "605015-607100", "607111-607999", "608004-609600", "609610-643253"] }, // Excluded Puducherry
  { name: "Telangana", ranges: ["500001-509412"] },
  { name: "Tripura", ranges: ["799001-799290"] },
  { name: "Uttar Pradesh", ranges: ["201001-285223"] },
  { name: "Uttarakhand", ranges: ["242001-263680"] },
  { name: "West Bengal", ranges: ["700001-737100", "737140-743711", "744305-744310"] }
];

async function main() {
  const shop = "grenoa.myshopify.com";
  console.log(`Starting to load ${INDIA_REGIONS.length} refined regions for ${shop}...`);

  for (const regionData of INDIA_REGIONS) {
    try {
      const region = await prisma.region.upsert({
        where: { shop_name: { shop, name: regionData.name } },
        update: { status: "active" },
        create: { shop, name: regionData.name, status: "active", priceMultiplier: 1.0 }
      });

      console.log(`Region: ${region.name} (${region.id})`);

      // Clear existing ranges for this region
      await prisma.pincodeRange.deleteMany({ where: { regionId: region.id } });

      for (const r of regionData.ranges) {
        const [start, end] = r.split("-").map(p => parseInt(p.trim()));
        await prisma.pincodeRange.create({
          data: { shop, start, end, regionId: region.id }
        });
        console.log(`  Added refined range: ${start}-${end}`);
      }
    } catch (err) {
      console.error(`  Error for ${regionData.name}: ${err.message}`);
    }
  }

  console.log("Done!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
