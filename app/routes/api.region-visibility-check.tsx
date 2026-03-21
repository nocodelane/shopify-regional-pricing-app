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
      prisma.$queryRawUnsafe(`SELECT productHandle FROM ProductRegionRule WHERE shop = ? AND regionId = ? AND allowed = 0`, shop, regionId),
      prisma.$queryRawUnsafe(`SELECT collectionId, collectionHandle FROM CollectionRegionRule WHERE shop = ? AND regionId = ? AND allowed = 0`, shop, regionId)
    ]);

    const productHandles = new Set((deniedProductRules as any[]).map(p => p.productHandle?.trim()?.toLowerCase()).filter(Boolean));
    const collectionHandles = (deniedCollectionRules as any[]).map(c => c.collectionHandle?.trim()?.toLowerCase()).filter(Boolean);
    const deniedCollectionIds = (deniedCollectionRules as any[]).map(c => c.collectionId).filter(Boolean);

    // Fetch product handles inherited from denied collections
    if (deniedCollectionIds.length > 0) {
      const inheritedProductRules = await prisma.$queryRawUnsafe(
        `SELECT productHandle FROM CollectionProductHandle WHERE shop = ? AND collectionId IN (${deniedCollectionIds.map(() => '?').join(',')})`,
        shop,
        ...deniedCollectionIds
      );
      (inheritedProductRules as any[]).forEach(p => {
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
