import { useState } from "react";
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useFetcher, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  Button,
  BlockStack,
  InlineStack,
  Box,
  Divider,
  Grid,
  Modal,
  TextField,
  Checkbox,
  Icon,
  Select,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import crypto from "node:crypto";
import { encrypt } from "../utils/encryption.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  
  const [regions, totalSearches, matchedSearches, waitlistCount, unmatchedSearches, llmConfigRecord] = await Promise.all([
    prisma.region.findMany({
      where: { shop },
      include: { _count: { select: { pincodes: true } } }
    }),
    prisma.pincodeSearch.count({ where: { shop } }),
    prisma.pincodeSearch.count({ where: { shop, matched: true } }),
    prisma.waitlistEntry.count({ where: { shop } }),
    prisma.pincodeSearch.groupBy({
      by: ['pincode'],
      where: { shop, matched: false },
      _count: { pincode: true },
      orderBy: { _count: { pincode: 'desc' } },
      take: 4,
    }),
    prisma.lLMConfig.findUnique({ where: { shop } }),
    prisma.region.count({ where: { shop } }),
    prisma.pricingRule.count({ where: { shop } })
  ]);

  const coverageRatio = totalSearches > 0 ? (matchedSearches / totalSearches) * 100 : 0;

  // Safe Prisma query for AppConfig
  let config = await prisma.appConfig.findUnique({
    where: { shop }
  });

  if (!config) {
    config = await prisma.appConfig.create({
      data: {
        shop,
        regionalPricingActive: true,
        visibilityRulesActive: true,
        abTestingActive: false,
        waitlistActive: true,
        aiFeaturesActive: false,
        flashSalesActive: true,
        pincodeGuardActive: false,
      }
    });
  }

  // Normalize SQLite numeric booleans to JS booleans (Prisma usually handles this if schema is correct, but safe to keep)
  const normalizedConfig = {
      ...config,
      regionalPricingActive: !!config.regionalPricingActive,
      visibilityRulesActive: !!config.visibilityRulesActive,
      abTestingActive: !!config.abTestingActive,
      waitlistActive: !!config.waitlistActive,
      aiFeaturesActive: !!config.aiFeaturesActive,
      flashSalesActive: !!config.flashSalesActive,
      pincodeGuardActive: !!config.pincodeGuardActive,
  };

  return json({ 
    regions, 
    shop,
    config: normalizedConfig,
    llmConfig: {
        provider: (llmConfigRecord as any)?.provider || "openai",
        modelId: (llmConfigRecord as any)?.modelId || "gpt-4o",
        baseUrl: (llmConfigRecord as any)?.baseUrl || "",
        hasKey: !!llmConfigRecord?.apiKeyEncrypted,
        enabled: !!llmConfigRecord?.enabled
    },
    stats: {
      totalSearches,
      coverageRatio: coverageRatio.toFixed(1),
      waitlistCount,
      unmatchedSearches,
      regionCount: regions.length,
      ruleCount: (regions as any).ruleCount || 0
    }
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "toggle-feature") {
    const feature = formData.get("feature") as string;
    const value = formData.get("value") === "true";
    
    // Whitelist allowed columns
    const allowedFeatures = [
        "regionalPricingActive", 
        "visibilityRulesActive", 
        "abTestingActive", 
        "waitlistActive", 
        "aiFeaturesActive", 
        "flashSalesActive", 
        "pincodeGuardActive"
    ];

    if (!allowedFeatures.includes(feature)) {
        return json({ error: "Invalid feature" }, { status: 400 });
    }

    // Safe Prisma Update with dynamic key
    await prisma.appConfig.update({
        where: { shop: session.shop },
        data: { [feature]: value }
    });
    return json({ success: true });
  }

  if (intent === "save-llm-config") {
    const provider = formData.get("provider") as string;
    const modelId = formData.get("modelId") as string;
    const baseUrl = formData.get("baseUrl") as string;
    const apiKey = formData.get("apiKey") as string;
    const enabled = formData.get("enabled") === "true";

    const updateData: any = {
      provider,
      modelId,
      baseUrl,
      enabled,
      updatedAt: new Date(),
    };

    if (apiKey && apiKey !== "********") {
      const { iv, encryptedData } = encrypt(apiKey);
      updateData.apiKeyEncrypted = encryptedData;
      updateData.encryptionIV = iv;
    }

    await (prisma as any).lLMConfig.upsert({
      where: { shop: session.shop },
      update: updateData,
      create: { 
        ...updateData, 
        shop: session.shop, 
        id: crypto.randomUUID(),
        createdAt: new Date()
      }
    });

    // Also update aiFeaturesActive if enabling
    if (enabled) {
        await prisma.appConfig.update({
            where: { shop: session.shop },
            data: { aiFeaturesActive: true }
        });
    }

    return json({ success: true });
  }

  if (intent === "create") {
    const name = formData.get("name") as string;
    await prisma.region.create({
      data: { shop: session.shop, name, priceMultiplier: 1.0 }
    });
  } else if (intent === "delete") {
    const id = formData.get("id") as string;
    await prisma.region.delete({ where: { id } });
  }

  return json({ success: true });
};

