import { useState, useCallback, useEffect } from "react";
import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useFetcher, useSearchParams, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Tabs,
  Text,
  Badge,
  Button,
  BlockStack,
  InlineStack,
  Box,
  Divider,
  ResourceList,
  ResourceItem,
  Modal,
  TextField,
  Select,
  Icon,
  Banner,
  EmptyState,
  Avatar,
  SkeletonPage,
  Grid,
  ButtonGroup,
  Tooltip,
} from "@shopify/polaris";
import {
  PlusIcon,
  DeleteIcon,
  EditIcon,
  SearchIcon,
  RefreshIcon,
  CollectionIcon,
  ProductIcon,
  ChevronRightIcon,
  CalendarIcon,
  SettingsIcon,
  ViewIcon,
  PinIcon,
  AdjustIcon,
  CheckIcon,
  ListBulletedIcon,
  AppsIcon,
  InfoIcon,
} from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import crypto from "node:crypto";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  const [regions, pricingRules, productRules, collectionRules, tagRules, colResponse] = await Promise.all([
    prisma.region.findMany({ where: { shop }, orderBy: { name: 'asc' } }),
    prisma.pricingRule.findMany({ where: { shop }, include: { region: true } }),
    prisma.productRegionRule.findMany({ where: { shop } }),
    prisma.collectionRegionRule.findMany({ where: { shop } }),
    (prisma as any).tagRegionRule.findMany({ where: { shop }, include: { region: true } }),
    admin.graphql(`query { collections(first: 50) { nodes { id title handle } } }`)
  ]);

  const colData: any = await colResponse.json();
  const collections = colData.data.collections.nodes;
  const cacheCount = await prisma.productCache.count({ where: { shop } });

  return json({ regions, pricingRules, productRules, collectionRules, tagRules, collections, cacheCount });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "sync") {
    const response = await admin.graphql(`
      query {
        products(first: 50) {
          nodes {
            id
            handle
            tags
            collections(first: 10) { nodes { id } }
          }
        }
      }
    `);
    const data: any = await response.json();
    const products = data.data.products.nodes;

    for (const prod of products) {
        const collections = prod.collections.nodes.map((c: any) => c.id);
        await prisma.productCache.upsert({
            where: { id: prod.id },
            update: {
                tags: prod.tags.join(","),
                collections: JSON.stringify(collections),
                updatedAt: new Date()
            },
            create: {
                id: prod.id,
                shop,
                tags: prod.tags.join(","),
                collections: JSON.stringify(collections),
                updatedAt: new Date()
            }
        });
    }
    return json({ success: true });
  }

  const safeParseDate = (val: any) => {
    if (!val || val === "null" || val === "" || val === "undefined") return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  // Pricing Rule Persistence
  if (intent === "pricing-save") {
    const id = (formData.get("id") as string) || crypto.randomUUID();
    const regionId = formData.get("regionId") as string;
    const type = formData.get("type") as string;
    const value = parseFloat(formData.get("value") as string);
    const collectionId = formData.get("collectionId") || null;
    const collectionHandle = formData.get("collectionHandle") || null;
    const productId = formData.get("productId") || null;
    const productHandle = formData.get("productHandle") || null;
    const startTime = safeParseDate(formData.get("startTime"));
    const endTime = safeParseDate(formData.get("endTime"));

    const data = {
        shop,
        regionId,
        type,
        value,
        collectionId: collectionId as string | null,
        collectionHandle: collectionHandle as string | null,
        productId: productId as string | null,
        productHandle: productHandle as string | null,
        startTime,
        endTime,
    };

    await prisma.pricingRule.upsert({
        where: { id },
        update: { ...data, updatedAt: new Date() },
        create: { ...data, id, createdAt: new Date(), updatedAt: new Date() }
    });
    return json({ success: true });
  }

  if (intent === "pricing-delete") {
    await prisma.pricingRule.delete({ where: { id: formData.get("id") as string } });
    return json({ success: true });
  }

  // Visibility Rule Persistence
  if (intent === "visibility-add") {
    const regionId = formData.get("regionId") as string;
    const type = formData.get("type") as string;
    const items = JSON.parse(formData.get("items") as string);

    if (type === "product") {
        await prisma.productRegionRule.createMany({
            data: items.map((item: any) => ({
                shop,
                regionId,
                productId: item.id,
                productHandle: item.handle,
                allowed: false
            }))
        });
    } else {
        await prisma.collectionRegionRule.createMany({
            data: items.map((item: any) => ({
                shop,
                regionId,
                collectionId: item.id,
                collectionHandle: item.handle,
                allowed: false
            }))
        });
    }
    return json({ success: true });
  }

  if (intent === "visibility-delete") {
    const type = formData.get("type") as string;
    const id = formData.get("id") as string;
    if (type === "product") {
        await prisma.productRegionRule.delete({ where: { id } });
    } else {
        await prisma.collectionRegionRule.delete({ where: { id } });
    }
    return json({ success: true });
  }

  // Tag Rule Persistence
  if (intent === "tag-save") {
    await (prisma as any).tagRegionRule.create({
      data: {
        shop,
        tag: formData.get("tag") as string,
        regionId: formData.get("regionId") as string,
        allowed: formData.get("allowed") === "true",
      }
    });
    return json({ success: true });
  }

  if (intent === "tag-delete") {
    await (prisma as any).tagRegionRule.delete({ where: { id: formData.get("id") as string } });
    return json({ success: true });
  }

  return json({ success: true });
};

