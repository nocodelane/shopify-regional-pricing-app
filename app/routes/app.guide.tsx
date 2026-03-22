import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  InlineStack,
  CalloutCard,
  Divider,
  List,
  Badge,
  Grid,
  Box,
  Icon,
  Banner,
} from "@shopify/polaris";
import {
  CashDollarIcon,
  ViewIcon,
  LocationIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  MagicIcon,
  InfoIcon,
  SearchIcon,
  AppsIcon,
  CodeIcon,
} from "@shopify/polaris-icons";

export default function AppGuide() {
  return (
    <Page title="The Regional Playbook" subtitle="Master the tools to scale your business locally.">
      <BlockStack gap="600">
        
        {/* Intro Banner */}
        <CalloutCard
          title="Welcome to Pincode-Based Dynamic Pricing"
          illustration="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          primaryAction={{
            content: "Set up my first Region",
            url: "/app/pincodes",
          }}
        >
          <p>
            Your store is no longer confined to a single global strategy. 
            This app empowers you to <b>personalize prices, hide restricted items, and show localized content</b> based strictly on the exact location your customer is shopping from.
          </p>
        </CalloutCard>

        {/* Toolkit Header */}
        <Box paddingBlockStart="400">
            <BlockStack gap="200">
                <Text variant="headingLg" as="h2">Your Regional Toolkit</Text>
                <Text tone="subdued" as="p">Choose the method that best fits your theme and workflow.</Text>
            </BlockStack>
        </Box>

        <Layout>
          {/* Method 1: The Easiest Way */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="300">
                        <InlineStack gap="200">
                            <Icon source={MagicIcon} tone="magic" />
                            <Badge tone="magic">Easy Mode</Badge>
                        </InlineStack>
                        <Text variant="headingMd" as="h3">Visibility Tags</Text>
                        <Text tone="subdued" as="p">The most natural way to control visibility directly in the Theme Editor.</Text>
                    </BlockStack>
                </Box>
            </BlockStack>
          </Layout.Section>
          <Layout.Section >
            <Card>
                <BlockStack gap="400">
                    <Text variant="bodyMd" as="p">
                        Add a small "Tag" block <b>inside</b> any existing theme section (like an Image Banner or Featured Collection).
                    </Text>
                    <List>
                        <List.Item><b>How to use:</b> Inside your section, click <b>"Add Block"</b> → select <code>Regional Visibility Tag</code>.</List.Item>
                        <List.Item><b>Configuration:</b> Enter the region name in the block settings. The entire parent section will automatically hide for other regions.</List.Item>
                        <List.Item><b>Zero Flicker:</b> Our engine hides the section before the page even paints.</List.Item>
                    </List>
                </BlockStack>
            </Card>
          </Layout.Section>

          {/* Method 2: Professional Guards */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="300">
                        <InlineStack gap="200">
                            <Icon source={ViewIcon} tone="info" />
                            <Badge tone="info">Professional</Badge>
                        </InlineStack>
                        <Text variant="headingMd" as="h3">Visibility Guards</Text>
                        <Text tone="subdued" as="p">Control any series of sections by dragging a "Guard" above them.</Text>
                    </BlockStack>
                </Box>
            </BlockStack>
          </Layout.Section>
          <Layout.Section >
            <Card>
                <BlockStack gap="400">
                    <Text variant="bodyMd" as="p">
                        Perfect for sections that don't support app blocks or for locking down an entire page area.
                    </Text>
                    <List>
                        <List.Item><b>How to use:</b> In the Theme Editor sidebar, add the <code>Regional Visibility Guard</code> section.</List.Item>
                        <List.Item><b>Placement:</b> Drag it directly <b>above</b> the section you want to control.</List.Item>
                        <List.Item><b>Strict Control:</b> Use "Invert Logic" to hide sections for specific regions while showing them globally.</List.Item>
                    </List>
                </BlockStack>
            </Card>
          </Layout.Section>

          {/* Method 3: Expert Classes */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="300">
                        <InlineStack gap="200">
                            <Icon source={SearchIcon} tone="warning" />
                            <Badge tone="warning">Expert</Badge>
                        </InlineStack>
                        <Text variant="headingMd" as="h3">Universal CSS Classes</Text>
                        <Text tone="subdued" as="p">The ultimate zero-block method for theme developers.</Text>
                    </BlockStack>
                </Box>
            </BlockStack>
          </Layout.Section>
          <Layout.Section >
            <Card>
                <BlockStack gap="400">
                    <Text variant="bodyMd" as="p">
                        No app blocks needed. Simply tag sections using their native "CSS Class" field.
                    </Text>
                    <List>
                        <List.Item><b>The Class:</b> Add <code>region-show-mumbai</code> to any section's class list.</List.Item>
                        <List.Item><b>The Result:</b> The section will only appear when the customer's region is set to Mumbai.</List.Item>
                        <List.Item><b>Compatibility:</b> Works with any OS 2.0 theme that supports Section CSS Classes.</List.Item>
                    </List>
                </BlockStack>
            </Card>
          </Layout.Section>

          {/* Method 4: Dynamic Component Hub */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="300">
                        <InlineStack gap="200">
                            <Icon source={AppsIcon} tone="success" />
                            <Badge tone="success">Advanced</Badge>
                        </InlineStack>
                        <Text variant="headingMd" as="h3">Component Hub</Text>
                        <Text tone="subdued" as="p">Design complex regional layouts once, then place them anywhere.</Text>
                    </BlockStack>
                </Box>
            </BlockStack>
          </Layout.Section>
          <Layout.Section >
            <Card>
                <BlockStack gap="400">
                    <Text variant="bodyMd" as="p">
                        Use our built-in <b>Component Studio</b> to create Countdown Timers, Product Lists, Delivery Widgets, and Custom Liquid.
                    </Text>
                    <List>
                        <List.Item><b>Studio:</b> Create your design in the <code>Experience Tab</code> and get a Component ID.</List.Item>
                        <List.Item><b>Placement:</b> Add the <code>Regional Placement</code> block in your theme and paste the ID.</List.Item>
                        <List.Item><b>Multi-Content:</b> One block can show a Banner in Mumbai and a Timer in London.</List.Item>
                    </List>
                </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Divider />

        {/* Technical How it Works */}
        <Box paddingBlockStart="200">
          <BlockStack gap="400">
            <InlineStack gap="200">
              <Icon source={InfoIcon} tone="base" />
              <Text variant="headingLg" as="h2">How the Magic Works</Text>
            </InlineStack>
            <Banner tone="info">
              <p>Understanding the data flow ensures you can troubleshoot and optimize your regional strategy effectively.</p>
            </Banner>
            
            <Layout>
               <Layout.Section>
                  <Card>
                    <Box padding="500">
                      <Grid columns={{xs: 2, sm: 3, md: 3}}>
                        <Grid.Cell columnSpan={{xs: 2, sm: 1, md: 1}}>
                            <BlockStack gap="300">
                                <Badge tone="info">1. Detection</Badge>
                                <Text as="p" variant="bodyMd">Customer enters a Pincode or chooses "Auto-Detect". The choice is saved in a secure browser cookie for persistence.</Text>
                            </BlockStack>
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{xs: 2, sm: 1, md: 1}}>
                            <BlockStack gap="300">
                                <Badge tone="attention">2. Identification</Badge>
                                <Text as="p" variant="bodyMd">Our liquid blocks instantly map that Pincode to your defined <b>Regions</b>. If no match exists, it defaults to your <b>Global Settings</b>.</Text>
                            </BlockStack>
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{xs: 2, sm: 1, md: 1}}>
                            <BlockStack gap="300">
                                <Badge tone="success">3. Transformation</Badge>
                                <Text as="p" variant="bodyMd">The Storefront API returns precise multipliers and visibility rules. Your site content "morphs" to show the correct local price instantly.</Text>
                            </BlockStack>
                        </Grid.Cell>
                      </Grid>
                    </Box>
                  </Card>
               </Layout.Section>
            </Layout>
          </BlockStack>
        </Box>

        {/* Final Help Footer */}
        <Box paddingBlockStart="400" paddingBlockEnd="600">
          <Card>
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="100">
                <Text variant="headingMd" as="h3">Need deeper assistance?</Text>
                <Text tone="subdued" as="p">Our optimization guides and support are available via the dashboard link.</Text>
              </BlockStack>
              <Badge tone="success">V 1.2.0 Active</Badge>
            </InlineStack>
          </Card>
        </Box>

      </BlockStack>
    </Page>
  );
}
