import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { LRUCache } from "lru-cache";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import { checkRateLimit } from "../utils/rate-limit.server";

const configCache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * 60 * 10, // 10 mins
});

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const regionId = url.searchParams.get("region");

  let session;
  try {
    const auth = await authenticate.public.appProxy(request);
    session = auth.session;
  } catch (e: any) {
    console.error("[ConfigAPI] Authentication Failed:", e.message);
    return json({ error: "Invalid proxy signature" }, { status: 401 });
  }

  const shop = session?.shop;
  
  if (!shop) {
    return json({ error: "Shop unauthorized" }, { status: 401 });
  }

  // Rate Limiting: 120 requests per minute per shop
  if (!checkRateLimit(shop, 120, 60000)) {
    return json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  if (!regionId) { // Only check for regionId here, as shop is already validated
    return json({ error: "Missing region parameter" }, { status: 400 });
  }

  // Check Cache
  const cacheKey = `${shop}_${regionId}`;
  if (configCache.has(cacheKey)) {
      return json(configCache.get(cacheKey), {
          headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" }
      });
  }

  try {
    const region = await prisma.region.findUnique({
      where: { id: regionId },
      include: {
        homepageConfigs: true,
        pricingRules: true
      }
    });

    if (!region) {
        return json({ error: "Region not found" }, { status: 404 });
    }

    if (region.shop !== shop || region.status !== "active") {
      return json({ error: "Region access denied or inactive" }, { status: 404 });
    }

    // 3. Simple, non-ordered query to avoid SQLite UUID ordering issues
    const configs = await prisma.regionHomepageConfig.findMany({
      where: {
        shop,
        OR: [
          { regionId: regionId || undefined },
          { regionId: null as any }
        ]
      }
    });

    // 4. Manually prioritize specific region over global
    const config = (configs.find(c => c.regionId === regionId) || configs.find(c => c.regionId === null)) as any;
    
    const rules = region.pricingRules || [];

    const safeJSONParse = (val: any, fallback = "[]") => {
        if (!val || val === "undefined" || val === "null") return JSON.parse(fallback);
        try {
            return typeof val === 'string' ? JSON.parse(val) : val;
        } catch (e) {
            console.error("JSON parse error in API:", val, e);
            return JSON.parse(fallback);
        }
    };

    const sectionsData = safeJSONParse(config?.sectionsOrder, "[]");
    
    // Fetch ALL components for this shop to hydrate the sections
    const shopComponents = await prisma.regionalComponent.findMany({
        where: { shop: shop },
        include: { overrides: { where: { regionId: regionId } } }
    });

    const safeSections = Array.isArray(sectionsData) ? sectionsData : (sectionsData.sections || []);
    const hydratedSections = safeSections.map((s: any) => {
        const comp = shopComponents.find(c => c.id === s.id);
        if (!comp) return s;

        const defaultSettings = safeJSONParse(comp.defaultSettings, "{}");
        const overrideSettings = comp.overrides[0] ? safeJSONParse(comp.overrides[0].settings, "{}") : {};
        
        return {
            ...s,
            settings: {
                ...defaultSettings,
                ...overrideSettings
            }
        };
    });
    
    let sections = hydratedSections;
    let hiddenSelectors = (config as any)?.hiddenSelectors || "";
    let showOnlySelectors = (config as any)?.showOnlySelectors || "";
    let placementHeight = (config as any)?.placementHeight || "400px";
    let placementType = "banner";

    const settingsFromConfig = config ? safeJSONParse((config as any).sectionsOrder, "{}") : {};

    // Ensure settings have defaults for storefront
    const finalSettings: any = {
        showHeading: settingsFromConfig && (settingsFromConfig as any).showHeading !== false,
        customHeading: settingsFromConfig && (settingsFromConfig as any).customHeading || "",
        showCollections: settingsFromConfig && (settingsFromConfig as any).showCollections !== false,
        ...settingsFromConfig
    };

    const variant = request.headers.get("x-pincode-variant") || "A";
    let template = region.homepageTemplate;

    const abTest = await prisma.aBTest.findFirst({
      where: { shop, regionId, status: 'active', type: 'LAYOUT' }
    });

    if (abTest && variant === 'B') {
        try {
            const abConfig = (abTest.config && abTest.config !== "null") ? JSON.parse(abTest.config) : {};
            if (abConfig && abConfig.variantTemplate) {
                template = abConfig.variantTemplate;
            }
        } catch(e) { console.error("AB Test parse error:", e); }
    }

    const allConfigs = await prisma.regionHomepageConfig.findMany({
      where: { shop },
      select: { sectionsOrder: true }
    });
    
    const allExclusiveSelectors = Array.from(new Set(allConfigs.flatMap((c: any) => {
        const d = safeJSONParse(c.sectionsOrder, "{}");
        if (Array.isArray(d)) return [];
        const selectors = (d && typeof d === 'object' && d.showOnlySelectors) ? d.showOnlySelectors.split(',').map((s: string) => s.trim()) : [];
        return selectors;
    }))).filter(s => s && typeof s === 'string');

    const responseData = {
      region: region.name,
      homepage: {
        template,
        settings: finalSettings,
        sections: (sections || []).map((s: any) => {
            if (s && s.type === 'banner') {
                return {
                    ...s,
                    settings: {
                        ...s.settings,
                        imageUrl: s.settings?.imageUrl?.startsWith('//') ? `https:${s.settings.imageUrl}` : (s.settings?.imageUrl || '')
                    }
                };
            }
            return s;
        }),
        hiddenSelectors,
        showOnlySelectors,
        placementHeight,
        placementType,
        allExclusiveSelectors,
        // Deprecated fields for older liquid blocks (returning empty to avoid crashes)
        banners: [],
        collections: []
      },
      pricing: {
        multiplier: region.priceMultiplier,
        rules: rules.map(r => ({ type: r.type, value: r.value }))
      }
    };

    configCache.set(cacheKey, responseData);

    return json(responseData, {
        headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" }
    });

  } catch (error) {
    console.error("Error fetching homepage config:", error);
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
}
