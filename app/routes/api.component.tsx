import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";

import { authenticate } from "../shopify.server";
import { checkRateLimit } from "../utils/rate-limit.server.js";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  let session;
  try {
    const auth = await authenticate.public.appProxy(request);
    session = auth.session;
  } catch (e: any) {
    console.error("[ComponentAPI] Auth failed:", e.message);
    return json({ error: "Invalid proxy signature" }, { status: 401 });
  }

  const shop = session?.shop;
  if (!shop) return json({ error: "Unauthorized" }, { status: 401 });

  // Rate Limiting: 120 requests per minute per shop
  if (!checkRateLimit(shop, 120, 60000)) {
    return json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const url = new URL(request.url);
  const pincode = url.searchParams.get("pincode");
  const componentId = url.searchParams.get("componentId");

  if (!shop || !pincode || !componentId) {
    return json({ error: "Missing parameters" }, { status: 400 });
  }

  // 1. Resolve Pincode to Region
  // Use the same logic as in api.region-config
  const pincodeInt = parseInt(pincode);
  
  // Check direct pincode match
  const directMatch = await prisma.pincode.findFirst({
    where: { shop, pincode },
    include: { region: true }
  });

  let region = directMatch?.region;

  // If no direct match, check ranges
  if (!region && !isNaN(pincodeInt)) {
    const rangeMatch = await prisma.pincodeRange.findFirst({
      where: {
        shop,
        start: { lte: pincodeInt },
        end: { gte: pincodeInt }
      },
      include: { region: true }
    });
    region = rangeMatch?.region;
  }

  // 2. Fetch Component and relevant Override
  const component = await prisma.regionalComponent.findUnique({
    where: { id: componentId },
    include: {
      overrides: {
        where: region ? { regionId: region.id } : { id: 'none' } // Only fetch the matching region override
      }
    }
  });

  if (!component) {
    return json({ error: "Component not found" }, { status: 404 });
  }

  const defaultSettings = JSON.parse(component.defaultSettings || "{}");
  const overrideSettings = component.overrides[0] ? JSON.parse(component.overrides[0].settings || "{}") : {};

  // Merge settings: Override > Default
  const mergedSettings = { ...defaultSettings, ...overrideSettings };

  // 3. Fetch Visibility Rules for the region
  let visibility = { hiddenSelectors: "", showOnlySelectors: "" };
  if (region) {
      const config = await prisma.regionHomepageConfig.findFirst({
          where: { shop, regionId: region.id }
      });
      if (config) {
          try {
              const data = JSON.parse(config.sectionsOrder || "{}");
              visibility = {
                  hiddenSelectors: data.hiddenSelectors || "",
                  showOnlySelectors: data.showOnlySelectors || ""
              };
          } catch(e) {}
      }
  }

  return json({
    type: component.type,
    settings: mergedSettings,
    region: region ? { id: region.id, name: region.name } : null,
    visibility
  });
};
