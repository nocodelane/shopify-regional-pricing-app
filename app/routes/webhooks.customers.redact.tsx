import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  if (payload.customer && payload.customer.email) {
    try {
      await db.waitlistEntry.deleteMany({
        where: {
          shop,
          email: payload.customer.email
        }
      });
    } catch (error) {
      console.error(`Error redacting customer in ${shop}:`, error);
    }
  }
  
  return new Response();
};
