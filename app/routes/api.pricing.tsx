import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { LRUCache } from "lru-cache";
import prisma from "../db.server";

import { authenticate } from "../shopify.server";

const pricingCache = new LRUCache<string, any>({
  max: 1000,
  ttl: 1000 * 60 * 5, // 5 mins
});

export async function action({ request }: ActionFunctionArgs) {
  let session;
  try {
    const auth = await authenticate.public.appProxy(request);
    session = auth.session;
  } catch (e: any) {
    console.error("App Proxy Authentication Failed in Pricing API:", e.message);
    return json({ error: "Invalid proxy signature" }, { status: 401 });
  }

  const shop = session?.shop;

  try {
    const { region: regionId, products: productIds } = await request.json();

    if (!regionId || !shop || !Array.isArray(productIds)) {
        return json({ error: "Invalid request body parameters" }, { status: 400 });
    }

    // Try finding it in cache first, excluding AB tests (variant changes logic)
    const variant = request.headers.get("x-pincode-variant") || "A";
    const cacheKey = `pricing_${shop}_${regionId}_${variant}_${productIds.slice().sort().join(',')}`;
    
    if (pricingCache.has(cacheKey)) {
        return json(pricingCache.get(cacheKey));
    }

    const config = await prisma.appConfig.findUnique({
      where: { shop }
    });
    
    const isPricingActive = config ? !!config.regionalPricingActive : true;
    const isVisibilityActive = config ? !!config.visibilityRulesActive : true;
    const isABActive = config ? !!config.abTestingActive : false;

    if (!isPricingActive && !isVisibilityActive) {
        return json({ regionId, productPricing: {} });
    }

    const now = new Date();
    const region = await prisma.region.findUnique({
      where: { id: regionId, shop },
      include: { 
        productRules: isVisibilityActive ? true : false, 
        tagRules: isVisibilityActive ? true : false,
        pricingRules: isPricingActive ? {
          where: {
            OR: [
              { startTime: null },
              { startTime: { lte: now }, endTime: { gte: now } }
            ]
          } as any,
          orderBy: { priority: 'desc' } as any
        } : false
      } as any
    });

    if (!region || (region as any).status !== "active") {
        return json({ error: "Region not found or inactive" }, { status: 404 });
    }

    const reg = region as any;
    let baseMultiplier = region.priceMultiplier || 1.0;

    // A/B Testing
    let activeTest = null;

    if (isABActive) {
        const activeTests = await prisma.$queryRaw`SELECT * FROM ABTest WHERE shop = ${shop} AND regionId = ${regionId} AND status = 'active' LIMIT 1` as any[];
        activeTest = activeTests[0];
        if (activeTest) {
            // Log views for variant A/B
            if (variant === "B") {
                prisma.$executeRaw`UPDATE ABTest SET resultsVariant = resultsVariant + 1 WHERE id = ${activeTest.id}`.catch(() => {});
            } else {
                prisma.$executeRaw`UPDATE ABTest SET resultsControl = resultsControl + 1 WHERE id = ${activeTest.id}`.catch(() => {});
            }
        }
    }

    const productCaches = await (prisma as any).productCache.findMany({
        where: { id: { in: productIds }, shop }
    });

    const productPricing: Record<string, any> = {};
    const appConfig = await prisma.appConfig.findUnique({ where: { shop } }) as any;
    const allowAbsurdPricing = appConfig?.allowAbsurdPricing || false;

    for (const productId of productIds) {
        const cache = productCaches.find((p: any) => p.id === productId);
        const tags = cache?.tags ? cache.tags.split(",").map((t: any) => t.trim().toLowerCase()) : [];
        const collections = cache?.collections ? JSON.parse(cache.collections) : [];

        // Visibility
        if (isVisibilityActive) {
            const prodRule = (reg.productRules || []).find((r: any) => r.productId === productId);
            if (prodRule && !prodRule.allowed) {
                productPricing[productId] = { allowed: false };
                continue;
            }

            // A/B Visibility Override
            if (activeTest && activeTest.type === 'VISIBILITY' && variant === 'B') {
                const config = activeTest.config ? JSON.parse(activeTest.config) : {};
                if (config.targetType === 'product' && productId === config.targetId) {
                    productPricing[productId] = { allowed: false };
                    continue;
                }
                if (config.targetType === 'collection' && collections.includes(config.targetId)) {
                    productPricing[productId] = { allowed: false };
                    continue;
                }
            }
        }

        // Pricing
        let multiplier = baseMultiplier;
        let ruleType = "percentage";

        // 1. A/B Testing Overrides (Lower priority than manual rules)
        if (activeTest && activeTest.type === 'PRICING') {
            const config = activeTest.config ? JSON.parse(activeTest.config) : {};
            const isTargetMatched = !config.targetType || config.targetType === 'global' || 
                (config.targetType === 'product' && productId === config.targetId) ||
                (config.targetType === 'collection' && collections.includes(config.targetId));

            if (isTargetMatched) {
                if (variant === "B") multiplier = activeTest.variantMultiplier;
                else multiplier = activeTest.controlMultiplier;
                ruleType = "ab_test";
            }
        }

        // 2. Manual Pricing Rules (Higher priority)
        if (isPricingActive) {
            const extractNumeric = (id: string) => id.includes('/') ? id.split('/').pop() : id;
            const targetNumericId = extractNumeric(productId);

            const productRule = (reg.pricingRules || []).find((r: any) => r.productId && extractNumeric(r.productId) === targetNumericId);
            const collectionRule = (reg.pricingRules || []).find((r: any) => r.collectionId && collections.some((cId: string) => extractNumeric(cId) === extractNumeric(r.collectionId!)));
            const globalRule = (reg.pricingRules || []).find((r: any) => !r.productId && !r.collectionId);

            const applicableRule = productRule || collectionRule || globalRule;
            if (applicableRule) {
                multiplier = applicableRule.value;
                ruleType = applicableRule.type;
            }
        }

        productPricing[productId] = {
            allowed: true,
            multiplier: isPricingActive ? multiplier : 1.0,
            ruleType
        };
    }

    const responseData = { productPricing, allowAbsurdPricing };
    pricingCache.set(cacheKey, responseData);

    return json(responseData);
  } catch (error) {
    console.error("Error processing pricing request:", error);
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
}
