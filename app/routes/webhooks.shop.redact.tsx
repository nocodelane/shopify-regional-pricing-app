import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  // When a shop is redacted, we should ideally delete all data associated with it.
  // Note: app/uninstalled usually handles session deletion, but shop/redact is for data cleanup.
  
  try {
    // Delete regions (which cascades to pincodes, pricing rules, etc.)
    await db.region.deleteMany({ where: { shop } });
    await db.appConfig.deleteMany({ where: { shop } });
    await db.modalConfig.deleteMany({ where: { shop } });
    await db.pincodeSearch.deleteMany({ where: { shop } });
    await db.waitlistEntry.deleteMany({ where: { shop } });
  } catch (error) {
    console.error(`Error redacting shop ${shop}:`, error);
  }

  return new Response();
};
