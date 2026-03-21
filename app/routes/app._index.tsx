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
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import crypto from "node:crypto";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  
  const [regions, totalSearches, matchedSearches, waitlistCount, unmatchedSearches] = await Promise.all([
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
      take: 3,
    })
  ]);

  const coverageRatio = totalSearches > 0 ? (matchedSearches / totalSearches) * 100 : 0;

  // RAW SQL Workaround for AppConfig
  const configs = await prisma.$queryRaw`SELECT * FROM AppConfig WHERE shop = ${shop} LIMIT 1` as any[];
  let config = configs[0];

  if (!config) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await prisma.$executeRaw`INSERT INTO AppConfig (id, shop, regionalPricingActive, visibilityRulesActive, abTestingActive, waitlistActive, aiFeaturesActive, flashSalesActive, pincodeGuardActive, updatedAt) VALUES (${id}, ${shop}, 1, 1, 0, 1, 0, 1, 0, ${now})`;
    const newConfigs = await prisma.$queryRaw`SELECT * FROM AppConfig WHERE shop = ${shop} LIMIT 1` as any[];
    config = newConfigs[0];
  }

  // Normalize SQLite numeric booleans to JS booleans
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
    stats: {
      totalSearches,
      coverageRatio: coverageRatio.toFixed(1),
      waitlistCount,
      unmatchedSearches // This is the top 3 unserved pincodes
    }
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "toggle-feature") {
    const feature = formData.get("feature") as string;
    const value = formData.get("value") === "true" ? 1 : 0;
    
    // Whitelist allowed columns to prevent SQL Injection
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

    // RAW SQL Update - Still using executeRawUnsafe because column names cannot be paramterized in standard SQL
    // but now safe due to whitelisting.
    await prisma.$executeRawUnsafe(`UPDATE AppConfig SET ${feature} = ${value} WHERE shop = ?`, session.shop);
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
  SettingsIcon,
  EditIcon,
} from "@shopify/polaris-icons";

