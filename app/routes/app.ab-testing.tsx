import { useState, useCallback } from "react";
import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  ResourceList,
  ResourceItem,
  Text,
  Badge,
  Button,
  BlockStack,
  InlineStack,
  Box,
  Modal,
  TextField,
  Select,
  Icon,
  Banner,
  EmptyState,
  Divider,
} from "@shopify/polaris";
import {
  PlusIcon,
  DeleteIcon,
  PlayIcon,
  MinusCircleIcon,
  ChartVerticalIcon,
  SearchIcon,
} from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import crypto from "node:crypto";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [regions, abTests] = await Promise.all([
    prisma.region.findMany({ where: { shop }, orderBy: { name: 'asc' } }),
    prisma.aBTest.findMany({ where: { shop }, orderBy: { createdAt: 'desc' } }),
  ]);

  return json({ regions, abTests });
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

  if (intent === "toggle-status") {
    const id = formData.get("id") as string;
    const currentStatus = formData.get("status") as string;
    const newStatus = currentStatus === "active" ? "draft" : "active";
    
    await (prisma as any).aBTest.update({
      where: { id },
      data: { status: newStatus }
    });
    return json({ success: true });
  }

  if (intent === "delete-test") {
    await (prisma as any).aBTest.delete({ where: { id: formData.get("id") as string } });
    return json({ success: true });
  }

  return json({ success: true });
};

export default function ABTestingHub() {
  const { regions, abTests } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<any>(null);

  const openEditor = (test: any = null) => {
    setEditingTest(test || {
      name: "",
      regionId: regions[0]?.id || "",
      type: "PRICING",
      variantMultiplier: "1.1",
      config: JSON.stringify({ targetType: 'global' })
    });
    setIsModalOpen(true);
  };

  const handleBrowseTarget = async () => {
    const type = JSON.parse(editingTest.config).targetType === 'collection' ? 'collection' : 'product';
    const selection = await shopify.resourcePicker({ type: type as any, multiple: false });
    if (selection && selection.selection.length > 0) {
        const item = selection.selection[0];
        const newConfig = { ...JSON.parse(editingTest.config), targetId: item.id, targetHandle: item.handle };
        setEditingTest({ ...editingTest, config: JSON.stringify(newConfig) });
    }
  };

  return (
    <Page 
      title="A/B Testing Hub" 
      subtitle="Optimize conversion by testing different regional strategies."
      backAction={{ content: 'Dashboard', url: '/app' }}
      primaryAction={{ content: 'Create New Experiment', icon: PlusIcon, onAction: () => openEditor() }}
    >
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card padding="0">
              {abTests.length === 0 ? (
                <EmptyState 
                  heading="No active experiments" 
                  action={{ content: 'Start Your First Test', onAction: () => openEditor() }} 
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
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
                      <ResourceItem id={test.id} onClick={() => openEditor(test)}>
                        <InlineStack align="space-between" blockAlign="center">
                          <BlockStack gap="100">
                            <InlineStack gap="200" blockAlign="center">
                                <Text variant="bodyMd" fontWeight="bold" as="span">{test.name}</Text>
                                <Badge tone={isActive ? "success" : "attention"}>{test.status.toUpperCase()}</Badge>
                                <Badge tone="info">{regions.find(r => r.id === test.regionId)?.name || 'Unknown Region'}</Badge>
                            </InlineStack>
                            <Text variant="bodySm" tone="subdued" as="p">
                                {test.type === 'PRICING' ? `Testing ${test.controlMultiplier}x vs ${test.variantMultiplier}x` : `Testing visibility of ${config.targetHandle || 'selected item'}`}
                            </Text>
                          </BlockStack>
                          <InlineStack gap="100">
                            <div onClick={(e) => e.stopPropagation()}>
                                <Button 
                                    icon={isActive ? MinusCircleIcon : PlayIcon} 
                                    variant="tertiary" 
                                    tone={isActive ? "critical" : "success"}
                                    onClick={() => {
                                        fetcher.submit({ id: test.id, status: test.status, intent: 'toggle-status' }, { method: 'POST' });
                                    }} 
                                />
                            </div>
                            <div onClick={(e) => e.stopPropagation()}>
                                <Button icon={ChartVerticalIcon} variant="tertiary" url="/app/analytics?tab=2" />
                            </div>
                            <div onClick={(e) => e.stopPropagation()}>
                                <Button 
                                    icon={DeleteIcon} 
                                    tone="critical" 
                                    variant="tertiary" 
                                    onClick={() => {
                                        if (confirm("Are you sure you want to delete this test?")) {
                                            fetcher.submit({ id: test.id, intent: 'delete-test' }, { method: 'POST' });
                                        }
                                    }} 
                                />
                            </div>
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
            <BlockStack gap="400">
                <Card>
                    <BlockStack gap="200">
                        <Text variant="headingMd" as="h2">How it works</Text>
                        <Text as="p" variant="bodySm">Traffic is split 50/50 automatically. Performance is tracked in the Analytics dashboard.</Text>
                        <Divider />
                        <Banner tone="info">
                            <Text as="p">A/B tests have lower priority than specific Pricing/Visibility rules set in Regional Logic.</Text>
                        </Banner>
                    </BlockStack>
                </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>

      {/* Experiment Editor Modal */}
      {editingTest && (
        <Modal
            open={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={editingTest.id ? "Edit Experiment" : "Create New Experiment"}
            primaryAction={{
                content: 'Save Experiment',
                onAction: () => {
                    submit({ ...editingTest, intent: "save-test" }, { method: "POST" });
                    setIsModalOpen(false);
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
                                    <Button icon={SearchIcon} onClick={handleBrowseTarget}>Browse</Button>
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
