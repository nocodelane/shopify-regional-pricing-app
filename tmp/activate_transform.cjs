const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const shop = 'grenoa.myshopify.com';
  const session = await prisma.session.findFirst({
    where: { shop }
  });

  if (!session) {
    console.error('No session found for shop:', shop);
    return;
  }

  // UPDATED WITH CORRECT ID FROM tmp/functions.json
  const functionId = "019d1c02-7f27-7d6f-bc73-c4de19fb1828";
  
  const query = `
    mutation cartTransformCreate($functionId: String!) {
      cartTransformCreate(functionId: $functionId) {
        cartTransform { id functionId }
        userErrors { field message }
      }
    }
  `;

  const response = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': session.accessToken
    },
    body: JSON.stringify({
      query,
      variables: { functionId }
    })
  });

  const data = await response.json();
  console.log('Activation Response:', JSON.stringify(data.data.cartTransformCreate, null, 2));
  
  await prisma.$disconnect();
}

main().catch(console.error);
