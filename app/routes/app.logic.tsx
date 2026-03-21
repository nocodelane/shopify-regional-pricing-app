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
} from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import crypto from "node:crypto";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  const [regions, pricingRules, productRules, collectionRules, colResponse] = await Promise.all([
    prisma.region.findMany({ where: { shop }, orderBy: { name: 'asc' } }),
    prisma.pricingRule.findMany({ where: { shop }, include: { region: true } }),
    prisma.productRegionRule.findMany({ where: { shop } }),
    prisma.collectionRegionRule.findMany({ where: { shop } }),
    admin.graphql(`query { collections(first: 50) { nodes { id title handle } } }`)
  ]);

  const colData: any = await colResponse.json();
  const collections = colData.data.collections.nodes;
  const cacheCount = await prisma.productCache.count({ where: { shop } });

  return json({ regions, pricingRules, productRules, collectionRules, collections, cacheCount });
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
    const startTime = formData.get("startTime") ? new Date(formData.get("startTime") as string) : null;
    const endTime = formData.get("endTime") ? new Date(formData.get("endTime") as string) : null;

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

  return json({ success: true });
};

export default function RegionalLogic() {
  const { regions, pricingRules, productRules, collectionRules, collections, cacheCount } = useLoaderData<typeof loader>();
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

  const tabs = [
    { id: 'pricing', content: 'Pricing Adjustments', accessibilityLabel: 'Pricing Adjustments', panelID: 'pricing-panel' },
    { id: 'visibility', content: 'Visibility Control', accessibilityLabel: 'Visibility Control', panelID: 'visibility-panel' },
    { id: 'flash', content: 'Flash Sales', accessibilityLabel: 'Flash Sales', panelID: 'flash-panel' },
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
        title="Pincode-Based Dynamic Pricing - Logic Hub" 
        backAction={{ content: 'Dashboard', url: '/app' }}
        primaryAction={selectedTab === 0 ? { content: 'Add Pricing Rule', icon: PlusIcon, onAction: () => openPricingEditor() } : undefined}
    >
      <BlockStack gap="500">
        <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
            <Box paddingInlineStart="400" paddingInlineEnd="400" paddingBlockStart="400">
                {selectedTab === 0 ? (
                    <Layout>
                        <Layout.Section>
                            <Card padding="0">
                                {pricingRules.length === 0 ? (
                                    <EmptyState heading="No pricing adjustments" action={{ content: 'Add Your First Rule', onAction: () => openPricingEditor() }} image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png">
                                        <p>Create rules to automatically change prices based on customer location.</p>
                                    </EmptyState>
                                ) : (
                                    <ResourceList
                                        resourceName={{ singular: 'rule', plural: 'rules' }}
                                        items={pricingRules}
                                        renderItem={(rule: any) => (
                                            <ResourceItem id={rule.id} onClick={() => openPricingEditor(rule)}>
                                                <InlineStack align="space-between" blockAlign="center">
                                                    <BlockStack gap="100">
                                                        <InlineStack gap="200" blockAlign="center">
                                                            <Badge tone="info">{rule.region?.name || "Global"}</Badge>
                                                            <Text variant="bodyMd" fontWeight="bold" as="span">
                                                                {rule.productId ? `Product: ${rule.productHandle}` : rule.collectionId ? `Collection: ${rule.collectionHandle}` : "Global Adjustment"}
                                                            </Text>
                                                            <Badge tone="success">{`${rule.value}${rule.type === 'percentage' ? 'x' : ''}`}</Badge>
                                                        </InlineStack>
                                                        {rule.startTime && <Text variant="bodySm" tone="subdued" as="p">{`Active from: ${new Date(rule.startTime).toLocaleDateString()}`}</Text>}
                                                    </BlockStack>
                                                    <InlineStack gap="100">
                                                        <Button icon={EditIcon} variant="tertiary" onClick={() => openPricingEditor(rule)} />
                                                        <Button icon={DeleteIcon} tone="critical" variant="tertiary" onClick={() => submit({ id: rule.id, intent: 'pricing-delete' }, { method: 'POST' })} />
                                                    </InlineStack>
                                                </InlineStack>
                                            </ResourceItem>
                                        )}
                                    />
                                )}
                            </Card>
                        </Layout.Section>
                        <Layout.Section variant="oneThird">
                            <BlockStack gap="500">
                                <Card>
                                    <BlockStack gap="300">
                                        <Text variant="headingMd" as="h2">Logic Settings</Text>
                                        <Text variant="bodySm" tone="subdued" as="p">Keep your catalog in sync to ensure rules apply correctly to new products.</Text>
                                        <Button 
                                            icon={RefreshIcon} 
                                            fullWidth 
                                            onClick={() => fetcher.submit({ intent: "sync" }, { method: "POST" })}
                                            loading={fetcher.state === 'submitting' && fetcher.formData?.get('intent') === 'sync'}
                                        >
                                            {`Sync Catalog (${cacheCount})`}
                                        </Button>
                                    </BlockStack>
                                </Card>
                                <Banner tone="info">
                                    <Text as="p">Pricing rules are additive. Multipliers apply first, followed by fixed adjustments.</Text>
                                </Banner>
                            </BlockStack>
                        </Layout.Section>
                    </Layout>
                ) : selectedTab === 1 ? (
                    <Layout>
                        <Layout.Section variant="oneThird">
                            <Card padding="0">
                                <Box padding="400" borderBlockEndWidth="025" borderColor="border-secondary">
                                    <Text variant="headingMd" as="h2">Target Regions</Text>
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
                                                <Text variant="headingMd" as="h2">{`Visibility: ${activeRegion.name}`}</Text>
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
                                <EmptyState heading="Select a region" image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png" />
                            )}
                        </Layout.Section>
                    </Layout>
                ) : (
                    <Layout>
                        <Layout.Section>
                            <Banner title="Scheduled Events & Flash Sales" tone="success">
                                <p>Scheduled rules automatically activate/deactivate based on the time windows below. Focus on regional events or time-limited offers.</p>
                            </Banner>
                            <Box paddingBlockStart="400">
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
                            </Box>
                        </Layout.Section>
                    </Layout>
                )}
            </Box>
        </Tabs>
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
                         <Box width="100%"><TextField label="Start Time" type="datetime-local" value={editingPricing.startTime ? new Date(editingPricing.startTime).toISOString().slice(0, 16) : ""} onChange={(v) => setEditingPricing((p: any) => ({ ...p, startTime: v }))} autoComplete="off" /></Box>
                         <Box width="100%"><TextField label="End Time" type="datetime-local" value={editingPricing.endTime ? new Date(editingPricing.endTime).toISOString().slice(0, 16) : ""} onChange={(v) => setEditingPricing((p: any) => ({ ...p, endTime: v }))} autoComplete="off" /></Box>
                    </InlineStack>
                </BlockStack>
            </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