import {
  SearchIcon,
  LocationIcon,
  PersonIcon,
  FlagIcon,
  PlusIcon,
  DeleteIcon,
  EditIcon,
  RefreshIcon,
  AdjustIcon,
  PaintBrushFlatIcon,
  AutomationIcon,
  ChartVerticalIcon,
  MagicIcon,
  SettingsIcon,
} from "@shopify/polaris-icons";

export default function Index() {
  const { regions, config, stats } = useLoaderData<typeof loader>() as any;
  const submit = useSubmit();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [newRegionName, setNewRegionName] = useState("");
  const { llmConfig } = useLoaderData<typeof loader>() as any;
  const [aiConfig, setAIConfig] = useState(llmConfig);
  const [apiKeyInput, setApiKeyInput] = useState(llmConfig.hasKey ? "********" : "");

  const toggleFeature = (feature: string, current: boolean) => {
    fetcher.submit({ intent: "toggle-feature", feature, value: (!current).toString() }, { method: "POST" });
  };

  const KPICard = ({ title, value, label, icon, tone, progress }: any) => (
    <Card>
      <BlockStack gap="200">
        <InlineStack align="space-between" blockAlign="center">
          <Box padding="100" background="bg-surface-secondary" borderRadius="100">
            <Icon source={icon} tone={tone || "base"} />
          </Box>
          <Text variant="headingSm" as="h3" tone="subdued">{title}</Text>
        </InlineStack>
        <BlockStack gap="100">
          <Text variant="headingXl" as="p">{value}</Text>
          <InlineStack gap="100" blockAlign="center">
             <Text variant="bodySm" tone="subdued" as="span">{label}</Text>
          </InlineStack>
        </BlockStack>
        {progress !== undefined && (
          <Box width="100%" background="bg-surface-secondary" borderRadius="full" minHeight="4px">
            <div style={{ width: `${progress}%`, height: '4px', backgroundColor: 'var(--p-color-bg-fill-success)', borderRadius: '2px' }} />
          </Box>
        )}
      </BlockStack>
    </Card>
  );

  const HubCard = ({ title, description, icon, url, badge, tone }: any) => (
    <div onClick={() => navigate(url)} style={{ cursor: 'pointer', height: '100%' }}>
      <Card padding="400">
        <BlockStack gap="400">
          <InlineStack align="space-between">
             <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                <Icon source={icon} tone={tone || "base"} />
             </Box>
             {badge && <Badge tone={tone}>{badge}</Badge>}
          </InlineStack>
          <BlockStack gap="100">
            <Text variant="headingMd" as="h3">{title}</Text>
            <Text variant="bodySm" tone="subdued" as="p">{description}</Text>
          </BlockStack>
          <Button variant="tertiary" icon={PlusIcon} onClick={() => navigate(url)}>Open Hub</Button>
        </BlockStack>
      </Card>
    </div>
  );

  return (
    <Page 
       title="Command Center" 
       subtitle="Unified management for your regional storefront."
       primaryAction={
         <Button variant="primary" onClick={() => setIsModalOpen(true)} icon={PlusIcon}>Create New Region</Button>
       }
       secondaryActions={[
         { content: 'Configure AI', icon: MagicIcon, onAction: () => setIsAIModalOpen(true) },
         { content: 'Setup Guide', icon: SettingsIcon, onAction: () => navigate("/app/guide") }
       ]}
    >
      <BlockStack gap="600">
        {/* Visual Stats Row */}
        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
            <KPICard title="Market Coverage" value={`${stats.coverageRatio}%`} label="Revenue Matched" icon={LocationIcon} tone="success" progress={stats.coverageRatio} />
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
            <KPICard title="Customer Interest" value={stats.totalSearches} label="Pincode attempts" icon={SearchIcon} />
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
            <KPICard title="Waitlist Leads" value={stats.waitlistCount} label="Exportable prospects" icon={PersonIcon} tone="info" />
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
             <Card>
               <BlockStack gap="400">
                  <InlineStack align="space-between">
                     <Text variant="headingSm" as="h3" tone="subdued">System Health</Text>
                     <Badge tone="success">Optimal</Badge>
                  </InlineStack>
                  <BlockStack gap="200">
                     <InlineStack align="space-between">
                        <Text variant="bodySm" as="span">Edge Sync</Text>
                        <Text variant="bodySm" fontWeight="bold" tone="success" as="span">Active</Text>
                     </InlineStack>
                     <InlineStack align="space-between">
                        <Text variant="bodySm" as="span">Ruleset Size</Text>
                        <Text variant="bodySm" fontWeight="bold" as="span">{stats.ruleCount} Rules</Text>
                     </InlineStack>
                  </BlockStack>
               </BlockStack>
             </Card>
          </Grid.Cell>
        </Grid>

        {/* Primary Hub Grid */}
        <BlockStack gap="400">
           <Text variant="headingLg" as="h2">Primary Management Hubs</Text>
           <Grid>
             <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3}}>
                <HubCard 
                  title="Markets & Coverage" 
                  description="Define regions, map pincodes, and manage local geography." 
                  icon={LocationIcon} 
                  url="/app/pincodes" 
                  badge={`${stats.regionCount} Regions`}
                  tone="info"
                />
             </Grid.Cell>
             <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3}}>
                <HubCard 
                  title="Regional Rules" 
                  description="Pricing logic, product visibility, and tag automation." 
                  icon={FlagIcon} 
                  url="/app/logic" 
                  badge="Automated"
                  tone="attention"
                />
             </Grid.Cell>
             <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3}}>
                <HubCard 
                  title="Visual Studio" 
                  description="Customize components, themes, and modal experiences." 
                  icon={PaintBrushFlatIcon} 
                  url="/app/config" 
                  badge="Live Preview"
                  tone="magic"
                />
             </Grid.Cell>
             <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3}}>
                <HubCard 
                  title="Intelligence" 
                  description="A/B Test results, demand heatmaps, and growth insights." 
                  icon={ChartVerticalIcon} 
                  url="/app/analytics" 
                  badge="Analytics"
                  tone="success"
                />
             </Grid.Cell>
           </Grid>
        </BlockStack>

        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              {/* Opportunities section - Moved for better flow */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="100">
                       <Text variant="headingMd" as="h2">Market Expansion Opportunities</Text>
                       <Text variant="bodySm" tone="subdued" as="p">These pincodes have high demand but no matching region yet.</Text>
                    </BlockStack>
                    {stats.unmatchedSearches.length > 0 && <Badge tone="attention">{`${stats.unmatchedSearches.length} Hot Zones`}</Badge>}
                  </InlineStack>
                  
                  {stats.unmatchedSearches.length > 0 ? (
                    <Grid>
                       {stats.unmatchedSearches.map((item: any) => (
                         <Grid.Cell key={item.pincode} columnSpan={{xs: 6, sm: 2, md: 3, lg: 3}}>
                            <Box padding="300" background="bg-surface-secondary" borderRadius="200" borderInlineStartWidth="050" borderColor="border-info">
                               <BlockStack gap="200">
                                  <InlineStack align="space-between" blockAlign="center">
                                     <Text variant="bodyMd" fontWeight="bold" as="span">{item.pincode}</Text>
                                     <Badge tone="info" size="small">{`${item._count.pincode} hits`}</Badge>
                                  </InlineStack>
                                  <Button variant="plain" size="slim" onClick={() => { setNewRegionName(item.pincode); setIsModalOpen(true); }}>Convert to Region</Button>
                               </BlockStack>
                            </Box>
                         </Grid.Cell>
                       ))}
                    </Grid>
                  ) : (
                    <Box padding="600" background="bg-surface-secondary" borderRadius="300">
                       <BlockStack gap="200" align="center">
                          <Icon source={SearchIcon} tone="subdued" />
                          <Text alignment="center" tone="subdued" as="p">All searching customers are currently served by your regions.</Text>
                       </BlockStack>
                    </Box>
                  )}
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Quick Controls</Text>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="0">
                      <Text variant="bodyMd" as="span">Dynamic Pricing</Text>
                      <Text variant="bodyXs" tone="subdued" as="p">Regional price overrides</Text>
                    </BlockStack>
                    <Checkbox label="" checked={config.regionalPricingActive} onChange={() => toggleFeature("regionalPricingActive", config.regionalPricingActive)} />
                  </InlineStack>
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="0">
                      <Text variant="bodyMd" as="span">Visibility Rules</Text>
                      <Text variant="bodyXs" tone="subdued" as="p">Hide/Show elements locally</Text>
                    </BlockStack>
                    <Checkbox label="" checked={config.visibilityRulesActive} onChange={() => toggleFeature("visibilityRulesActive", config.visibilityRulesActive)} />
                  </InlineStack>
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="0">
                      <Text variant="bodyMd" as="span">A/B Experiments</Text>
                      <Text variant="bodyXs" tone="subdued" as="p">Active traffic splitting</Text>
                    </BlockStack>
                    <Checkbox label="" checked={config.abTestingActive} onChange={() => toggleFeature("abTestingActive", config.abTestingActive)} />
                  </InlineStack>
                  <Divider />
                  <Button fullWidth icon={ChartVerticalIcon} url="/app/analytics" variant="secondary">View Growth Stats</Button>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Delivery Region"
        primaryAction={{
          content: 'Create Region',
          onAction: () => {
             submit({ name: newRegionName, intent: 'create' }, { method: 'POST' });
             setIsModalOpen(false);
             setNewRegionName("");
          },
        }}
      >
        <Modal.Section>
          <TextField label="Region Name" value={newRegionName} onChange={setNewRegionName} autoComplete="off" placeholder="e.g., North India" />
        </Modal.Section>
      </Modal>

      {/* AI Configuration Modal */}
      <Modal
        open={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        title="AI Intelligence Configuration"
        primaryAction={{
          content: 'Save AI Config',
          onAction: () => {
             submit({ 
               ...aiConfig, 
               apiKey: apiKeyInput, 
               intent: 'save-llm-config',
               enabled: "true" 
             }, { method: 'POST' });
             setIsAIModalOpen(false);
          },
        }}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text as="p">Configure your preferred AI provider to enable smart copywriting and regional translation.</Text>
            <Select
              label="AI Provider"
              options={[
                {label: 'OpenAI (GPT-4o)', value: 'openai'},
                {label: 'Anthropic (Claude 3.5)', value: 'anthropic'},
                {label: 'Google (Gemini 1.5)', value: 'google'},
                {label: 'Custom / Proxy (Ollama, LiteLLM)', value: 'custom'}
              ]}
              value={aiConfig.provider}
              onChange={(v) => setAIConfig({...aiConfig, provider: v})}
            />
            <TextField
              label="Model ID"
              value={aiConfig.modelId}
              onChange={(v) => setAIConfig({...aiConfig, modelId: v})}
              autoComplete="off"
              helpText={aiConfig.provider === 'openai' ? 'e.g. gpt-4o, gpt-3.5-turbo' : 'Model name/identifier for the chosen provider.'}
            />
            <TextField
              label="API Key"
              type="password"
              value={apiKeyInput}
              onChange={setApiKeyInput}
              autoComplete="off"
              placeholder={llmConfig.hasKey ? "********" : "Enter your API key"}
            />
            {aiConfig.provider === 'custom' && (
              <TextField
                label="Custom Base URL"
                value={aiConfig.baseUrl}
                onChange={(v) => setAIConfig({...aiConfig, baseUrl: v})}
                autoComplete="off"
                placeholder="https://api.yourproxy.com/v1"
                helpText="Full URL to the API endpoint (including /v1 if needed)."
              />
            )}
            <Banner tone="info">
              <Text as="p">Your API key is encrypted using AES-256 before being stored in our database.</Text>
            </Banner>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

function CardTextAlignment({ children }: { children: React.ReactNode }) {
    return <div style={{ height: '100%' }}>{children}</div>;
}
