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
            This app empowers you to <b>personalize prices, hide restricted items, and show localized banners</b> based strictly on the exact pincode your customer is shopping from.
          </p>
        </CalloutCard>

        {/* Quick Start Guide */}
        <Card>
          <Box padding="400">
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2" alignment="center">At a Glance: 3 Steps to Personalization</Text>
              <Box paddingBlockStart="200">
                <Grid>
                  <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2}}>
                    <BlockStack gap="300" inlineAlign="center">
                      <Box padding="300" background="bg-surface-secondary" borderRadius="full">
                        <Icon source={LocationIcon} tone="info" />
                      </Box>
                      <Text variant="headingSm" as="h3" alignment="center">1. Map Regions</Text>
                      <Text variant="bodySm" tone="subdued" as="p" alignment="center">Define states or cities in the <code>Coverage Hub</code>.</Text>
                    </BlockStack>
                  </Grid.Cell>
                  <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2}}>
                    <BlockStack gap="300" inlineAlign="center">
                      <Box padding="300" background="bg-surface-secondary" borderRadius="full">
                        <Icon source={MagicIcon} tone="magic" />
                      </Box>
                      <Text variant="headingSm" as="h3" alignment="center">2. Apply Logic</Text>
                      <Text variant="bodySm" tone="subdued" as="p" alignment="center">Set multipliers or hide tags in <code>Regional Logic</code>.</Text>
                    </BlockStack>
                  </Grid.Cell>
                  <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2}}>
                    <BlockStack gap="300" inlineAlign="center">
                      <Box padding="300" background="bg-surface-secondary" borderRadius="full">
                        <Icon source={CheckCircleIcon} tone="success" />
                      </Box>
                      <Text variant="headingSm" as="h3" alignment="center">3. Go Live</Text>
                      <Text variant="bodySm" tone="subdued" as="p" alignment="center">Add the App Block to your Theme Header.</Text>
                    </BlockStack>
                  </Grid.Cell>
                </Grid>
              </Box>
            </BlockStack>
          </Box>
        </Card>

        <Divider />

        {/* Deep Dive Sections */}
        <Text variant="headingLg" as="h2">Core Capabilities</Text>

        <Grid>
          {/* Feature 1 */}
          <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 2}}>
            <Box paddingBlockStart="400">
              <BlockStack gap="300">
                <InlineStack gap="200" blockAlign="center">
                  <Icon source={CashDollarIcon} tone="success" />
                  <Text variant="headingMd" as="h3">Dynamic Pricing</Text>
                </InlineStack>
                <Text tone="subdued" as="p">Adjust prices automatically based on location.</Text>
              </BlockStack>
            </Box>
          </Grid.Cell>
          <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 4}}>
            <Card>
              <BlockStack gap="400">
                <Text variant="bodyMd" as="p">
                  Stop losing margin on high-cost shipping zones or missing sales in lower-income regions.
                </Text>
                <List>
                  <List.Item><b>Fixed Overrides:</b> Force a specific price for a SKU in a specific city.</List.Item>
                  <List.Item><b>Global Multipliers:</b> Increase all prices in North-East states by 15% to cover logistics.</List.Item>
                  <List.Item><b>Waitlist Monetization:</b> If you don&apos;t ship to a zone yet, collect emails and offer a discount for when you launch there.</List.Item>
                </List>
              </BlockStack>
            </Card>
          </Grid.Cell>

          {/* Feature 2 */}
          <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 2}}>
            <Box paddingBlockStart="400">
              <BlockStack gap="300">
                <InlineStack gap="200" blockAlign="center">
                  <Icon source={ViewIcon} tone="caution" />
                  <Text variant="headingMd" as="h3">Visibility Logic</Text>
                </InlineStack>
                <Text tone="subdued" as="p">Hide products before a customer adds them to their cart.</Text>
              </BlockStack>
            </Box>
          </Grid.Cell>
          <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 4}}>
            <Card>
              <BlockStack gap="400">
                <Text variant="bodyMd" as="p">
                  Ensure legal compliance and regional exclusivity without maintaining multiple stores.
                </Text>
                <List>
                  <List.Item><b>Tag-Based Hiding:</b> Hide all items tagged <code>&apos;Alcohol&apos;</code> in dry states.</List.Item>
                  <List.Item><b>Collection Exclusivity:</b> Show your <code>&apos;Winter Wear&apos;</code> collection only to customers in cold regions.</List.Item>
                  <List.Item><b>Ghost Mode:</b> Restricted items are completely removed from the DOM, preventing broken layouts or ghost spaces.</List.Item>
                </List>
              </BlockStack>
            </Card>
          </Grid.Cell>

          {/* Feature 3 */}
          <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 2}}>
            <Box paddingBlockStart="400">
              <BlockStack gap="300">
                <InlineStack gap="200" blockAlign="center">
                  <Icon source={MagicIcon} tone="magic" />
                  <Text variant="headingMd" as="h3">Regional Experience</Text>
                </InlineStack>
                <Text tone="subdued" as="p">Transform your homepage banner and messaging dynamically.</Text>
              </BlockStack>
            </Box>
          </Grid.Cell>
          <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 4}}>
            <Card>
              <BlockStack gap="400">
                <Text variant="bodyMd" as="p">
                  Make every shopper feel localized with personalized content.
                </Text>
                <List>
                  <List.Item><b>Dynamic Banners:</b> Use the <code>Regional Components</code> studio to swap imagery (e.g. show local landmarks).</List.Item>
                  <List.Item><b>Trust Phrases:</b> Change button text from &quot;Enter Pincode&quot; to &quot;Fast Shipping to Delhi&quot; automatically.</List.Item>
                  <List.Item><b>Glassmorphism Design:</b> Use our pre-built themes in <code>Experience Studio</code> to match your store&apos;s aesthetic.</List.Item>
                </List>
              </BlockStack>
            </Card>
          </Grid.Cell>
        </Grid>

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
            
            <Grid>
               <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6}}>
                  <Card>
                    <Box padding="500">
                      <BlockStack gap="800">
                        <BlockStack gap="300">
                           <InlineStack gap="400" blockAlign="center">
                              <Box minWidth="100px"><Badge tone="info">1. Detection</Badge></Box>
                              <Text as="p" variant="bodyMd">Customer enters a Pincode or chooses &quot;Auto-Detect&quot;. The choice is saved in a secure browser cookie to ensure persistence across sessions.</Text>
                           </InlineStack>
                        </BlockStack>
                        
                        <div style={{ paddingLeft: '40px', opacity: 0.2 }}>
                           <Icon source={ChevronRightIcon} tone="subdued" />
                        </div>
 
                        <BlockStack gap="300">
                           <InlineStack gap="400" blockAlign="center">
                              <Box minWidth="100px"><Badge tone="attention">2. Identification</Badge></Box>
                              <Text as="p" variant="bodyMd">Our liquid blocks instantly map that Pincode to your defined <b>Regions</b>. If no match exists, it defaults to your <b>Global Settings</b>.</Text>
                           </InlineStack>
                        </BlockStack>
 
                        <div style={{ paddingLeft: '40px', opacity: 0.2 }}>
                           <Icon source={ChevronRightIcon} tone="subdued" />
                        </div>
 
                        <BlockStack gap="300">
                           <InlineStack gap="400" blockAlign="center" align="start">
                              <Box minWidth="100px"><Badge tone="success">3. Transformation</Badge></Box>
                              <Box width="100%">
                                <Text as="p" variant="bodyMd">The Storefront API returns precise multipliers and visibility rules. Your site content &quot;morphs&quot; to show the correct local price and availability instantly.</Text>
                              </Box>
                           </InlineStack>
                        </BlockStack>
                      </BlockStack>
                    </Box>
                  </Card>
               </Grid.Cell>
            </Grid>
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


