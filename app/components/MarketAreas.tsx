import {
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Card,
  EmptyState,
  Grid,
  Box,
  Avatar,
  Divider,
  Icon,
  TextField,
  Layout,
  Button,
} from "@shopify/polaris";
import {
  ViewIcon,
  MagicIcon,
} from "@shopify/polaris-icons";

interface MarketAreasProps {
  regions: any[];
  visibilityConfigs: any[];
  fetcher: any;
}

export function MarketAreas({
  regions,
  visibilityConfigs,
  fetcher,
}: MarketAreasProps) {
  return (
    <BlockStack gap="600">
      <InlineStack align="space-between" blockAlign="center">
        <BlockStack gap="100">
          <Text variant="headingLg" as="h2">Market Areas</Text>
          <Text variant="bodySm" tone="subdued" as="p">Control theme element visibility across your global market segments.</Text>
        </BlockStack>
        <Badge tone="info">Advanced Mode</Badge>
      </InlineStack>

      {regions.length === 0 ? (
        <Card>
          <EmptyState
            heading="No regions defined"
            action={{ content: 'Create Regions', url: '/app/pincodes' }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>You need to define at least one region in Markets & Coverage before setting up visibility rules.</p>
          </EmptyState>
        </Card>
      ) : (
        <Grid>
          {regions.map((region: any) => {
            const config = visibilityConfigs.find((c: any) => c.regionId === region.id);
            const data = JSON.parse(config?.sectionsOrder || "{}");
            const hasRules = data.hiddenSelectors || data.showOnlySelectors;

            return (
              <Grid.Cell key={region.id} columnSpan={{ xs: 6, md: 6, lg: 6 }}>
                <Box
                  background="bg-surface"
                  borderRadius="400"
                  padding="500"
                  borderStyle="solid"
                  borderWidth="025"
                  borderColor={hasRules ? "border-info" : "border"}
                  shadow={hasRules ? "100" : undefined}
                >
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="200" blockAlign="center">
                        <Avatar size="sm" initials={region.name.substring(0, 1)} name={region.name} />
                        <Text variant="headingMd" as="h3">{region.name}</Text>
                      </InlineStack>
                      <Badge tone={hasRules ? "attention" : undefined}>
                        {hasRules ? "Active Logic" : "Inherit Global"}
                      </Badge>
                    </InlineStack>

                    <Divider />

                    <BlockStack gap="400">
                      <BlockStack gap="200">
                        <Box width="fit-content">
                          <InlineStack gap="200" align="start" blockAlign="center">
                            <Icon source={ViewIcon} tone="subdued" />
                            <Text variant="bodyMd" fontWeight="semibold" as="span">Exclusion List (CSS)</Text>
                          </InlineStack>
                        </Box>
                        <TextField
                          label="Exclusion List (CSS)"
                          labelHidden
                          value={data.hiddenSelectors || ""}
                          onChange={(v) => fetcher.submit({
                            intent: 'save_visibility',
                            regionId: region.id,
                            hiddenSelectors: v,
                            showOnlySelectors: data.showOnlySelectors || ""
                          }, { method: 'POST' })}
                          placeholder=".announcement-bar, #hero"
                          autoComplete="off"
                          helpText="Elements to hide specifically for visitors in this market."
                        />
                      </BlockStack>

                      <BlockStack gap="200">
                        <Box width="fit-content">
                          <InlineStack gap="200" align="start" blockAlign="center">
                            <Icon source={MagicIcon} tone="info" />
                            <Text variant="bodyMd" fontWeight="semibold" as="span">Regional Exclusive (CSS)</Text>
                          </InlineStack>
                        </Box>
                        <TextField
                          label="Regional Exclusive (CSS)"
                          labelHidden
                          value={data.showOnlySelectors || ""}
                          onChange={(v) => fetcher.submit({
                            intent: 'save_visibility',
                            regionId: region.id,
                            hiddenSelectors: data.hiddenSelectors || "",
                            showOnlySelectors: v
                          }, { method: 'POST' })}
                          placeholder=".mumbai-only-banner"
                          autoComplete="off"
                          helpText="Elements to show ONLY for visitors in this market."
                        />
                      </BlockStack>
                    </BlockStack>
                  </BlockStack>
                </Box>
              </Grid.Cell>
            );
          })}
        </Grid>
      )}
    </BlockStack>
  );
}

interface StoreAccessProps {
  appConfig: any;
  fetcher: any;
}

export function StoreAccess({
  appConfig,
  fetcher,
}: StoreAccessProps) {
  const config = (appConfig as any) || {
    pincodeGuardActive: false,
    lockoutMessage: "We don't serve your area yet.",
    excludedPaths: "/pages/contact, /pages/about"
  };

  return (
    <BlockStack gap="600">
      <InlineStack align="space-between" blockAlign="center">
        <BlockStack gap="100">
          <Text variant="headingLg" as="h2">Store Access</Text>
          <Text variant="bodySm" tone="subdued" as="p">Configure storefront gatekeeping and global security protocols.</Text>
        </BlockStack>
        <Badge tone={config.pincodeGuardActive ? "success" : "info"}>
          {config.pincodeGuardActive ? "Shield Active" : "Unrestricted"}
        </Badge>
      </InlineStack>

      <Layout>
        <Layout.Section>
          <Box
            background="bg-surface"
            borderRadius="400"
            padding="600"
            borderStyle="solid"
            borderWidth="025"
            borderColor={config.pincodeGuardActive ? "border-success" : "border"}
            shadow="100"
          >
            <BlockStack gap="500">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text variant="headingMd" as="h3">Store Access Gate</Text>
                  <Text variant="bodySm" tone="subdued" as="p">Require customers to enter a valid pincode before browsing.</Text>
                </BlockStack>
                <Button
                  variant={config.pincodeGuardActive ? "primary" : "secondary"}
                  onClick={() => fetcher.submit({
                    intent: 'save_app_config',
                    pincodeGuardActive: String(!config.pincodeGuardActive),
                    lockoutMessage: config.lockoutMessage || "",
                    excludedPaths: config.excludedPaths || "",
                    regionalPricingActive: String(config.regionalPricingActive ?? true),
                    visibilityRulesActive: String(config.visibilityRulesActive ?? true),
                    abTestingActive: String(config.abTestingActive ?? false),
                    waitlistActive: String(config.waitlistActive ?? true)
                  }, { method: 'POST' })}
                >
                  {config.pincodeGuardActive ? "Deactivate Wall" : "Activate Wall"}
                </Button>
              </InlineStack>

              {config.pincodeGuardActive && (
                <Box background="bg-surface-secondary" padding="500" borderRadius="300">
                  <BlockStack gap="400">
                    <TextField
                      label="Lockout Messaging"
                      value={config.lockoutMessage || ""}
                      autoComplete="off"
                      onChange={(v) => fetcher.submit({
                        intent: 'save_app_config',
                        pincodeGuardActive: 'true',
                        lockoutMessage: v,
                        excludedPaths: config.excludedPaths || "",
                        regionalPricingActive: String(config.regionalPricingActive ?? true),
                        visibilityRulesActive: String(config.visibilityRulesActive ?? true),
                        abTestingActive: String(config.abTestingActive ?? false),
                        waitlistActive: String(config.waitlistActive ?? true)
                      }, { method: 'POST' })}
                      helpText="Message displayed when coverage is unavailable."
                    />
                    <TextField
                      label="Whitelisted URL Paths"
                      value={config.excludedPaths || ""}
                      autoComplete="off"
                      onChange={(v) => fetcher.submit({
                        intent: 'save_app_config',
                        pincodeGuardActive: 'true',
                        lockoutMessage: config.lockoutMessage || "",
                        excludedPaths: v,
                        regionalPricingActive: String(config.regionalPricingActive ?? true),
                        visibilityRulesActive: String(config.visibilityRulesActive ?? true),
                        abTestingActive: String(config.abTestingActive ?? false),
                        waitlistActive: String(config.waitlistActive ?? true)
                      }, { method: 'POST' })}
                      helpText="Allow access to these pages without a pincode (CSV)."
                    />
                  </BlockStack>
                </Box>
              )}
            </BlockStack>
          </Box>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text variant="headingSm" as="h4">Deployment Status</Text>
              <Divider />
              <InlineStack align="space-between">
                <Text variant="bodySm" tone="subdued" as="span">Theme Blocks</Text>
                <Badge tone="success">Active</Badge>
              </InlineStack>
              <InlineStack align="space-between">
                <Text variant="bodySm" tone="subdued" as="span">API Sync</Text>
                <Badge tone="success">Healthy</Badge>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </BlockStack>
  );
}
