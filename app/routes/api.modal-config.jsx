import { json } from "@remix-run/node";
import prisma from "../db.server";

import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  let session;
  try {
    const auth = await authenticate.public.appProxy(request);
    session = auth.session;
  } catch (e) {
    console.error("App Proxy Authentication Failed in Modal Config:", e?.message);
    return json({ error: "Invalid proxy signature" }, { status: 401 });
  }

  const shop = session?.shop;

  if (!shop) {
    return json({ error: "Missing shop context" }, { status: 400 });
  }

  try {
    const config = await prisma.modalConfig.findUnique({
        where: { shop }
    });
    
    if (!config) {
        return json({ error: "Config not found" }, { status: 404 });
    }

    // SQLite Booleans and Defaults Mapping
    const safeConfig = {
        ...config,
        showFloatingButton: config.showFloatingButton === true,
        showCurrentPincode: config.showCurrentPincode === true,
        showLocationIcon: config.showLocationIcon === true,
        triggerTransparent: config.triggerTransparent === true,
        usePulse: config.usePulse === true,
        useGlassmorphism: config.useGlassmorphism === true,
        
        // Ensure strings have valid defaults for storefront
        triggerBackgroundColor: config.triggerBackgroundColor || "#000000",
        triggerTextColor: config.triggerTextColor || "#ffffff",
        triggerIconColor: config.triggerIconColor || "#ffffff",
        triggerBorderRadius: config.triggerBorderRadius || "4px",
        triggerPadding: config.triggerPadding || "10px 18px",
        triggerFontSize: config.triggerFontSize || "14px",
        triggerFontWeight: config.triggerFontWeight || "600",
        triggerLayoutStyle: config.triggerLayoutStyle || "boxed",
        triggerIconSize: config.triggerIconSize || "18px",
        triggerBorderWidth: config.triggerBorderWidth || "1px",
        triggerBorderColor: config.triggerBorderColor || "#000000",
        pincodePrefixText: config.pincodePrefixText || "Delivering to: ",
    };

    return json(safeConfig);

  } catch (error) {
    console.error("Error fetching modal config:", error);
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
}
