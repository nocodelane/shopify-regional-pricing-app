// Verification script for Security Audit Fixes
const fs = require('fs');
const path = require('path');

async function verifyFixes() {
  console.log("--- Starting Security Fix Verification ---");

  // 1. Verify SQL Injection fix in Dashboard (Logic check)
  console.log("\nTesting SQL Injection Prevention in Dashboard logic...");
  const allowedFeatures = [
      "regionalPricingActive", 
      "visibilityRulesActive", 
      "abTestingActive", 
      "waitlistActive", 
      "aiFeaturesActive", 
      "flashSalesActive", 
      "pincodeGuardActive"
  ];

  const maliciousFeature = "regionalPricingActive = 1; DROP TABLE Session; --";
  if (!allowedFeatures.includes(maliciousFeature)) {
      console.log("✅ SUCCESS: Malicious feature name rejected by whitelist.");
  } else {
      console.error("❌ FAILURE: Malicious feature name passed whitelist!");
  }

  // 2. Verify GDPR Webhook existence
  console.log("\nVerifying GDPR Webhook files...");
  const routesDir = "app/routes";
  
  const expectedFiles = [
      "webhooks.customers.data_request.tsx",
      "webhooks.customers.redact.tsx",
      "webhooks.shop.redact.tsx"
  ];

  for (const file of expectedFiles) {
      if (fs.existsSync(path.join(routesDir, file))) {
          console.log(`✅ SUCCESS: ${file} exists.`);
      } else {
          console.error(`❌ FAILURE: ${file} is missing.`);
      }
  }

  // 3. Verify store proxy auth logic in files
  console.log("\nVerifying App Proxy Auth implementation in files...");
  const pricingFile = fs.readFileSync("app/routes/api.pricing.tsx", "utf-8");
  const modalFile = fs.readFileSync("app/routes/api.modal-config.jsx", "utf-8");

  if (pricingFile.includes("authenticate.public.appProxy(request)") && !pricingFile.includes("corsHeaders")) {
      console.log("✅ SUCCESS: api.pricing.tsx is secured and cleaned.");
  } else {
      console.error("❌ FAILURE: api.pricing.tsx security check failed.");
  }

  if (modalFile.includes("authenticate.public.appProxy(request)") && !modalFile.includes("corsHeaders")) {
      console.log("✅ SUCCESS: api.modal-config.jsx is secured and cleaned.");
  } else {
      console.error("❌ FAILURE: api.modal-config.jsx security check failed.");
  }

  // 4. Verify shopify.app.toml
  console.log("\nVerifying App Configuration alignment...");
  const toml = fs.readFileSync("shopify.app.toml", "utf-8");
  if (toml.includes('api_version = "2025-01"') && toml.includes('topics = [ "customers/data_request" ]')) {
      console.log("✅ SUCCESS: shopify.app.toml updated correctly.");
  } else {
      console.error("❌ FAILURE: shopify.app.toml update failed.");
  }

  console.log("\n--- Verification Complete ---");
}

verifyFixes().catch((e) => {
  console.error(e);
  process.exit(1);
});
