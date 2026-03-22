import { json } from "@remix-run/node";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  let session;
  try {
    const auth = await authenticate.public.appProxy(request);
    session = auth.session;
  } catch (e) {
    console.error("App Proxy Authentication Failed:", JSON.stringify(e, Object.getOwnPropertyNames(e)));
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

    const appConfig = await prisma.appConfig.findUnique({
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
        showOnAnyPage: config.showOnAnyPage !== false,
        disableScroll: config.disableScroll !== false,
        overlayColor: config.overlayColor || "rgba(0,0,0,0.6)",
        overlayBlur: config.overlayBlur || "8px",
        
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
        
        // Pincode Guard (from AppConfig)
        pincodeGuardActive: appConfig?.pincodeGuardActive === true,
        excludedPaths: appConfig?.excludedPaths || "",
        lockoutMessage: appConfig?.lockoutMessage || "Delivery not available in this area yet."
    };

  } catch (error) {
    console.error("Critical Error in Modal Config API:", error);
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
}
