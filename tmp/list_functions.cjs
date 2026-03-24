const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  const shop = 'grenoa.myshopify.com';
  const session = await prisma.session.findFirst({
    where: { shop }
  });

  if (!session) {
    console.error('No session found for shop:', shop);
    return;
  }

  const query = `
    query {
      shopifyFunctions(first: 20) {
        nodes {
          id
          title
          apiType
        }
      }
    }
  `;

  const response = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': session.accessToken
    },
    body: JSON.stringify({ query })
  });

  const data = await response.json();
  fs.writeFileSync('tmp/functions.json', JSON.stringify(data.data.shopifyFunctions.nodes, null, 2));
  console.log('Saved to tmp/functions.json');
  
  await prisma.$disconnect();
}

main().catch(console.error);
