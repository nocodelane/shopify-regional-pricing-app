import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";

import { authenticate } from "../shopify.server";

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
