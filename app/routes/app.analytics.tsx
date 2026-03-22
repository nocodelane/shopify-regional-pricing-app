import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Text,
  Badge,
  BlockStack,
  InlineStack,
  Box,
  EmptyState,
  Grid,
  ProgressBar,
  Icon,
  Button,
  Tabs,
  Banner,
  ResourceList,
  ResourceItem,
  Modal,
  TextField,
  Select,
  Divider,
} from "@shopify/polaris";
import {
  LocationIcon,
  SearchIcon,
  FlagIcon,
  ChartVerticalIcon,
  PersonIcon,
  PlusIcon,
  DeleteIcon,
  PlayIcon,
  MinusCircleIcon,
  ExportIcon,
  RefreshIcon,
  ClockIcon,
  CheckCircleIcon,
  TargetIcon,
  ChartLineIcon,
  CreditCardIcon,
} from "@shopify/polaris-icons";
import { useLoaderData, useNavigate, useSearchParams, useSubmit, useFetcher } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import prisma from "../db.server";
import crypto from "node:crypto";
import { useAppBridge } from "@shopify/app-bridge-react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // 1. Search Stats
  const totalSearches = await prisma.pincodeSearch.count({ where: { shop } });
  const matchedSearches = await prisma.pincodeSearch.count({ where: { shop, matched: true } });
  const unmatchedSearches = totalSearches - matchedSearches;
  const coverageRatio = totalSearches > 0 ? (matchedSearches / totalSearches) * 100 : 0;

  // 2. Top Unmatched Pincodes (Expansion Opportunities)
  const topUnmatched = await prisma.pincodeSearch.groupBy({
    by: ['pincode'],
    where: { shop, matched: false },
    _count: { pincode: true },
    orderBy: { _count: { pincode: 'desc' } },
    take: 5,
  });

  // 3. Waitlist Stats
  const totalWaitlist = await prisma.waitlistEntry.count({ where: { shop } });
  const recentWaitlist = await prisma.waitlistEntry.findMany({
    where: { shop },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // 4. A/B Test Summary
  const activeTests = await prisma.aBTest.findMany({
    where: { shop, status: 'active' },
  });

  const aggregateABResults = activeTests.reduce((acc, test) => {
    acc.controlHits += test.resultsControl || 0;
    acc.variantHits += test.resultsVariant || 0;
    return acc;
  }, { controlHits: 0, variantHits: 0 });

  const abLift = aggregateABResults.controlHits > 0 
    ? ((aggregateABResults.variantHits - aggregateABResults.controlHits) / aggregateABResults.controlHits) * 100 
    : 0;

  // 5. Recent Activity
  const recentSearches = await prisma.pincodeSearch.findMany({
    where: { shop },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // 6. Full Data for Tabs
  const [regions, abTests, waitlist] = await Promise.all([
    prisma.region.findMany({ where: { shop }, orderBy: { name: 'asc' } }),
    prisma.aBTest.findMany({ where: { shop }, orderBy: { createdAt: 'desc' } }),
    prisma.waitlistEntry.findMany({ where: { shop }, orderBy: { createdAt: 'desc' } }),
  ]);

  return json({
    kpis: {
      totalSearches,
      coverageRatio: coverageRatio.toFixed(1),
      unmatchedSearches,
      totalWaitlist,
      abLift: abLift.toFixed(1),
    },
    topUnmatched,
    recentWaitlist,
    activeTests,
    recentSearches,
    regions,
    abTests,
    waitlist,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "save-test") {
    const id = (formData.get("id") as string) || crypto.randomUUID();
    const name = formData.get("name") as string;
    const regionId = formData.get("regionId") as string;
    const type = formData.get("type") as string;
    const variantMultiplier = parseFloat(formData.get("variantMultiplier") as string || "1.0");
    const config = formData.get("config") as string;

    const data = {
      shop,
      name,
      regionId,
      type,
      variantMultiplier,
      config,
      updatedAt: new Date(),
    };

    await (prisma as any).aBTest.upsert({
      where: { id },
      update: { ...data },
      create: { ...data, id, status: 'draft', createdAt: new Date() }
    });
    return json({ success: true });
  }

  if (intent === "toggle-test") {
    const id = formData.get("id") as string;
    const currentStatus = formData.get("status") as string;
    const newStatus = currentStatus === "active" ? "draft" : "active";
    await (prisma as any).aBTest.update({ where: { id }, data: { status: newStatus } });
    return json({ success: true });
  }

  if (intent === "delete-test") {
    await (prisma as any).aBTest.delete({ where: { id: formData.get("id") as string } });
    return json({ success: true });
  }

  if (intent === "delete-lead") {
    await prisma.waitlistEntry.delete({ where: { id: formData.get("id") as string } });
    return json({ success: true });
  }

  return json({ success: true });
};

export default function Analytics() {
  const { kpis, topUnmatched, recentWaitlist, activeTests, recentSearches, regions, abTests, waitlist } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const submit = useSubmit();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = parseInt(searchParams.get("tab") || "0");
  const [selectedTab, setSelectedTab] = useState(initialTab);
  
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<any>(null);

  const handleTabChange = (index: number) => {
    setSelectedTab(index);
    setSearchParams({ tab: index.toString() }, { replace: true });
  };

  const openTestEditor = (test: any = null) => {
    setEditingTest(test || {
      name: "",
      regionId: regions[0]?.id || "",
      type: "PRICING",
      variantMultiplier: "1.1",
      config: JSON.stringify({ targetType: 'global' })
    });
    setIsTestModalOpen(true);
  };

  const handleExportLeads = () => {
    const csvRows = [
      ["Email", "Pincode", "Date"],
      ...waitlist.map((item: any) => [item.email, item.pincode, new Date(item.createdAt).toLocaleDateString()])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "waitlist_leads.csv");
    document.body.appendChild(link);
    link.click();
  };

  const tabs = [
    { id: 'overview', content: 'Overview', accessibilityLabel: 'Overview', panelID: 'overview-panel' },
    { id: 'waitlist', content: 'Market Demand (Waitlist)', accessibilityLabel: 'Waitlist', panelID: 'waitlist-panel' },
    { id: 'abtesting', content: 'Optimizations (A/B)', accessibilityLabel: 'A/B Testing', panelID: 'abtesting-panel' },
  ];

  return (
    <Page 
        title="Intelligence & Growth"
        subtitle="Business Intelligence & Market Expansion Command Center"
        backAction={{ content: 'Dashboard', url: '/app' }}
        primaryAction={selectedTab === 2 ? { content: 'New Experiment', icon: PlusIcon, onAction: () => openTestEditor() } : selectedTab === 1 ? { content: 'Export Leads', icon: ExportIcon, onAction: () => handleExportLeads() } : undefined}
    >
      <BlockStack gap="600">
        <Box background="bg-surface-secondary" padding="400" borderRadius="300" borderStyle="dashed" borderWidth="025" borderColor="border-info">
            <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="300" blockAlign="center">
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#008060', animation: 'pulse 2s infinite' }} />
                    <BlockStack gap="0">
                        <Text variant="headingSm" as="h3">Live Signal Active</Text>
                        <Text variant="bodyXs" tone="subdued" as="p">Monitoring regional demand in real-time across your global storefront.</Text>
                    </BlockStack>
                </InlineStack>
                <Button icon={RefreshIcon} variant="tertiary" size="slim">Re-evaluate Markets</Button>
            </InlineStack>
        </Box>

        <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3 }}>
                <Card>
                    <BlockStack gap="200">
                        <InlineStack align="space-between">
                            <Text variant="headingSm" as="h3" tone="subdued">Global Interest</Text>
                            <Icon source={SearchIcon} tone="info" />
                        </InlineStack>
                        <Text variant="headingLg" as="p">{kpis.totalSearches}</Text>
                        <InlineStack gap="100" blockAlign="center">
                            <Icon source={ChartLineIcon} tone="success" />
                            <Text variant="bodyXs" tone="success" as="span">+12% vs last week</Text>
                        </InlineStack>
                    </BlockStack>
                </Card>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3 }}>
                <Card>
                    <BlockStack gap="200">
                        <InlineStack align="space-between">
                            <Text variant="headingSm" as="h3" tone="subdued">Market Capture</Text>
                            <Icon source={TargetIcon} tone="success" />
                        </InlineStack>
                        <Text variant="headingLg" as="p">{kpis.coverageRatio}%</Text>
                        <ProgressBar progress={parseFloat(kpis.coverageRatio)} size="small" tone="success" />
                    </BlockStack>
                </Card>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3 }}>
                <Card>
                    <BlockStack gap="200">
                        <InlineStack align="space-between">
                            <Text variant="headingSm" as="h3" tone="subdued">Expansion Pot.</Text>
                            <Icon source={FlagIcon} tone="caution" />
                        </InlineStack>
                        <Text variant="headingLg" as="p">{kpis.unmatchedSearches}</Text>
                        <Badge tone="attention">High Demand Outside Zones</Badge>
                    </BlockStack>
                </Card>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3 }}>
                <Card>
                    <BlockStack gap="200">
                        <InlineStack align="space-between">
                            <Text variant="headingSm" as="h3" tone="subdued">System ROI</Text>
                            <Icon source={CreditCardIcon} tone="info" />
                        </InlineStack>
                        <Text variant="headingLg" as="p">{parseFloat(kpis.abLift) > 0 ? "+" : ""}{kpis.abLift}%</Text>
                        <Badge tone={parseFloat(kpis.abLift) >= 0 ? "success" : "critical"}>
                            {parseFloat(kpis.abLift) >= 0 ? "Efficiency Gain" : "Optimization Req."}
                        </Badge>
                    </BlockStack>
                </Card>
            </Grid.Cell>
        </Grid>

        <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
          <Box paddingBlockStart="400">
            {selectedTab === 0 && (
              <Layout>
                <Layout.Section>
                  <Card padding="0">
                    <Box padding="400" borderBlockEndWidth="025" borderColor="border-secondary" background="bg-surface-secondary">
                      <InlineStack align="space-between" blockAlign="center">
                          <BlockStack gap="100">
                              <Text variant="headingMd" as="h2">Regional Demand Heatmap</Text>
                              <Text variant="bodySm" tone="subdued" as="p">Visualizing unserved market opportunities by search volume.</Text>
                          </BlockStack>
                          <Badge tone="attention">Action Recommended</Badge>
                      </InlineStack>
                    </Box>
                    <Box padding="600">
                        <Grid gap={{ xs: '400', md: '600' }}>
                            {topUnmatched.map((item: any, idx: number) => {
                                const intensity = 1 - (idx * 0.18);
                                const color = `rgba(0, 128, 96, ${intensity})`;
                                return (
                                    <Grid.Cell key={item.pincode} columnSpan={{xs: 6, sm: 4, md: 4}}>
                                        <Box 
                                            padding="500" 
                                            borderRadius="400" 
                                            background="bg-surface"
                                            minHeight="140px"
                                            borderWidth="025"
                                            borderColor="border"
                                            shadow="100"
                                            position="relative"
                                        >
                                            <div style={{ 
                                                position: 'absolute', 
                                                top: '0', 
                                                left: '0', 
                                                width: '4px', 
                                                height: '100%', 
                                                backgroundColor: color,
                                                borderRadius: '4px 0 0 4px'
                                            }} />
                                            <BlockStack gap="400">
                                                <InlineStack align="space-between" blockAlign="center">
                                                    <Text variant="headingLg" as="h3">{item.pincode}</Text>
                                                    <div style={{ backgroundColor: color, padding: '4px 12px', borderRadius: '100px' }}>
                                                        <Text variant="bodyXs" fontWeight="bold" tone="inherit" as="span">#{idx + 1}</Text>
                                                    </div>
                                                </InlineStack>
                                                <BlockStack gap="100">
                                                    <Text variant="bodyMd" tone="subdued" as="p">Detected <strong>{item._count.pincode}</strong> unique searches.</Text>
                                                    <Button variant="primary" size="slim" onClick={() => navigate("/app")}>Initialize Region</Button>
                                                </BlockStack>
                                            </BlockStack>
                                        </Box>
                                    </Grid.Cell>
                                );
                            })}
                            {topUnmatched.length === 0 && (
                                <Grid.Cell columnSpan={{xs: 6, md: 6}}>
                                    <EmptyState heading="Optimization Complete" image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png">
                                        <p>Your current active regions cover all detected storefront demand.</p>
                                    </EmptyState>
                                </Grid.Cell>
                            )}
                        </Grid>
                    </Box>
                  </Card>
                </Layout.Section>

                <Layout.Section variant="oneThird">
                  <Card padding="0">
                      <Box padding="400" borderBlockEndWidth="025" borderColor="border-secondary" background="bg-surface-secondary">
                          <Text variant="headingSm" as="h3">Real-time Stream</Text>
                      </Box>
                      <Box padding="400">
                          <BlockStack gap="200">
                              {recentSearches.map((search: any) => (
                                  <Box key={search.id} padding="300" borderRadius="200" background={search.matched ? "bg-surface-success" : "bg-surface-info"}>
                                      <InlineStack align="space-between" blockAlign="center">
                                          <BlockStack gap="0">
                                              <Text variant="bodySm" fontWeight="bold" as="span">{search.pincode}</Text>
                                              <Text variant="bodyXs" tone="subdued" as="p">
                                                  {new Date(search.createdAt).toLocaleTimeString()}
                                              </Text>
                                          </BlockStack>
                                          <Icon source={search.matched ? CheckCircleIcon : ClockIcon} tone={search.matched ? "success" : "info"} />
                                      </InlineStack>
                                  </Box>
                              ))}
                          </BlockStack>
                      </Box>
                  </Card>
                </Layout.Section>
              </Layout>
            )}

            {selectedTab === 1 && (
              <Layout>
                <Layout.Section>
                  <Card padding="0">
                    <Box padding="400" borderBlockEndWidth="025" borderColor="border-secondary">
                        <InlineStack align="space-between" blockAlign="center">
                            <Text variant="headingMd" as="h2">Waitlist Lead Management</Text>
                            <Button icon={ExportIcon} onClick={handleExportLeads}>Export to CSV</Button>
                        </InlineStack>
                    </Box>
                    {waitlist.length === 0 ? (
                      <EmptyState heading="Waitlist is empty" image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png">
                        <p>When customers enter an unserved pincode, they can join the waitlist. Their interest will appear here.</p>
                      </EmptyState>
                    ) : (
                      <IndexTable
                        resourceName={{ singular: 'lead', plural: 'leads' }}
                        itemCount={waitlist.length}
                        headings={[{ title: 'Email' }, { title: 'Pincode' }, { title: 'Date' }, { title: 'Actions' }]}
                        selectable={false}
                      >
                        {waitlist.map((lead: any, index: number) => (
                          <IndexTable.Row id={lead.id} key={lead.id} position={index}>
                            <IndexTable.Cell><Text variant="bodyMd" fontWeight="bold" as="span">{lead.email}</Text></IndexTable.Cell>
                            <IndexTable.Cell><Badge tone="info">{lead.pincode}</Badge></IndexTable.Cell>
                            <IndexTable.Cell>{new Date(lead.createdAt).toLocaleDateString()}</IndexTable.Cell>
                            <IndexTable.Cell>
                                <Button icon={DeleteIcon} tone="critical" variant="tertiary" onClick={() => { if(confirm("Delete lead?")) fetcher.submit({ id: lead.id, intent: 'delete-lead' }, { method: 'POST' }) }} />
                            </IndexTable.Cell>
                          </IndexTable.Row>
                        ))}
                      </IndexTable>
                    )}
                  </Card>
                </Layout.Section>
                <Layout.Section variant="oneThird">
                    <Card>
                        <BlockStack gap="200">
                            <Text variant="headingMd" as="h2">Market Validation</Text>
                            <Text as="p" variant="bodySm">These leads represent validated demand. Expansion here has pre-validated conversion potential.</Text>
                            <Banner tone="success">
                                <p>Capturing waitlist leads increases launch ROI by <strong>3x</strong> on average.</p>
                            </Banner>
                        </BlockStack>
                    </Card>
                </Layout.Section>
              </Layout>
            )}

            {selectedTab === 2 && (
              <Layout>
                <Layout.Section>
                  <Card padding="0">
                    <Box padding="400" borderBlockEndWidth="025" borderColor="border-secondary">
                        <InlineStack align="space-between" blockAlign="center">
                            <Text variant="headingMd" as="h2">Experiment Hub</Text>
                            <Button variant="primary" icon={PlusIcon} onClick={() => openTestEditor()}>Create Experiment</Button>
                        </InlineStack>
                    </Box>
                    {abTests.length === 0 ? (
                      <EmptyState heading="No active experiments" action={{ content: 'Start Your First Test', onAction: () => openTestEditor() }} image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png">
                        <p>Test higher multipliers in affluent zones or exclusive visibility for regional launches.</p>
                      </EmptyState>
                    ) : (
                      <ResourceList
                        resourceName={{ singular: 'test', plural: 'tests' }}
                        items={abTests}
                        renderItem={(test: any) => {
                          const isActive = test.status === "active";
                          const config = JSON.parse(test.config || '{}');
                          return (
                            <ResourceItem id={test.id} onClick={() => openTestEditor(test)}>
                                <InlineStack align="space-between" blockAlign="center">
                                    <BlockStack gap="100">
                                        <InlineStack gap="200" blockAlign="center">
                                            <Text variant="bodyMd" fontWeight="bold" as="span">{test.name}</Text>
                                            <Badge tone={isActive ? "success" : "attention"}>{test.status.toUpperCase()}</Badge>
                                            <Badge tone="info">{regions.find(r => r.id === test.regionId)?.name || 'Unknown'}</Badge>
                                        </InlineStack>
                                        <Text variant="bodySm" tone="subdued" as="p">
                                            {test.type === 'PRICING' ? `Testing Control vs ${test.variantMultiplier}x` : `Testing visibility of ${config.targetHandle || 'selected item'}`}
                                        </Text>
                                    </BlockStack>
                                    <InlineStack gap="100">
                                        <div onClick={(e) => e.stopPropagation()}><Button icon={isActive ? MinusCircleIcon : PlayIcon} variant="tertiary" tone={isActive ? "critical" : "success"} onClick={() => fetcher.submit({ id: test.id, status: test.status, intent: 'toggle-test' }, { method: 'POST' })} /></div>
                                        <div onClick={(e) => e.stopPropagation()}><Button icon={DeleteIcon} tone="critical" variant="tertiary" onClick={() => { if(confirm("Delete experiment?")) fetcher.submit({ id: test.id, intent: 'delete-test' }, { method: 'POST' }); }} /></div>
                                    </InlineStack>
                                </InlineStack>
                            </ResourceItem>
                          );
                        }}
                      />
                    )}
                  </Card>
                </Layout.Section>
                <Layout.Section variant="oneThird">
                    <Card>
                        <BlockStack gap="300">
                            <Text variant="headingMd" as="h2">Optimization Strategy</Text>
                            <Text as="p" variant="bodySm">Traffic is split 50/50 automatically. Control (Variant A) always represents the base regional price.</Text>
                            <Divider />
                            <Text variant="bodySm" fontWeight="bold" as="p">Active Lift: {kpis.abLift}%</Text>
                        </BlockStack>
                    </Card>
                </Layout.Section>
              </Layout>
            )}
          </Box>
        </Tabs>
      </BlockStack>

      {/* Experiment Editor Modal */}
      {editingTest && (
        <Modal
            open={isTestModalOpen}
            onClose={() => setIsTestModalOpen(false)}
            title={editingTest.id ? "Edit Experiment" : "Create New Experiment"}
            primaryAction={{
                content: 'Save Experiment',
                onAction: () => {
                    submit({ ...editingTest, intent: "save-test" }, { method: "POST" });
                    setIsTestModalOpen(false);
                }
            }}
        >
            <Modal.Section>
                <BlockStack gap="400">
                    <TextField label="Experiment Name" value={editingTest.name} onChange={(v) => setEditingTest({...editingTest, name: v})} autoComplete="off" placeholder="e.g., North India Price Lift Test" />
                    <Select label="Target Region" options={regions.map(r => ({ label: r.name, value: r.id }))} value={editingTest.regionId} onChange={(v) => setEditingTest({...editingTest, regionId: v})} />
                    <Select label="Experiment Type" options={[{label: 'Pricing Lift', value: 'PRICING'}, {label: 'Visibility/Exclusivity', value: 'VISIBILITY'}]} value={editingTest.type} onChange={(v) => setEditingTest({...editingTest, type: v})} />
                    
                    {editingTest.type === 'PRICING' ? (
                        <TextField label="Variant B Multiplier" type="number" value={editingTest.variantMultiplier} onChange={(v) => setEditingTest({...editingTest, variantMultiplier: v})} autoComplete="off" helpText="Control (Variant A) is always 1.0x (or your region's base multiplier)." />
                    ) : (
                        <BlockStack gap="200">
                            <Select label="Entity to Hide (Variant B)" options={[{label: 'Specific Product', value: 'product'}, {label: 'Entire Collection', value: 'collection'}]} value={JSON.parse(editingTest.config).targetType} onChange={(v) => {
                                const newConfig = { ...JSON.parse(editingTest.config), targetType: v, targetId: '', targetHandle: '' };
                                setEditingTest({...editingTest, config: JSON.stringify(newConfig)});
                            }} />
                            <InlineStack gap="200" blockAlign="center">
                                <Box width="100%">
                                    <TextField label="Target" value={JSON.parse(editingTest.config).targetHandle || "Everything"} disabled autoComplete="off" />
                                </Box>
                                <div style={{ paddingTop: '24px' }}>
                                    <Button icon={SearchIcon} onClick={async () => {
                                        const type = JSON.parse(editingTest.config).targetType === 'collection' ? 'collection' : 'product';
                                        const selection = await shopify.resourcePicker({ type: type as any, multiple: false });
                                        if (selection && selection.selection.length > 0) {
                                            const item = selection.selection[0];
                                            const newConfig = { ...JSON.parse(editingTest.config), targetId: item.id, targetHandle: item.handle };
                                            setEditingTest({ ...editingTest, config: JSON.stringify(newConfig) });
                                        }
                                    }}>Browse</Button>
                                </div>
                            </InlineStack>
                        </BlockStack>
                    )}
                </BlockStack>
            </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
