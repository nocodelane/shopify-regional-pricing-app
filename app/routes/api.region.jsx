import { json } from "@remix-run/node";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import { checkRateLimit } from "../utils/rate-limit.server";

export async function loader({ request }) {
  let session;
  try {
    // Use authenticate.public.appProxy to verify the request is genuine.
    const auth = await authenticate.public.appProxy(request);
    session = auth.session;
  } catch (e) {
    console.error("App Proxy Authentication Failed:", e.message);
    return json({ error: "Invalid proxy signature or session" }, { status: 401 });
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || session?.shop;
  const pincode = url.searchParams.get("pincode");

  // Rate Limiting: 60 requests per minute per shop
  if (shop && !checkRateLimit(shop, 60, 60000)) {
    return json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  if (!pincode || !shop) {
    return json({ error: "Missing pincode or shop parameter" }, { status: 400 });
  }

  try {
    // 1. Find directly matching pincode
    let matchedRegion = null;
    
    const matchedPincode = await prisma.pincode.findUnique({
      where: {
        shop_pincode: { shop, pincode },
      },
      include: {
        region: true
      }
    });

    if (matchedPincode && matchedPincode.region.status === "active") {
      matchedRegion = matchedPincode.region;
    }

    // 2. If no direct match, check ranges
    if (!matchedRegion) {
        const pincodeInt = parseInt(pincode, 10);
        if (!isNaN(pincodeInt)) {
            const matchedRange = await prisma.pincodeRange.findFirst({
                where: {
                    shop,
                    start: { lte: pincodeInt },
                    end: { gte: pincodeInt }
                },
                include: { region: true }
            });

            if (matchedRange && matchedRange.region.status === "active") {
                matchedRegion = matchedRange.region;
            }
        }
    }

    if (matchedRegion) {
      // 3. A/B Testing Variant Assignment
      let variant = "A";
      const activeTest = await prisma.aBTest.findFirst({
        where: { shop, regionId: matchedRegion.id, status: 'active' }
      });
      if (activeTest) {
        variant = Math.random() > 0.5 ? "B" : "A";
      }

      // Log search (Async)
      prisma.pincodeSearch.create({
        data: { shop, pincode, matched: true, regionId: matchedRegion.id }
      }).catch(e => console.error("Search log error:", e));

      return json({
        matched: true,
        region: matchedRegion.name,
        regionId: matchedRegion.id,
        variant,
        priceMultiplier: matchedRegion.priceMultiplier,
        message: "Pincode matched successfully!"
      }, { status: 200 });
    }

    // Log search (Async)
    prisma.pincodeSearch.create({
      data: { shop, pincode, matched: false }
    }).catch(e => console.error("Search log error:", e));

    // 2. If no match, return a default/fallback state
    return json({
      region: "default",
      regionId: null,
      priceMultiplier: 1.0,
      message: "Delivery not available in this area yet."
    }, { status: 200 });

  } catch (error) {
    console.error("Critical Error in Region API:", error);
    return json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