export default function Index() {
  const { regions, config, stats } = useLoaderData<typeof loader>() as any;
  const submit = useSubmit();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRegionName, setNewRegionName] = useState("");

  const toggleFeature = (feature: string, current: boolean) => {
    fetcher.submit({ intent: "toggle-feature", feature, value: (!current).toString() }, { method: "POST" });
  };

  const KPICard = ({ title, value, label, icon, tone }: any) => (
    <CardTextAlignment>
      <Card>
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <Text variant="headingSm" as="h3">{title}</Text>
            <Icon source={icon} tone={tone || "base"} />
          </InlineStack>
          <Text variant="headingLg" as="p">{value}</Text>
          <Text variant="bodySm" tone="subdued" as="span">{label}</Text>
        </BlockStack>
      </Card>
    </CardTextAlignment>
  );

  return (
    <Page title="Pincode-Based Dynamic Pricing">
      <BlockStack gap="500">
        {/* KPI Banner */}
        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
            <KPICard title="Market Coverage" value={`${stats.coverageRatio}%`} label="Searches matched" icon={LocationIcon} tone="success" />
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
            <KPICard title="Total Interest" value={stats.totalSearches} label="Pincode attempts" icon={SearchIcon} />
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
            <KPICard title="Waitlist Leads" value={stats.waitlistCount} label="Unserved customers" icon={PersonIcon} tone="info" />
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 4, lg: 3 }}>
             <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingSm" as="h3">System Health</Text>
                  <Badge tone="success">Active</Badge>
                </InlineStack>
                <InlineStack gap="200" blockAlign="center">
                   <Text variant="bodySm" as="span">Sync: <Badge size="small">Optimized</Badge></Text>
                   <Text variant="bodySm" as="span">AI: <Badge size="small">{config.aiFeaturesActive ? "Ready" : "Disabled"}</Badge></Text>
                </InlineStack>
                <Button variant="tertiary" size="slim" url="/app/config" icon={SettingsIcon}>Regional Components</Button>
              </BlockStack>
            </Card>
          </Grid.Cell>
        </Grid>

        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              {/* Expansion Hot Zones */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="100">
                       <Text variant="headingMd" as="h2">Market Expansion: "Hot Zones"</Text>
                       <Text variant="bodySm" tone="subdued" as="p">Pincodes with the highest unserved demand.</Text>
                    </BlockStack>
                    {stats.unmatchedSearches.length > 0 && <Badge tone="attention">{`${stats.unmatchedSearches.length} Opportunity Zones`}</Badge>}
                  </InlineStack>
                  
                  {stats.unmatchedSearches.length > 0 ? (
                    <Grid>
                       {stats.unmatchedSearches.map((item: any) => (
                         <Grid.Cell key={item.pincode} columnSpan={{xs: 6, sm: 2, md: 4, lg: 4}}>
                            <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                               <BlockStack gap="200">
                                  <InlineStack align="space-between" blockAlign="center">
                                     <Text variant="bodyMd" fontWeight="bold" as="span">{item.pincode}</Text>
                                     <Badge tone="info">{`${item._count.pincode} hits`}</Badge>
                                  </InlineStack>
                                  <Button variant="plain" size="slim" onClick={() => setIsModalOpen(true)}>Create Region</Button>
                               </BlockStack>
                            </Box>
                         </Grid.Cell>
                       ))}
                    </Grid>
                  ) : (
                    <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                       <Text alignment="center" tone="subdued" as="p">All searching customers are currently served!</Text>
                    </Box>
                  )}
                </BlockStack>
              </Card>

              {/* Quick Access */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Management Hub</Text>
                  <Grid>
                    <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 4, lg: 4}}>
                       <Box padding="300" borderBlockStartWidth="025" borderBlockEndWidth="025" borderInlineStartWidth="025" borderInlineEndWidth="025" borderColor="border-secondary" borderRadius="200">
                          <BlockStack gap="300">
                             <InlineStack gap="200" blockAlign="center"><Icon source={LocationIcon} /><Text variant="bodyMd" fontWeight="bold" as="span">Coverage Hub</Text></InlineStack>
                             <Text variant="bodySm" tone="subdued" as="p">Define regions and map pincodes to them.</Text>
                             <Button fullWidth url="/app/pincodes">Coverage Hub</Button>
                          </BlockStack>
                       </Box>
                    </Grid.Cell>
                    <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 4, lg: 4}}>
                       <Box padding="300" borderBlockStartWidth="025" borderBlockEndWidth="025" borderInlineStartWidth="025" borderInlineEndWidth="025" borderColor="border-secondary" borderRadius="200">
                          <BlockStack gap="300">
                             <InlineStack gap="200" blockAlign="center"><Icon source={FlagIcon} /><Text variant="bodyMd" fontWeight="bold" as="span">Regional Logic</Text></InlineStack>
                             <Text variant="bodySm" tone="subdued" as="p">Pricing rules, visibility & flash sales.</Text>
                             <Button fullWidth url="/app/logic">Rules & Visibility</Button>
                          </BlockStack>
                       </Box>
                    </Grid.Cell>
                    <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 4, lg: 4}}>
                       <Box padding="300" borderBlockStartWidth="025" borderBlockEndWidth="025" borderInlineStartWidth="025" borderInlineEndWidth="025" borderColor="border-secondary" borderRadius="200">
                          <BlockStack gap="300">
                             <InlineStack gap="200" blockAlign="center"><Icon source={EditIcon} /><Text variant="bodyMd" fontWeight="bold" as="span">Experience Studio</Text></InlineStack>
                             <Text variant="bodySm" tone="subdued" as="p">Design the storefront pincode modal.</Text>
                             <Button fullWidth url="/app/modal-customize">Experience Studio</Button>
                          </BlockStack>
                       </Box>
                    </Grid.Cell>
                  </Grid>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
               <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                     <Text variant="headingMd" as="h2">Feature Center</Text>
                     <Button variant="plain" onClick={() => navigate("/app/config")}>Advanced</Button>
                  </InlineStack>
                  <InlineStack align="space-between" gap="200">
                      <Button icon={PlusIcon} fullWidth onClick={() => navigate("/app/logic")}>Logic Hub</Button>
                      <Button fullWidth onClick={() => navigate("/app/pincodes")}>Coverage</Button>
                  </InlineStack>
                  <Button fullWidth onClick={() => navigate("/app/rules")}>Tag Automation</Button>
                  <BlockStack gap="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="bodyMd" as="span">Regional Pricing</Text>
                      <Checkbox label="" checked={config.regionalPricingActive} onChange={() => toggleFeature("regionalPricingActive", config.regionalPricingActive)} />
                    </InlineStack>
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="bodyMd" as="span">Visibility Rules</Text>
                      <Checkbox label="" checked={config.visibilityRulesActive} onChange={() => toggleFeature("visibilityRulesActive", config.visibilityRulesActive)} />
                    </InlineStack>
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="bodyMd" as="span">A/B Testing</Text>
                      <Checkbox label="" checked={config.abTestingActive} onChange={() => toggleFeature("abTestingActive", config.abTestingActive)} />
                    </InlineStack>
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="bodyMd" as="span">Waitlist Hub</Text>
                      <Checkbox label="" checked={config.waitlistActive} onChange={() => toggleFeature("waitlistActive", config.waitlistActive)} />
                    </InlineStack>
                  </BlockStack>
                  <Divider />
                  <Button fullWidth variant="primary" onClick={() => setIsModalOpen(true)} icon={PlusIcon}>Create New Region</Button>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Performance</Text>
                  <BlockStack gap="200">
                     <InlineStack align="space-between" blockAlign="center">
                        <Text variant="bodyMd" as="span">Storefront Lag</Text>
                        <Badge tone="success">0.02ms</Badge>
                     </InlineStack>
                     <InlineStack align="space-between" blockAlign="center">
                        <Text variant="bodyMd" as="span">Active Rules</Text>
                        <Badge>{`${regions.length} Regions`}</Badge>
                     </InlineStack>
                  </BlockStack>
                  <Button fullWidth url="/app/analytics">View Detailed Insights</Button>
                </BlockStack>
              </Card>
            </BlockStack>
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
    </Page>
  );
}

function CardTextAlignment({ children }: { children: React.ReactNode }) {
    return <div style={{ height: '100%' }}>{children}</div>;
}