export default function RegionalLogic() {
  const { regions, pricingRules, productRules, collectionRules, tagRules, collections, cacheCount } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const fetcher = useFetcher();
  const [searchParams, setSearchParams] = useSearchParams();
  const shopify = useAppBridge();
  const navigation = useNavigation();

  const initialTab = parseInt(searchParams.get("tab") || "0");
  const [selectedTab, setSelectedTab] = useState(initialTab);
  const [activeRegionId, setActiveRegionId] = useState<string>(regions[0]?.id || "");
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [editingPricing, setEditingPricing] = useState<any>(null);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [newTagRule, setNewTagRule] = useState({ tag: "", regionId: regions[0]?.id || "", allowed: "false" });
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');

  const tabs = [
    { id: 'pricing', content: 'Price Settings', panelID: 'pricing-panel' },
    { id: 'visibility', content: 'Hide Products', panelID: 'visibility-panel' },
    { id: 'tags', content: 'Automatic Rules', panelID: 'tags-panel' },
    { id: 'flash', content: 'Sales & Offers', panelID: 'flash-panel' },
  ];

  const handleTabChange = useCallback((selectedTabIndex: number) => {
    setSelectedTab(selectedTabIndex);
    setSearchParams({ tab: selectedTabIndex.toString() }, { replace: true });
  }, [setSearchParams]);

  const openPricingEditor = (rule: any = null) => {
    setEditingPricing(rule || {
        regionId: regions[0]?.id || "",
        type: "percentage",
        value: "1.0",
        collectionId: "",
        productId: "",
        productHandle: "",
        startTime: "",
        endTime: ""
    });
    setPricingModalOpen(true);
  };

  const handleVisibilityAdd = async (type: 'product' | 'collection') => {
    const selection = await shopify.resourcePicker({ type: type as any, multiple: true });
    if (selection && selection.selection.length > 0) {
        const items = selection.selection.map((s: any) => ({ id: s.id, handle: s.handle }));
        fetcher.submit({ intent: "visibility-add", regionId: activeRegionId, type, items: JSON.stringify(items) }, { method: "POST" });
    }
  };

  if (navigation.state === "loading" && !fetcher.state) {
    return <SkeletonPage title="Regional Logic" fullWidth backAction />;
  }

  const activeRegion = regions.find(r => r.id === activeRegionId);

  return (
    <Page 
        fullWidth
        title="Regional Rules Hub" 
        subtitle="Orchestrate your cross-region pricing and availability logic."
        backAction={{ content: 'Dashboard', url: '/app' }}
        primaryAction={selectedTab === 0 ? { content: 'Create Logic Rule', icon: PlusIcon, onAction: () => openPricingEditor() } : selectedTab === 2 ? { content: 'Create Tag Rule', icon: PlusIcon, onAction: () => setTagModalOpen(true) } : undefined}
    >
      <BlockStack gap="600">
        {/* Hub Intelligence Row */}
        <Grid>
           <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 4, lg: 3}}>
              <Card>
                 <BlockStack gap="200">
                    <InlineStack align="space-between">
                       <Text variant="headingSm" as="h3" tone="subdued">Pricing Rules</Text>
                       <Icon source={AdjustIcon} tone="info" />
                    </InlineStack>
                    <Text variant="headingLg" as="p">{pricingRules.length} Active</Text>
                 </BlockStack>
              </Card>
           </Grid.Cell>
           <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 4, lg: 3}}>
              <Card>
                 <BlockStack gap="200">
                    <InlineStack align="space-between">
                       <Text variant="headingSm" as="h3" tone="subdued">Visibility Bans</Text>
                       <Icon source={ViewIcon} tone="critical" />
                    </InlineStack>
                    <Text variant="headingLg" as="p">{productRules.length + collectionRules.length} Restrictions</Text>
                 </BlockStack>
              </Card>
           </Grid.Cell>
           <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 4, lg: 3}}>
              <Card>
                 <BlockStack gap="200">
                    <InlineStack align="space-between">
                       <Text variant="headingSm" as="h3" tone="subdued">Tag Flows</Text>
                       <Icon source={PinIcon} tone="success" />
                    </InlineStack>
                    <Text variant="headingLg" as="p">{tagRules.length} Automated</Text>
                 </BlockStack>
              </Card>
           </Grid.Cell>
           <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 4, lg: 3}}>
              <Card>
                 <BlockStack gap="200">
                    <InlineStack align="space-between">
                       <Text variant="headingSm" as="h3" tone="subdued">Catalog Sync</Text>
                       <Icon source={CheckIcon} tone="success" />
                    </InlineStack>
                    <Text variant="headingLg" as="p">{cacheCount} Items</Text>
                 </BlockStack>
              </Card>
           </Grid.Cell>
        </Grid>

        <Layout>
          <Layout.Section variant="oneThird">
             <Card padding="0">
                <Box padding="400" borderBlockEndWidth="025" borderColor="border-secondary">
                   <Text variant="headingMd" as="h2">Logic Pillars</Text>
                </Box>
                <Box padding="200">
                   <BlockStack gap="100">
                      {[
                        { id: 0, label: 'Price Settings', icon: AdjustIcon, count: pricingRules.length, desc: "Adjust product prices for different regions (e.g., higher prices in premium areas)." },
                        { id: 1, label: 'Hide Products', icon: ViewIcon, count: productRules.length + collectionRules.length, desc: "Choose specific products or collections to hide from customers in certain locations." },
                        { id: 2, label: 'Automatic Rules', icon: PinIcon, count: tagRules.length, desc: "Use product tags (like 'local-only') to automatically show or hide items across regions." },
                        { id: 3, label: 'Sales & Offers', icon: CalendarIcon, count: pricingRules.filter((r: any) => r.startTime).length, desc: "Schedule special regional discounts or flash sales for specific time periods." }
                      ].map((item) => {
                        const isActive = selectedTab === item.id;
                        return (
                          <div 
                            key={item.id} 
                            style={{ cursor: 'pointer' }} 
                            onClick={() => handleTabChange(item.id)}
                          >
                            <Box 
                              padding="300" 
                              borderRadius="200" 
                              background={isActive ? "bg-surface-secondary" : undefined}
                              shadow={isActive ? "100" : undefined}
                              borderInlineStartWidth={isActive ? "100" : "0"}
                              borderColor="border-info"
                            >
                               <InlineStack align="space-between" blockAlign="center">
                                  <InlineStack gap="300" blockAlign="center">
                                     <Icon source={item.icon} tone={isActive ? "info" : "subdued"} />
                                     <InlineStack gap="100" blockAlign="center">
                                      <Text variant="bodyMd" fontWeight={isActive ? "bold" : "regular"} as="span">
                                         {item.label}
                                      </Text>
                                      <Tooltip content={item.desc} dismissOnMouseOut>
                                          <Box padding="050">
                                              <Icon source={InfoIcon} tone="subdued" />
                                          </Box>
                                      </Tooltip>
                                     </InlineStack>
                                  </InlineStack>
                                  <Badge tone={isActive ? "info" : undefined} size="small">{item.count}</Badge>
                               </InlineStack>
                            </Box>
                          </div>
                        );
                      })}
                   </BlockStack>
                </Box>
             </Card>
          </Layout.Section>

          <Layout.Section>
            <Box paddingBlockStart="0">
                {selectedTab === 0 ? (
                    <BlockStack gap="400">
                        <InlineStack align="space-between" blockAlign="center">
                            <Text variant="headingMd" as="h2">Price Settings</Text>
                            <InlineStack gap="200">
                                <ButtonGroup variant="segmented">
                                    <Button pressed={viewMode === 'list'} onClick={() => setViewMode('list')} icon={ListBulletedIcon}>List</Button>
                                    <Button pressed={viewMode === 'card'} onClick={() => setViewMode('card')} icon={AppsIcon}>Cards</Button>
                                </ButtonGroup>
                                <Button variant="tertiary" icon={RefreshIcon} onClick={() => fetcher.submit({ intent: "sync" }, { method: "POST" })}>Sync Catalog</Button>
                            </InlineStack>
                        </InlineStack>
                        
                        {pricingRules.length === 0 ? (
                            <Card>
                                <EmptyState heading="No logic rules defined" action={{ content: 'Create First Rule', onAction: () => openPricingEditor() }} image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png">
                                    <p>Define how prices should morph based on visitor location.</p>
                                </EmptyState>
                            </Card>
                        ) : viewMode === 'card' ? (
                            <Grid>
                                {pricingRules.map((rule: any) => (
                                    <Grid.Cell key={rule.id} columnSpan={{xs: 6, sm: 6, md: 6, lg: 6}}>
                                        <Box 
                                            borderStyle="solid" 
                                            borderWidth="050" 
                                            borderColor="border-emphasis" 
                                            borderRadius="400" 
                                            padding="500" 
                                            background="bg-surface"
                                            shadow="100"
                                        >
                                            <BlockStack gap="400">
                                            <InlineStack align="space-between">
                                                <Badge tone="info">{rule.region?.name || "All Regions"}</Badge>
                                                <InlineStack gap="100">
                                                    <Button icon={EditIcon} variant="tertiary" onClick={() => openPricingEditor(rule)} />
                                                    <Button icon={DeleteIcon} tone="critical" variant="tertiary" onClick={() => submit({ id: rule.id, intent: 'pricing-delete' }, { method: 'POST' })} />
                                                </InlineStack>
                                            </InlineStack>
                                            
                                            <BlockStack gap="200">
                                                <InlineStack gap="300" blockAlign="center">
                                                    <Box padding="200" background="bg-surface-secondary" borderRadius="full">
                                                        <Icon source={rule.productId ? ProductIcon : rule.collectionId ? CollectionIcon : SettingsIcon} tone="base" />
                                                    </Box>
                                                    <BlockStack gap="050">
                                                        <Text variant="headingMd" as="h4">
                                                            {rule.productId ? rule.productHandle : rule.collectionId ? rule.collectionHandle : "Storewide Base"}
                                                        </Text>
                                                        <Text variant="bodySm" tone="subdued" as="p">{rule.productId ? "Specific Product" : rule.collectionId ? "Collection Scope" : "Global Adjustment"}</Text>
                                                    </BlockStack>
                                                </InlineStack>
                                            </BlockStack>

                                            <Box padding="400" background="bg-surface-tertiary" borderRadius="200" borderStyle="dashed" borderWidth="025" borderColor="border-info">
                                                <InlineStack align="space-between" blockAlign="center">
                                                    <BlockStack gap="100">
                                                        <Text variant="bodySm" tone="subdued" as="p">Logic Action</Text>
                                                        <Text variant="headingXl" as="span" tone="success">
                                                            {rule.type === 'percentage' ? `${rule.value}x` : rule.type === 'fixed_adjustment' ? `${rule.value > 0 ? '+' : ''}${rule.value}` : `Override: ${rule.value}`}
                                                        </Text>
                                                    </BlockStack>
                                                    {rule.startTime && (
                                                        <Badge icon={CalendarIcon} tone="attention">On Schedule</Badge>
                                                    )}
                                                </InlineStack>
                                            </Box>
                                            </BlockStack>
                                        </Box>
                                    </Grid.Cell>
                                ))}
                            </Grid>
                        ) : (
                            <Card padding="0">
                                <ResourceList
                                    resourceName={{ singular: 'rule', plural: 'rules' }}
                                    items={pricingRules}
                                    renderItem={(rule: any) => (
                                        <ResourceItem id={rule.id} onClick={() => openPricingEditor(rule)}>
                                            <InlineStack align="space-between" blockAlign="center">
                                                <InlineStack gap="400" blockAlign="center">
                                                    <Box padding="200" background="bg-surface-secondary" borderRadius="full">
                                                        <Icon source={rule.productId ? ProductIcon : rule.collectionId ? CollectionIcon : SettingsIcon} tone="subdued" />
                                                    </Box>
                                                    <BlockStack gap="100">
                                                        <InlineStack gap="200" blockAlign="center">
                                                            <Badge tone="info">{rule.region?.name || "Global"}</Badge>
                                                            <Text variant="bodyMd" fontWeight="bold" as="span">
                                                                {rule.productId ? rule.productHandle : rule.collectionId ? rule.collectionHandle : "Global Storewide"}
                                                            </Text>
                                                        </InlineStack>
                                                        {rule.startTime && <Text variant="bodySm" tone="subdued" as="p">{`Scheduled: ${new Date(rule.startTime).toLocaleDateString()}`}</Text>}
                                                    </BlockStack>
                                                </InlineStack>
                                                <InlineStack gap="400" blockAlign="center">
                                                    <Text variant="headingMd" tone="success" as="span">
                                                        {rule.type === 'percentage' ? `${rule.value}x` : rule.type === 'fixed_adjustment' ? `${rule.value > 0 ? '+' : ''}${rule.value}` : `Override: ${rule.value}`}
                                                    </Text>
                                                    <InlineStack gap="100">
                                                        <Button icon={EditIcon} variant="tertiary" onClick={() => openPricingEditor(rule)} />
                                                        <Button icon={DeleteIcon} tone="critical" variant="tertiary" onClick={() => submit({ id: rule.id, intent: 'pricing-delete' }, { method: 'POST' })} />
                                                    </InlineStack>
                                                </InlineStack>
                                            </InlineStack>
                                        </ResourceItem>
                                    )}
                                />
                            </Card>
                        )}

                        <Box paddingBlockStart="400">
                             <Banner tone="info" title="Pricing Engine Logic">
                                <Text as="p">Multiplier rules (e.g. 1.2x) are applied to the base price first. Fixed adjustments are added afterwards.</Text>
                            </Banner>
                        </Box>
                    </BlockStack>
                ) : selectedTab === 1 ? (
                    <Layout>
                        <Layout.Section variant="oneThird">
                            <Card padding="0">
                                <Box padding="400" borderBlockEndWidth="025" borderColor="border-secondary">
                                    <Text variant="headingMd" as="h2">Filter By Region</Text>
                                </Box>
                                <ResourceList
                                    resourceName={{ singular: 'region', plural: 'regions' }}
                                    items={regions}
                                    renderItem={(region: any) => {
                                        const isActive = activeRegionId === region.id;
                                        return (
                                            <ResourceItem id={region.id} onClick={() => setActiveRegionId(region.id)}>
                                                <InlineStack align="space-between" blockAlign="center">
                                                    <InlineStack gap="300" blockAlign="center">
                                                        <Avatar customer size="sm" name={region.name} />
                                                        <Text variant="bodyMd" fontWeight={isActive ? "bold" : "regular"} as="span">{region.name}</Text>
                                                    </InlineStack>
                                                    {isActive && <Icon source={ChevronRightIcon} tone="base" />}
                                                </InlineStack>
                                            </ResourceItem>
                                        );
                                    }}
                                />
                            </Card>
                        </Layout.Section>
                        <Layout.Section>
                            {activeRegion ? (
                                <Card padding="0">
                                    <Box padding="400" borderBlockEndWidth="025" borderColor="border-secondary">
                                        <InlineStack align="space-between" blockAlign="center">
                                            <BlockStack gap="100">
                                                <Text variant="headingMd" as="h2">{`Hide Products: ${activeRegion.name}`}</Text>
                                                <Text variant="bodySm" tone="subdued" as="p">Select items to HIDE for this region.</Text>
                                            </BlockStack>
                                            <InlineStack gap="200">
                                                <Button size="slim" icon={CollectionIcon} onClick={() => handleVisibilityAdd('collection')}>Hide Collections</Button>
                                                <Button size="slim" variant="primary" icon={ProductIcon} onClick={() => handleVisibilityAdd('product')}>Hide Products</Button>
                                            </InlineStack>
                                        </InlineStack>
                                    </Box>
                                    <Box padding="400">
                                        <BlockStack gap="400">
                                            <Text variant="headingSm" as="h3">Restricted Collections</Text>
                                            <ResourceList
                                                resourceName={{ singular: 'collection', plural: 'collections' }}
                                                items={collectionRules.filter((r: any) => r.regionId === activeRegionId)}
                                                renderItem={(rule: any) => (
                                                    <ResourceItem id={rule.id} onClick={() => {}}>
                                                        <InlineStack align="space-between">
                                                            <InlineStack gap="200">
                                                                <Icon source={CollectionIcon} />
                                                                <Text variant="bodyMd" fontWeight="bold" as="span">{rule.collectionHandle}</Text>
                                                            </InlineStack>
                                                            <Button icon={DeleteIcon} tone="critical" variant="tertiary" onClick={() => fetcher.submit({ intent: "visibility-delete", type: "collection", id: rule.id }, { method: "POST" })} />
                                                        </InlineStack>
                                                    </ResourceItem>
                                                )}
                                            />
                                            {collectionRules.filter((r: any) => r.regionId === activeRegionId).length === 0 && <Text tone="subdued" alignment="center" as="p">All collections visible.</Text>}
                                            
                                            <Divider />
                                            
                                            <Text variant="headingSm" as="h3">Restricted Products</Text>
                                            <ResourceList
                                                resourceName={{ singular: 'product', plural: 'products' }}
                                                items={productRules.filter((r: any) => r.regionId === activeRegionId)}
                                                renderItem={(rule: any) => (
                                                    <ResourceItem id={rule.id} onClick={() => {}}>
                                                        <InlineStack align="space-between">
                                                            <InlineStack gap="200">
                                                                <Icon source={ProductIcon} />
                                                                <Text variant="bodyMd" fontWeight="bold" as="span">{rule.productHandle}</Text>
                                                            </InlineStack>
                                                            <Button icon={DeleteIcon} tone="critical" variant="tertiary" onClick={() => fetcher.submit({ intent: "visibility-delete", type: "product", id: rule.id }, { method: "POST" })} />
                                                        </InlineStack>
                                                    </ResourceItem>
                                                )}
                                            />
                                            {productRules.filter((r: any) => r.regionId === activeRegionId).length === 0 && <Text tone="subdued" alignment="center" as="p">No products hidden.</Text>}
                                        </BlockStack>
                                    </Box>
                                </Card>
                            ) : (
                                <Card>
                                     <EmptyState heading="Select a region" image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png">
                                         <p>Choose a region from the filter list to manage its custom visibility rules.</p>
                                     </EmptyState>
                                </Card>
                            )}
                        </Layout.Section>
                    </Layout>
                ) : selectedTab === 2 ? (
                    <BlockStack gap="400">
                        <Card padding="0">
                            <Box padding="400" borderBlockEndWidth="025" borderColor="border-secondary">
                                <InlineStack align="space-between">
                                    <Text variant="headingMd" as="h2">Automatic Rules</Text>
                                    <Button variant="primary" icon={PlusIcon} onClick={() => setTagModalOpen(true)}>Add Tag Rule</Button>
                                </InlineStack>
                            </Box>
                            <ResourceList
                                resourceName={{ singular: 'rule', plural: 'rules' }}
                                items={tagRules}
                                renderItem={(rule: any) => (
                                    <ResourceItem id={rule.id} onClick={() => {}}>
                                        <InlineStack align="space-between" blockAlign="center">
                                            <BlockStack gap="100">
                                                <InlineStack gap="200" blockAlign="center">
                                                    <Badge tone="info">{rule.tag}</Badge>
                                                    <Text variant="bodyMd" as="span">is <b>{rule.allowed ? "Allowed" : "Restricted"}</b> in</Text>
                                                    <Badge tone="info">{rule.region.name}</Badge>
                                                </InlineStack>
                                            </BlockStack>
                                            <Button icon={DeleteIcon} tone="critical" variant="tertiary" onClick={() => submit({ id: rule.id, intent: 'tag-delete' }, { method: "POST" })}>Remove</Button>
                                        </InlineStack>
                                    </ResourceItem>
                                )}
                            />
                            {tagRules.length === 0 && (
                                <EmptyState heading="No tag rules" action={{ content: 'Add Your First Rule', onAction: () => setTagModalOpen(true) }} image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png">
                                    <p>Automatically allow or restrict products based on their Shopify tags.</p>
                                </EmptyState>
                            )}
                        </Card>
                        <Banner title="Pro Tip: Bulk Management" icon={SettingsIcon}>
                             <p>Tag rules are great for bulk management. For example, tag fragile items with <code>local-only</code> and restrict that tag in distant regions.</p>
                        </Banner>
                    </BlockStack>
                ) : (
                    <BlockStack gap="400">
                        <Banner title="Sales & Offers" tone="success">
                            <p>Scheduled rules automatically activate/deactivate based on the time windows below. Focus on regional events or time-limited offers.</p>
                        </Banner>
                        <Card padding="0">
                            <ResourceList
                                resourceName={{ singular: 'sale', plural: 'sales' }}
                                items={pricingRules.filter((r: any) => r.startTime)}
                                renderItem={(rule: any) => {
                                    const start = new Date(rule.startTime!);
                                    const end = rule.endTime ? new Date(rule.endTime) : null;
                                    const now = new Date();
                                    const isActive = start <= now && (!end || end >= now);
                                    const isUpcoming = start > now;

                                    return (
                                        <ResourceItem id={rule.id} onClick={() => openPricingEditor(rule)}>
                                            <InlineStack align="space-between" blockAlign="center">
                                                <BlockStack gap="100">
                                                    <InlineStack gap="200" blockAlign="center">
                                                        <Text variant="bodyMd" fontWeight="bold" as="h3">
                                                            {rule.value}{rule.type === 'percentage' ? 'x' : ''} 
                                                            {rule.productId ? ` (Product: ${rule.productHandle})` : rule.collectionId ? ` (Col: ${rule.collectionHandle})` : ' (Global)'}
                                                        </Text>
                                                        <Badge tone={isActive ? "success" : isUpcoming ? "attention" : "info"}>
                                                            {isActive ? "ACTIVE" : isUpcoming ? "UPCOMING" : "EXPIRED"}
                                                        </Badge>
                                                        <Badge tone="info">{rule.region?.name || "All Regions"}</Badge>
                                                    </InlineStack>
                                                    <Text variant="bodySm" tone="subdued" as="p">
                                                        {start.toLocaleString()} {end ? `- ${end.toLocaleString()}` : '(No End)'}
                                                    </Text>
                                                </BlockStack>
                                                <InlineStack gap="100">
                                                    <Button icon={EditIcon} variant="tertiary" onClick={() => openPricingEditor(rule)} />
                                                    <Button icon={DeleteIcon} tone="critical" variant="tertiary" onClick={() => submit({ id: rule.id, intent: 'pricing-delete' }, { method: 'POST' })} />
                                                </InlineStack>
                                            </InlineStack>
                                        </ResourceItem>
                                    );
                                }}
                            />
                            {pricingRules.filter((r: any) => r.startTime).length === 0 && (
                                <EmptyState heading="No events scheduled" image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png" action={{ content: 'Schedule Flash Sale', onAction: () => openPricingEditor() }}>
                                    <p>Create a pricing rule with a start and end time to see it here.</p>
                                </EmptyState>
                            )}
                        </Card>
                    </BlockStack>
                )}
            </Box>
          </Layout.Section>
        </Layout>
      </BlockStack>

      {/* Pricing Rule Editor */}
      {editingPricing && (
        <Modal
            open={pricingModalOpen}
            onClose={() => setPricingModalOpen(false)}
            title={editingPricing.id ? "Edit Pricing Adjustment" : "Add Pricing Adjustment"}
            primaryAction={{
                content: 'Save Adjustment',
                onAction: () => {
                    const col = collections.find((c: any) => c.id === editingPricing.collectionId);
                    submit({ 
                        ...editingPricing, 
                        collectionHandle: col?.handle || "",
                        intent: "pricing-save" 
                    }, { method: "POST" });
                    setPricingModalOpen(false);
                }
            }}
        >
            <Modal.Section>
                <BlockStack gap="400">
                    <Select label="Region" options={regions.map(r => ({ label: r.name, value: r.id }))} value={editingPricing.regionId} onChange={(v) => setEditingPricing((p: any) => ({ ...p, regionId: v }))} />
                    <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                        <BlockStack gap="200">
                            <Text variant="headingSm" as="h3">Target Scope</Text>
                            {editingPricing.productId ? (
                                <InlineStack align="space-between">
                                    <Text as="span">{`Product: ${editingPricing.productHandle}`}</Text>
                                    <Button variant="plain" onClick={() => setEditingPricing((p: any) => ({ ...p, productId: "", productHandle: "" }))}>Clear</Button>
                                </InlineStack>
                            ) : (
                                <InlineStack gap="200">
                                    <Box width="100%"><Select label="Collection" options={[{ label: 'All Products', value: '' }, ...collections.map((c: any) => ({ label: c.title, value: c.id }))]} value={editingPricing.collectionId} onChange={(v) => setEditingPricing((p: any) => ({ ...p, collectionId: v }))} /></Box>
                                    <div style={{ paddingTop: '24px' }}>
                                        <Button icon={SearchIcon} onClick={async () => {
                                            const selection = await shopify.resourcePicker({ type: "product", multiple: false });
                                            if (selection && selection.selection.length > 0) {
                                                const p = selection.selection[0];
                                                setEditingPricing((prev: any) => ({ ...prev, productId: p.id, productHandle: p.handle, collectionId: "" }));
                                            }
                                        }}>Browse</Button>
                                    </div>
                                </InlineStack>
                            )}
                        </BlockStack>
                    </Box>
                    <Divider />
                    <Select label="Adjustment Type" options={[{ label: 'Multiplier (e.g. 1.2x)', value: 'percentage' }, { label: 'Fixed Adjustment (+/-)', value: 'fixed_adjustment' }, { label: 'Fixed Price Override', value: 'fixed_price' }]} value={editingPricing.type} onChange={(v) => setEditingPricing((p: any) => ({ ...p, type: v }))} />
                    <TextField label="Value" type="number" value={editingPricing.value} onChange={(v) => setEditingPricing((p: any) => ({ ...p, value: v }))} autoComplete="off" />
                    <Divider />
                    <Text variant="headingSm" as="h3">Schedule (Optional)</Text>
                    <InlineStack gap="400">
                         <Box width="100%"><TextField label="Start Time" type="datetime-local" value={editingPricing.startTime && !isNaN(new Date(editingPricing.startTime).getTime()) ? new Date(editingPricing.startTime).toISOString().slice(0, 16) : ""} onChange={(v) => setEditingPricing((p: any) => ({ ...p, startTime: v }))} autoComplete="off" /></Box>
                         <Box width="100%"><TextField label="End Time" type="datetime-local" value={editingPricing.endTime && !isNaN(new Date(editingPricing.endTime).getTime()) ? new Date(editingPricing.endTime).toISOString().slice(0, 16) : ""} onChange={(v) => setEditingPricing((p: any) => ({ ...p, endTime: v }))} autoComplete="off" /></Box>
                    </InlineStack>
                </BlockStack>
            </Modal.Section>
        </Modal>
      )}

      {/* Tag Rule Modal */}
      <Modal
        open={tagModalOpen}
        onClose={() => setTagModalOpen(false)}
        title="Add New Tag Rule"
        primaryAction={{
          content: 'Add Rule',
          onAction: () => { submit({ ...newTagRule, intent: 'tag-save' }, { method: "POST" }); setTagModalOpen(false); }
        }}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <TextField label="Product Tag" value={newTagRule.tag} onChange={(v) => setNewTagRule(prev => ({ ...prev, tag: v }))} autoComplete="off" placeholder="e.g. glass-items, local-exclusive" />
            <Select label="In Region" options={regions.map(r => ({ label: r.name, value: r.id }))} value={newTagRule.regionId} onChange={(v) => setNewTagRule(prev => ({ ...prev, regionId: v }))} />
            <Select label="Action" options={[{ label: 'Allow', value: 'true' }, { label: 'Restrict', value: 'false' }]} value={newTagRule.allowed} onChange={(v) => setNewTagRule(prev => ({ ...prev, allowed: v }))} />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
