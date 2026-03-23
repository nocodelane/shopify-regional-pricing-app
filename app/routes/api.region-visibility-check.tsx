import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { LRUCache } from "lru-cache";
import prisma from "../db.server";

// Module-level cache so it persists across requests (though might reset on dev-server hot reloads)
const visibilityCache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
});

import { authenticate } from "../shopify.server";
import { checkRateLimit } from "../utils/rate-limit.server.js";

export async function loader({ request }: LoaderFunctionArgs) {
  let session;
  try {
    const auth = await authenticate.public.appProxy(request);
    session = auth.session;
  } catch (e: any) {
    console.error("[VisibilityAPI] Auth failed:", e.message);
    return json({ error: "Invalid proxy signature" }, { status: 401 });
  }

  const shop = session?.shop;
  if (!shop) return json({ error: "Unauthorized" }, { status: 401 });

  // Rate Limiting: 120 requests per minute per shop
  if (!checkRateLimit(shop, 120, 60000)) {
    return json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const url = new URL(request.url);
  const regionId = url.searchParams.get("regionId");

  if (!regionId) {
    return json({ error: "Missing regionId parameter" }, { status: 400 });
  }

  try {
    const cacheKey = `visibility_${shop}_${regionId}`;
    if (visibilityCache.has(cacheKey)) {
        return json(visibilityCache.get(cacheKey));
    }

    const [deniedProductRules, deniedCollectionRules] = await Promise.all([
      prisma.productRegionRule.findMany({
        where: { shop, regionId, allowed: false },
        select: { productHandle: true }
      }),
      prisma.collectionRegionRule.findMany({
        where: { shop, regionId, allowed: false },
        select: { collectionId: true, collectionHandle: true }
      })
    ]);

    const productHandles = new Set(deniedProductRules.map(p => p.productHandle?.trim()?.toLowerCase()).filter(Boolean) as string[]);
    const collectionHandles = deniedCollectionRules.map(c => c.collectionHandle?.trim()?.toLowerCase()).filter(Boolean) as string[];
    const deniedCollectionIds = deniedCollectionRules.map(c => c.collectionId).filter(Boolean);

    // Fetch product handles inherited from denied collections
    if (deniedCollectionIds.length > 0) {
      const inheritedProductRules = await prisma.collectionProductHandle.findMany({
        where: {
          shop,
          collectionId: { in: deniedCollectionIds }
        },
        select: { productHandle: true }
      });
      inheritedProductRules.forEach(p => {
          if (p.productHandle) productHandles.add(p.productHandle.trim().toLowerCase());
      });
    }

    const responseData = { 
        deniedProductHandles: Array.from(productHandles),
        deniedCollectionHandles: collectionHandles,
        deniedCollectionIds: deniedCollectionIds
    };

    visibilityCache.set(cacheKey, responseData);

    return json(responseData);

  } catch (error) {
    console.error("Error fetching visibility config:", error);
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
}
