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
} from "@shopify/polaris";
import {
  LocationIcon,
  SearchIcon,
  FlagIcon,
  ChartVerticalIcon,
  PersonIcon,
} from "@shopify/polaris-icons";
import { useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import prisma from "../db.server";

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
  });
};

export default function Analytics() {
  const { kpis, topUnmatched, recentWaitlist, activeTests, recentSearches } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = parseInt(searchParams.get("tab") || "0");
  const [selectedTab, setSelectedTab] = useState(initialTab);

  const handleTabChange = (index: number) => {
    setSelectedTab(index);
    setSearchParams({ tab: index.toString() }, { replace: true });
  };

  const tabs = [
    { id: 'overview', content: 'Overview', accessibilityLabel: 'Overview', panelID: 'overview-panel' },
    { id: 'waitlist', content: 'Market Demand (Waitlist)', accessibilityLabel: 'Waitlist', panelID: 'waitlist-panel' },
    { id: 'abtesting', content: 'Optimizations (A/B)', accessibilityLabel: 'A/B Testing', panelID: 'abtesting-panel' },
  ];

  return (
    <Page 
        title="Pincode-Based Dynamic Pricing - Analytics"
        backAction={{ content: 'Dashboard', url: '/app' }}
    >
      <BlockStack gap="500">
        <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
          <Box paddingBlockStart="400">
            {selectedTab === 0 && (
              <BlockStack gap="500">
                {/* KPI Cards */}
                <Grid>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                    <Card>
                      <BlockStack gap="200">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text variant="headingSm" as="h3">Total Interest</Text>
                          <Icon source={SearchIcon} tone="base" />
                        </InlineStack>
                        <Text variant="headingLg" as="p">{kpis.totalSearches}</Text>
                        <Text variant="bodySm" tone="subdued" as="span">Shopper pincode searches</Text>
                      </BlockStack>
                    </Card>
                  </Grid.Cell>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                    <Card>
                      <BlockStack gap="200">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text variant="headingSm" as="h3">Demand Capture</Text>
                          <Icon source={LocationIcon} tone="success" />
                        </InlineStack>
                        <Text variant="headingLg" as="p">{kpis.coverageRatio}%</Text>
                        <Box width="100%">
                            <ProgressBar progress={parseFloat(kpis.coverageRatio)} size="small" tone="success" />
                        </Box>
                      </BlockStack>
                    </Card>
                  </Grid.Cell>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                    <Card>
                      <BlockStack gap="200">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text variant="headingSm" as="h3">Missed Opportunity</Text>
                          <Icon source={FlagIcon} tone="caution" />
                        </InlineStack>
                        <Text variant="headingLg" as="p">{kpis.unmatchedSearches}</Text>
                        <Text variant="bodySm" tone="subdued" as="span">Unserved pincode attempts</Text>
                      </BlockStack>
                    </Card>
                  </Grid.Cell>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                    <Card>
                      <BlockStack gap="200">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text variant="headingSm" as="h3">Pricing Performance</Text>
                          <Icon source={ChartVerticalIcon} tone="info" />
                        </InlineStack>
                        <Text variant="headingLg" as="p">
                            {parseFloat(kpis.abLift) > 0 ? "+" : ""}{kpis.abLift}%
                        </Text>
                        <Badge tone={parseFloat(kpis.abLift) >= 0 ? "success" : "critical"}>
                            {parseFloat(kpis.abLift) >= 0 ? "Conversion Lift" : "Declined"}
                        </Badge>
                      </BlockStack>
                    </Card>
                  </Grid.Cell>
                </Grid>

                <Layout>
                  <Layout.Section>
                    <BlockStack gap="500">
                      <Card padding="0">
                        <Box padding="400" borderBlockEndWidth="025" borderColor="border-secondary">
                          <InlineStack align="space-between">
                              <Text variant="headingMd" as="h2">Demand Visualization: Hot Zones</Text>
                              <Badge tone="attention">High Capture Potential</Badge>
                          </InlineStack>
                        </Box>
                        <Box padding="400">
                          <BlockStack gap="400">
                              <Text as="p" tone="subdued">The following pincodes represent your largest unserved markets.</Text>
                              <Grid>
                                {topUnmatched.map((item: any, idx: number) => {
                                    const intensity = 1 - (idx * 0.15);
                                    return (
                                      <Grid.Cell key={item.pincode} columnSpan={{xs: 6, sm: 4, md: 4}}>
                                          <Box 
                                            padding="400" 
                                            borderRadius="200" 
                                            background="bg-surface-secondary"
                                            minHeight="120px"
                                            borderWidth="025"
                                            borderColor="border"
                                          >
                                            <BlockStack gap="200" align="center">
                                                <div style={{ 
                                                    width: '40px', 
                                                    height: '40px', 
                                                    borderRadius: '50%', 
                                                    backgroundColor: `rgba(255, 163, 0, ${intensity})`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: intensity > 0.5 ? 'white' : 'black',
                                                    fontWeight: 'bold'
                                                }}>
                                                  {idx + 1}
                                                </div>
                                                <Text variant="headingMd" as="h3">{item.pincode}</Text>
                                                <Text variant="bodySm" tone="subdued" as="p">{`${item._count.pincode} Missed Searches`}</Text>
                                                <Button size="slim" variant="plain" onClick={() => navigate("/app")}>Create Region</Button>
                                            </BlockStack>
                                          </Box>
                                      </Grid.Cell>
                                    );
                                })}
                                {topUnmatched.length === 0 && (
                                    <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6}}>
                                      <EmptyState heading="Full Coverage Achieved" image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png">
                                          <p>All searches are currently being matched to active regions.</p>
                                      </EmptyState>
                                    </Grid.Cell>
                                )}
                              </Grid>
                          </BlockStack>
                        </Box>
                      </Card>
                    </BlockStack>
                  </Layout.Section>

                  <Layout.Section variant="oneThird">
                    <BlockStack gap="500">
                      <Card padding="400">
                        <BlockStack gap="400">
                            <Text variant="headingMd" as="h2">Live Search Activity</Text>
                            <BlockStack gap="200">
                                {recentSearches.map((search: any) => (
                                    <Box key={search.id} padding="200" borderBlockEndWidth="025" borderColor="border">
                                        <InlineStack align="space-between" blockAlign="center">
                                            <Text variant="bodySm" fontWeight="bold" as="span">{search.pincode}</Text>
                                            <Badge tone={search.matched ? "success" : "info"}>
                                                {search.matched ? "Matched" : "No Match"}
                                            </Badge>
                                        </InlineStack>
                                        <Text variant="bodyXs" tone="subdued" as="p">
                                            {new Date(search.createdAt).toLocaleTimeString()}
                                        </Text>
                                    </Box>
                                ))}
                            </BlockStack>
                        </BlockStack>
                      </Card>
                    </BlockStack>
                  </Layout.Section>
                </Layout>
              </BlockStack>
            )}

            {selectedTab === 1 && (
              <Layout>
                <Layout.Section>
                  <Card padding="400">
                    <BlockStack gap="400">
                      <InlineStack align="space-between">
                        <Text variant="headingMd" as="h2">Leads by Requested Pincodes</Text>
                        <Badge tone="info">{`${recentWaitlist.length} Recent Captures`}</Badge>
                      </InlineStack>
                      <Text as="p" tone="subdued">Customers in these areas are waiting for your service. Expansion here has pre-validated demand.</Text>
                      <IndexTable
                        resourceName={{ singular: 'lead', plural: 'leads' }}
                        itemCount={recentWaitlist.length}
                        headings={[{ title: 'Customer Email' }, { title: 'Pincode' }, { title: 'Requested Date' }]}
                        selectable={false}
                      >
                        {recentWaitlist.map((lead: any, index: number) => (
                          <IndexTable.Row id={String(lead.id)} key={String(lead.id)} position={index}>
                            <IndexTable.Cell><Text variant="bodyMd" fontWeight="bold" as="span">{lead.email}</Text></IndexTable.Cell>
                            <IndexTable.Cell>{lead.pincode}</IndexTable.Cell>
                            <IndexTable.Cell>{new Date(lead.createdAt).toLocaleDateString()}</IndexTable.Cell>
                          </IndexTable.Row>
                        ))}
                      </IndexTable>
                    </BlockStack>
                  </Card>
                </Layout.Section>
                <Layout.Section variant="oneThird">
                  <Card padding="400">
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h2">CRM Impact</Text>
                      <Banner tone="success">
                        <p>Capturing waitlist leads increases your launch conversion rate by <strong>3x</strong> on average.</p>
                      </Banner>
                    </BlockStack>
                  </Card>
                </Layout.Section>
              </Layout>
            )}

            {selectedTab === 2 && (
              <Layout>
                <Layout.Section>
                  <Card padding="400">
                    <BlockStack gap="400">
                      <InlineStack align="space-between">
                        <Text variant="headingMd" as="h2">Active Experiments</Text>
                      </InlineStack>
                      <IndexTable
                        resourceName={{ singular: 'test', plural: 'tests' }}
                        itemCount={activeTests.length}
                        headings={[{ title: 'Experiment' }, { title: 'Status' }, { title: 'Performance Lift' }]}
                        selectable={false}
                      >
                        {activeTests.map((test: any, index: number) => (
                          <IndexTable.Row id={String(test.id)} key={String(test.id)} position={index}>
                            <IndexTable.Cell>
                              <BlockStack gap="100">
                                <Text variant="bodyMd" fontWeight="bold" as="span">{test.name}</Text>
                                <Text variant="bodySm" tone="subdued" as="p">{test.type}</Text>
                              </BlockStack>
                            </IndexTable.Cell>
                            <IndexTable.Cell><Badge tone="success">{test.status.toUpperCase()}</Badge></IndexTable.Cell>
                            <IndexTable.Cell>
                              <Text variant="bodyMd" tone="success" fontWeight="bold" as="span">
                                {test.resultsVariant > test.resultsControl ? '+' : ''}
                                {((test.resultsVariant - test.resultsControl) / (test.resultsControl || 1) * 100).toFixed(1)}%
                              </Text>
                            </IndexTable.Cell>
                          </IndexTable.Row>
                        ))}
                      </IndexTable>
                      {activeTests.length === 0 && (
                        <EmptyState 
                          heading="No active tests" 
                          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                        >
                          <p>Start an A/B test to optimize your regional strategy.</p>
                        </EmptyState>
                      )}
                    </BlockStack>
                  </Card>
                </Layout.Section>
              </Layout>
            )}
          </Box>
        </Tabs>
      </BlockStack>
    </Page>
  );
}
