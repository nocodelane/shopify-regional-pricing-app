import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";

import { authenticate } from "../shopify.server";
import { checkRateLimit } from "../utils/rate-limit.server.js";

export async function action({ request }: ActionFunctionArgs) {
  let session;
  try {
    const auth = await authenticate.public.appProxy(request);
    session = auth.session;
  } catch (e: any) {
    console.error("[WaitlistAPI] Auth failed:", e.message);
    return json({ error: "Invalid proxy signature" }, { status: 401 });
  }

  const shop = session?.shop;
  if (!shop) return json({ error: "Unauthorized" }, { status: 401 });

  // Rate Limiting: 5 requests per minute per shop for waitlist
  if (!checkRateLimit(shop, 5, 60000)) {
    return json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  try {
    const { email, pincode } = await request.json();

    if (!email || !pincode) {
      return json({ error: "Missing required fields" }, { status: 400 });
    }

    await (prisma as any).waitlistEntry.create({
      data: {
        shop,
        email,
        pincode,
      },
    });

    return json({ success: true, message: "Added to waitlist!" });
  } catch (error) {
    console.error("Waitlist error:", error);
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
}
