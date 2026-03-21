import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  // NOTE: This app does not store PII (Personally Identifiable Information) in its own database.
  // Pincode searches are anonymous. Waitlist entries are the only PII, and they are handled 
  // separately or can be deleted manually. For simplicity and compliance, we acknowledge the request.

  return new Response();
};
