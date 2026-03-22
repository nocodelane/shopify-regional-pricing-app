import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  InlineStack,
  Divider,
  Badge,
  Grid,
  Box,
  Icon,
  Banner,
  Button,
  ProgressBar,
  List,
} from "@shopify/polaris";
import {
  ViewIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  MagicIcon,
  InfoIcon,
  SearchIcon,
  AppsIcon,
  FlagIcon,
  TargetIcon,
  ChartLineIcon,
  PlayIcon,
} from "@shopify/polaris-icons";

export default function AppGuide() {
  return (
    <Page 
        title="Launch Blueprint" 
        subtitle="Your strategic roadmap to regional market dominance."
        primaryAction={{ content: 'Initialize Setup', icon: PlayIcon }}
    >
      <BlockStack gap="600">
        
        {/* Launch Readiness Tracker */}
        <Card background="bg-surface-secondary">
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                    <Text variant="headingMd" as="h2">Launch Readiness</Text>
                    <Text variant="bodySm" tone="subdued" as="p">System validation for regional deployment.</Text>
                </BlockStack>
                <Badge tone="attention">65% Complete</Badge>
            </InlineStack>
            <ProgressBar progress={65} size="medium" tone="success" />
            <Grid columns={{ xs: 1, sm: 3, md: 3 }}>
                <InlineStack gap="200" blockAlign="center">
                    <Icon source={CheckCircleIcon} tone="success" />
                    <Text variant="bodySm" as="span">App Embedded</Text>
                </InlineStack>
                <InlineStack gap="200" blockAlign="center">
                    <Icon source={CheckCircleIcon} tone="success" />
                    <Text variant="bodySm" as="span">Region Defined</Text>
                </InlineStack>
                <InlineStack gap="200" blockAlign="center">
                    <Icon source={InfoIcon} tone="caution" />
                    <Text variant="bodySm" tone="caution" as="span">Visuals Pending</Text>
                </InlineStack>
            </Grid>
          </BlockStack>
        </Card>

        {/* The Four Pillars */}
        <Box paddingBlockStart="200">
            <BlockStack gap="400">
                <Text variant="headingLg" as="h2">The Strategic Pillars</Text>
                <Grid gap={{ xs: '400', md: '600' }}>
                    <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3 }}>
                        <Card>
                            <BlockStack gap="400">
                                <Box background="bg-surface-info" padding="300" borderRadius="200" width="fit-content">
                                    <Icon source={FlagIcon} tone="info" />
                                </Box>
                                <BlockStack gap="100">
                                    <Text variant="headingMd" as="h3">Markets & Coverage</Text>
                                    <Text variant="bodySm" tone="subdued" as="p">Define your operational zones by pincodes and groups.</Text>
                                </BlockStack>
                                <Button icon={ChevronRightIcon}>Configure Regions</Button>
                            </BlockStack>
                        </Card>
                    </Grid.Cell>
                    <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3 }}>
                        <Card>
                            <BlockStack gap="400">
                                <Box background="bg-surface-success" padding="300" borderRadius="200" width="fit-content">
                                    <Icon source={TargetIcon} tone="success" />
                                </Box>
                                <BlockStack gap="100">
                                    <Text variant="headingMd" as="h3">Price Optimization</Text>
                                    <Text variant="bodySm" tone="subdued" as="p">Set regional multipliers and advanced pricing logic.</Text>
                                </BlockStack>
                                <Button icon={ChevronRightIcon}>Set Price Rules</Button>
                            </BlockStack>
                        </Card>
                    </Grid.Cell>
                    <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3 }}>
                        <Card>
                            <BlockStack gap="400">
                                <Box background="bg-surface-brand" padding="300" borderRadius="200" width="fit-content">
                                    <Icon source={MagicIcon} tone="info" />
                                </Box>
                                <BlockStack gap="100">
                                    <Text variant="headingMd" as="h3">Visual Experience</Text>
                                    <Text variant="bodySm" tone="subdued" as="p">Design localized countdowns, banners, and layouts.</Text>
                                </BlockStack>
                                <Button icon={ChevronRightIcon}>Enter Studio</Button>
                            </BlockStack>
                        </Card>
                    </Grid.Cell>
                    <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3 }}>
                        <Card>
                            <BlockStack gap="400">
                                <Box background="bg-surface-caution" padding="300" borderRadius="200" width="fit-content">
                                    <Icon source={ChartLineIcon} tone="caution" />
                                </Box>
                                <BlockStack gap="100">
                                    <Text variant="headingMd" as="h3">Demand Intelligence</Text>
                                    <Text variant="bodySm" tone="subdued" as="p">Analyze waitlists and unserved market heatmap.</Text>
                                </BlockStack>
                                <Button icon={ChevronRightIcon}>View Insights</Button>
                            </BlockStack>
                        </Card>
                    </Grid.Cell>
                </Grid>
            </BlockStack>
        </Box>

        {/* Deployment Strategies */}
        <Box paddingBlockStart="200">
            <BlockStack gap="400">
                <Text variant="headingLg" as="h2">Deployment Strategies</Text>
                <Layout>
                    <Layout.Section variant="oneThird">
                        <Card>
                            <BlockStack gap="400">
                                <Box width="fit-content">
                                    <Badge tone="magic">Level 1: Native Tags</Badge>
                                </Box>
                                <Text variant="headingMd" as="h3">Theme-First</Text>
                                <Text tone="subdued" as="p">Add "Visibility Tags" directly inside existing theme sections. Zero code required.</Text>
                                <Divider />
                                <List>
                                    <List.Item>Fastest implementation</List.Item>
                                    <List.Item>Best for simple banners</List.Item>
                                </List>
                            </BlockStack>
                        </Card>
                    </Layout.Section>
                    <Layout.Section variant="oneThird">
                        <Card>
                            <BlockStack gap="400">
                                <Box width="fit-content">
                                    <Badge tone="info">Level 2: Guard Rails</Badge>
                                </Box>
                                <Text variant="headingMd" as="h3">The Power Guard</Text>
                                <Text tone="subdued" as="p">Drag a "Visibility Guard" section above ANY stack of theme sections to lock them.</Text>
                                <Divider />
                                <List>
                                    <List.Item>Protects multiple sections</List.Item>
                                    <List.Item>Native Drag-and-Drop</List.Item>
                                </List>
                            </BlockStack>
                        </Card>
                    </Layout.Section>
                    <Layout.Section variant="oneThird">
                        <Card>
                            <BlockStack gap="400">
                                <Box width="fit-content">
                                    <Badge tone="warning">Level 3: Expert CSS</Badge>
                                </Box>
                                <Text variant="headingMd" as="h3">Developer Class</Text>
                                <Text tone="subdued" as="p">Use class <code>region-show-mumbai</code> in your theme settings to hide anything.</Text>
                                <Divider />
                                <List>
                                    <List.Item>Zero app blocks</List.Item>
                                    <List.Item>Unlimited flexibility</List.Item>
                                </List>
                            </BlockStack>
                        </Card>
                    </Layout.Section>
                </Layout>
            </BlockStack>
        </Box>

        {/* Intelligence Engine Visualization */}
        <Box paddingBlockStart="200">
            <Card>
                <BlockStack gap="400">
                    <InlineStack gap="200" blockAlign="center">
                        <Box background="bg-surface-info" padding="100" borderRadius="100">
                            <Icon source={InfoIcon} tone="info" />
                        </Box>
                        <Text variant="headingLg" as="h2">The Optimization Engine</Text>
                    </InlineStack>
                    
                    <Box padding="500" background="bg-surface-secondary" borderRadius="300">
                        <Grid>
                            <Grid.Cell columnSpan={{ xs: 6, md: 4 }}>
                                <BlockStack gap="200">
                                    <InlineStack gap="200" blockAlign="center">
                                        <Badge tone="info">01</Badge>
                                        <Text variant="headingSm" as="h4">Signal Capture</Text>
                                    </InlineStack>
                                    <Text variant="bodyMd" tone="subdued" as="p">
                                        Customer location is identified via ultra-fast Pincode lookup and cached securely at the edge.
                                    </Text>
                                </BlockStack>
                            </Grid.Cell>
                            
                            <Grid.Cell columnSpan={{ xs: 6, md: 4 }}>
                                <BlockStack gap="200">
                                    <InlineStack gap="200" blockAlign="center">
                                        <Badge tone="info">02</Badge>
                                        <Text variant="headingSm" as="h4">Logic Mapping</Text>
                                    </InlineStack>
                                    <Text variant="bodyMd" tone="subdued" as="p">
                                        Our intelligence engine maps the signal to your specific regional rules, multipliers, and visibility sets.
                                    </Text>
                                </BlockStack>
                            </Grid.Cell>
                            
                            <Grid.Cell columnSpan={{ xs: 6, md: 4 }}>
                                <BlockStack gap="200">
                                    <InlineStack gap="200" blockAlign="center">
                                        <Badge tone="info">03</Badge>
                                        <Text variant="headingSm" as="h4">Dynamic Morph</Text>
                                    </InlineStack>
                                    <Text variant="bodyMd" tone="subdued" as="p">
                                        Your storefront instantly transforms pricing and content without layout shifts or speed impact.
                                    </Text>
                                </BlockStack>
                            </Grid.Cell>
                        </Grid>
                    </Box>

                    <Banner tone="info">
                        <Text as="p">Our engine operates at the <strong>edge</strong>, ensuring zero impact on your PageSpeed or SEO scores.</Text>
                    </Banner>
                </BlockStack>
            </Card>
        </Box>

        {/* Footer Support */}
        <Box paddingBlockStart="400" paddingBlockEnd="600">
            <InlineStack align="center">
                <BlockStack gap="200" align="center">
                    <Text variant="bodySm" tone="subdued" as="p">Intelligence Hub & Optimization Guide</Text>
                    <InlineStack gap="400">
                        <Button variant="plain">Technical Docs</Button>
                        <Button variant="plain">Video Tutorials</Button>
                        <Button variant="plain">Speak with Growth Expert</Button>
                    </InlineStack>
                </BlockStack>
            </InlineStack>
        </Box>

      </BlockStack>
    </Page>
  );
}
