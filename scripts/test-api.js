const shop = "grenoa.myshopify.com";
const regionId = "0a818a6c-ece1-4568-a13a-cef5277ab4c6"; // Delhi NCR
const productIds = ["gid://shopify/Product/12345678"];

async function test() {
    try {
        const resp = await fetch(`https://ugapp.ngrok.app/apps/regional-sync-api/api/pricing`, {
            method: 'POST',
            body: JSON.stringify({ shop, region: regionId, products: productIds })
        });
        console.log(await resp.json());
    } catch(e) { console.error(e); }
}
// test();
