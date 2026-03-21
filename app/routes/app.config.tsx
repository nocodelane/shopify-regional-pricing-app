import { useState, useCallback } from "react";
import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  IndexTable,
  Select,
  Box,
  InlineStack,
  Divider,
  Badge,
  Modal,
  TextField,
  Tabs,
  SkeletonPage,
  Banner,
  Icon,
  Grid,
  EmptyState,
  ButtonGroup,
  Tooltip
} from "@shopify/polaris";
import {
  EditIcon,
  DeleteIcon,
  PlusIcon,
  SearchIcon,
  ViewIcon,
  SettingsIcon,
  ExternalIcon,
  MagicIcon
} from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const components = await prisma.regionalComponent.findMany({
    where: { shop },
    include: { overrides: { include: { region: true } } },
    orderBy: { updatedAt: "desc" }
  });

  const regions = await prisma.region.findMany({
    where: { shop },
    select: { id: true, name: true }
  });

  const visibilityConfigs = await prisma.regionHomepageConfig.findMany({
    where: { shop },
    include: { region: true }
  });

  return json({ components, regions, visibilityConfigs, shop });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  switch (intent) {
    case "create_component": {
      const name = formData.get("name") as string;
      const type = formData.get("type") as string;
      await prisma.regionalComponent.create({
        data: { shop, name, type, defaultSettings: "{}" }
      });
      return json({ success: true });
    }

    case "update_component": {
      const id = formData.get("id") as string;
      const name = formData.get("name") as string;
      const defaultSettings = formData.get("defaultSettings") as string;
      await prisma.regionalComponent.update({
        where: { id },
        data: { name, defaultSettings }
      });
      return json({ success: true });
    }

    case "delete_component": {
      const id = formData.get("id") as string;
      await prisma.regionalComponent.delete({ where: { id } });
      return json({ success: true });
    }

    case "save_override": {
      const componentId = formData.get("componentId") as string;
      const regionId = formData.get("regionId") as string;
      const settings = formData.get("settings") as string;
      await prisma.regionalComponentOverride.upsert({
        where: { componentId_regionId: { componentId, regionId } },
        update: { settings },
        create: { componentId, regionId, settings }
      });
      return json({ success: true });
    }

    case "delete_override": {
        const id = formData.get("id") as string;
        await prisma.regionalComponentOverride.delete({ where: { id } });
        return json({ success: true });
    }

    case "save_visibility": {
        const regionId = formData.get("regionId") as string;
        const hiddenSelectors = formData.get("hiddenSelectors") as string;
        const showOnlySelectors = formData.get("showOnlySelectors") as string;
        const placementHeight = formData.get("placementHeight") as string || "400px";
        
        const existing = await prisma.regionHomepageConfig.findFirst({ 
            where: { regionId: regionId === 'global' ? 'global' : regionId, shop } 
        });

        const sectionsOrder = JSON.stringify({ hiddenSelectors, showOnlySelectors, placementHeight });

        if (existing) {
            await prisma.regionHomepageConfig.update({
                where: { id: existing.id },
                data: { sectionsOrder }
            });
        } else {
            await prisma.regionHomepageConfig.create({
                data: {
                    shop, 
                    regionId: regionId === 'global' ? 'global' : regionId, 
                    sectionsOrder
                }
            });
        }
        return json({ success: true });
    }
  }

  return json({ success: true });
};

export default function RegionalManagement() {
  const { components, regions, visibilityConfigs, shop } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const navigation = useNavigation();

  const [selectedTab, setSelectedTab] = useState(0);
  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);
  
  // Studio State
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<any>(null);
  const [activeRegionId, setActiveRegionId] = useState<string>('global'); // 'global' or regionId
  const [isAddOverrideModalOpen, setIsAddOverrideModalOpen] = useState(false);
  const [newOverrideRegionId, setNewOverrideRegionId] = useState("");

  // Component Creation State
  const [newComponentName, setNewComponentName] = useState("");
  const [newComponentType, setNewComponentType] = useState("banner");

  const tabs = [
    { id: 'components', content: 'Component Library', accessibilityLabel: 'Manage regional components' },
    { id: 'visibility', content: 'Theme Visibility', accessibilityLabel: 'Manage theme element visibility' },
  ];

  const handleCreateComponent = () => {
    fetcher.submit({ intent: 'create_component', name: newComponentName, type: newComponentType }, { method: 'POST' });
    setNewComponentName("");
    setIsComponentModalOpen(false);
    shopify.toast.show("Component created");
  };

  const handleUpdateComponent = () => {
    fetcher.submit({ 
        intent: 'update_component', 
        id: editingComponent.id, 
        name: editingComponent.name, 
        defaultSettings: JSON.stringify(editingComponent.defaultSettings) 
    }, { method: 'POST' });
    shopify.toast.show("Settings updated");
  };

  const handleSaveOverride = (settings: any, rId: string) => {
    fetcher.submit({
        intent: 'save_override',
        componentId: editingComponent.id,
        regionId: rId,
        settings: JSON.stringify(settings)
    }, { method: 'POST' });
  };

  const handleAddOverride = () => {
    if (!newOverrideRegionId) return;
    // Create new override with default settings
    handleSaveOverride(editingComponent.defaultSettings, newOverrideRegionId);
    setActiveRegionId(newOverrideRegionId);
    setIsAddOverrideModalOpen(false);
    setNewOverrideRegionId("");
    shopify.toast.show("Regional override added");
  };

  const renderComponentList = () => (
    <BlockStack gap="400">
      <Banner tone="info" title="Regional Component Library">
        <p>Build reusable components that automatically adapt their content based on your customer's location. Place them anywhere in your theme using the "Regional Placement" block.</p>
      </Banner>

      <InlineStack align="space-between" blockAlign="center">
        <Text variant="headingMd" as="h2">Your Components</Text>
        <Button variant="primary" icon={PlusIcon} onClick={() => setIsComponentModalOpen(true)}>Create Component</Button>
      </InlineStack>

      {components.length === 0 ? (
        <Card>
            <EmptyState
                heading="Start building your regional library"
                action={{ content: 'Create your first component', onAction: () => setIsComponentModalOpen(true) }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
                <p>Create banners, countdowns, and more that speak directly to your regional audiences.</p>
            </EmptyState>
        </Card>
      ) : (
        <Grid>
          {components.map((comp: any) => (
            <Grid.Cell key={comp.id} columnSpan={{ xs: 6, sm: 3, md: 4, lg: 4, xl: 4 }}>
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Badge tone="info">{comp.type.toUpperCase()}</Badge>
                    <ButtonGroup>
                        <Tooltip content="Open Studio">
                            <Button icon={EditIcon} variant="tertiary" onClick={() => {
                                setEditingComponent({ ...comp, defaultSettings: JSON.parse(comp.defaultSettings || "{}") });
                                setActiveRegionId('global');
                                setIsStudioOpen(true);
                            }} />
                        </Tooltip>
                        <Button icon={DeleteIcon} tone="critical" variant="tertiary" onClick={() => { if (confirm("Delete component?")) fetcher.submit({ intent: 'delete_component', id: comp.id }, { method: 'POST' }) }} />
                    </ButtonGroup>
                  </InlineStack>
                  <BlockStack gap="100">
                    <Text variant="headingSm" as="h3">{comp.name}</Text>
                    <InlineStack gap="100" blockAlign="center">
                        <Text variant="bodyXs" tone="subdued" as="span">ID: <code>{comp.id.substring(0, 8)}</code></Text>
                        <Button variant="plain" size="micro" icon={ExternalIcon} onClick={() => {
                            navigator.clipboard.writeText(comp.id);
                            shopify.toast.show("ID Copied");
                        }}>Copy</Button>
                    </InlineStack>
                  </BlockStack>
                  <Divider />
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="bodySm" tone="subdued" as="span">{comp.overrides.length} Variants</Text>
                    <Button variant="plain" onClick={() => {
                         setEditingComponent({ ...comp, defaultSettings: JSON.parse(comp.defaultSettings || "{}") });
                         setActiveRegionId('global');
                         setIsStudioOpen(true);
                    }}>Manage</Button>
                  </InlineStack>
                </BlockStack>
              </Card>
            </Grid.Cell>
          ))}
        </Grid>
      )}
    </BlockStack>
  );

  const renderStudio = () => {
    if (!editingComponent) return null;
    
    // Refresh editing component overrides from loader data if needed
    const currentComp = components.find((c: any) => c.id === editingComponent.id) || editingComponent;
    const activeOverride = currentComp.overrides.find((o: any) => o.regionId === activeRegionId);
    
    // Use state-based settings for the form to ensure responsiveness
    const activeSettings = activeRegionId === 'global' 
        ? editingComponent.defaultSettings 
        : (activeOverride ? JSON.parse(activeOverride.settings) : editingComponent.defaultSettings);

    const updateActiveSettings = (key: string, value: any) => {
        if (activeRegionId === 'global') {
            setEditingComponent({
                ...editingComponent,
                defaultSettings: { ...editingComponent.defaultSettings, [key]: value }
            });
        } else {
            // Find or update the override
            const settings = activeOverride ? JSON.parse(activeOverride.settings) : { ...editingComponent.defaultSettings };
            handleSaveOverride({ ...settings, [key]: value }, activeRegionId);
        }
    };

    return (
        <Page
            backAction={{ content: 'Back to Library', onAction: () => setIsStudioOpen(false) }}
            title={`Studio: ${editingComponent.name}`}
            subtitle={editingComponent.type.toUpperCase()}
            primaryAction={{ 
                content: 'Save Progress', 
                onAction: () => {
                    handleUpdateComponent();
                },
                loading: fetcher.state === 'submitting'
            }}
        >
            <Layout>
                <Layout.Section variant="oneThird">
                    <BlockStack gap="400">
                        <Card padding="0">
                            <Box padding="400" background="bg-surface-secondary">
                                <Text variant="headingSm" as="h3">View Context</Text>
                            </Box>
                            <Box padding="200">
                                <BlockStack gap="100">
                                    <Button 
                                        variant={activeRegionId === 'global' ? 'secondary' : 'plain'} 
                                        textAlign="left" 
                                        icon={SearchIcon}
                                        onClick={() => setActiveRegionId('global')}
                                        fullWidth
                                    >
                                        Global (Default)
                                    </Button>
                                    {currentComp.overrides.map((ov: any) => (
                                        <InlineStack key={ov.regionId} align="space-between" blockAlign="center">
                                            <Box width="80%">
                                                <Button 
                                                    variant={activeRegionId === ov.regionId ? 'secondary' : 'plain'} 
                                                    textAlign="left" 
                                                    icon={ViewIcon}
                                                    onClick={() => setActiveRegionId(ov.regionId)}
                                                    fullWidth
                                                >
                                                    {ov.region?.name || 'Region'}
                                                </Button>
                                            </Box>
                                            <Button variant="plain" size="micro" tone="critical" onClick={() => {
                                                if (confirm("Remove override?")) fetcher.submit({ intent: 'delete_override', id: ov.id }, { method: 'POST' });
                                            }} icon={DeleteIcon} />
                                        </InlineStack>
                                    ))}
                                </BlockStack>
                            </Box>
                            <Divider />
                            <Box padding="400">
                                <Button fullWidth variant="secondary" icon={PlusIcon} onClick={() => setIsAddOverrideModalOpen(true)}>Add Regional Variation</Button>
                            </Box>
                        </Card>
                    </BlockStack>
                </Layout.Section>

                <Layout.Section>
                    <Card>
                        <BlockStack gap="600">
                            <BlockStack gap="200">
                                <InlineStack align="space-between" blockAlign="center">
                                    <Text variant="headingLg" as="h2">
                                        {activeRegionId === 'global' ? 'Global Settings' : `Settings for ${currentComp.overrides.find((o: any) => o.regionId === activeRegionId)?.region?.name}`}
                                    </Text>
                                    <Badge tone={activeRegionId === 'global' ? 'info' : 'attention'}>
                                        {activeRegionId === 'global' ? 'Base Style' : 'Regional Override'}
                                    </Badge>
                                </InlineStack>
                                {regions.length === 0 && (
                                    <Banner tone="warning" title="Regional Features Limited">
                                        <p>No regions have been created in the Dashboard. You can edit the Global style here, but you cannot add regional variations until at least one region is defined.</p>
                                    </Banner>
                                )}
                            </BlockStack>

                            <Divider />

                            <BlockStack gap="400">
                                {activeRegionId === 'global' && (
                                    <TextField label="Internal Handle" value={editingComponent.name} onChange={(v) => setEditingComponent({ ...editingComponent, name: v })} autoComplete="off" helpText="Used to identify this component in your library." />
                                )}

                                        {editingComponent.type === 'banner' && (
                                            <BlockStack gap="400">
                                                <TextField label="Banner Heading" value={activeSettings.title} onChange={(v) => updateActiveSettings('title', v)} autoComplete="off" />
                                                <TextField label="Button Label" value={activeSettings.buttonText} onChange={(v) => updateActiveSettings('buttonText', v)} autoComplete="off" />
                                                 <TextField label="Desktop Image URL" value={activeSettings.imageUrl || ''} onChange={(v) => updateActiveSettings('imageUrl', v)} autoComplete="off" placeholder="https://..." helpText="Recommended: 1200x470px" />
                                                <TextField label="Mobile Image URL (Optional)" value={activeSettings.mobileImageUrl || ''} onChange={(v) => updateActiveSettings('mobileImageUrl', v)} autoComplete="off" placeholder="https://..." helpText="Recommended: 600x600px" />
                                                <Select
                                                    label="Image Fit"
                                                    options={[
                                                        { label: 'Contain (Letterbox)', value: 'contain' },
                                                        { label: 'Cover (Fill Container)', value: 'cover' }
                                                    ]}
                                                    value={activeSettings.imageFit || 'contain'}
                                                    onChange={(v) => updateActiveSettings('imageFit', v)}
                                                />
                                            </BlockStack>
                                        )}

                                {editingComponent.type === 'counter' && (
                                    <BlockStack gap="400">
                                        <TextField label="Timer Heading" value={activeSettings.title} onChange={(v) => updateActiveSettings('title', v)} autoComplete="off" />
                                        <TextField type="datetime-local" label="End Date & Time" value={activeSettings.endDate} onChange={(v) => updateActiveSettings('endDate', v)} autoComplete="off" />
                                    </BlockStack>
                                )}
                                
                                {editingComponent.type === 'products' && (
                                    <BlockStack gap="400">
                                        <TextField label="Section Title" value={activeSettings.title} onChange={(v) => updateActiveSettings('title', v)} autoComplete="off" />
                                        <Banner tone="info">
                                            <p>Configure regional product visibility in the **Theme Visibility** tab or via the **Rules** engine.</p>
                                        </Banner>
                                    </BlockStack>
                                )}

                                <Divider />
                                <Box padding="400" background="bg-surface-secondary">
                                    <Text variant="headingSm" as="h3">Container Sizing (CLS Optimization)</Text>
                                </Box>
                                <Grid>
                                    <Grid.Cell columnSpan={{xs: 6, md: 3}}>
                                        <BlockStack gap="200">
                                            <TextField label="Desktop Aspect Ratio" value={activeSettings.desktopAspectRatio || ''} onChange={(v) => updateActiveSettings('desktopAspectRatio', v)} autoComplete="off" placeholder="16 / 9" />
                                            <TextField label="Desktop Min Height (px)" value={activeSettings.desktopHeight || ''} onChange={(v) => updateActiveSettings('desktopHeight', v)} autoComplete="off" placeholder="400" />
                                        </BlockStack>
                                    </Grid.Cell>
                                    <Grid.Cell columnSpan={{xs: 6, md: 3}}>
                                        <BlockStack gap="200">
                                            <TextField label="Mobile Aspect Ratio" value={activeSettings.mobileAspectRatio || ''} onChange={(v) => updateActiveSettings('mobileAspectRatio', v)} autoComplete="off" placeholder="1 / 1" />
                                            <TextField label="Mobile Min Height (px)" value={activeSettings.mobileHeight || ''} onChange={(v) => updateActiveSettings('mobileHeight', v)} autoComplete="off" placeholder="300" />
                                        </BlockStack>
                                    </Grid.Cell>
                                </Grid>
                                <Text variant="bodyXs" tone="subdued" as="p">Used for "Zero Layout Shift" space reservation before page loads.</Text>
                            </BlockStack>
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>

            <Modal
                open={isAddOverrideModalOpen}
                onClose={() => setIsAddOverrideModalOpen(false)}
                title="Select Target Region"
                primaryAction={{ content: 'Create Override', onAction: handleAddOverride, disabled: !newOverrideRegionId || regions.length === 0 }}
                secondaryActions={[{ content: 'Cancel', onAction: () => setIsAddOverrideModalOpen(false) }]}
            >
                <Modal.Section>
                    <BlockStack gap="400">
                        {regions.length === 0 ? (
                            <Banner tone="warning" title="No Regions Found">
                                <p>You haven't created any regions yet. Please go to the **Dashboard** to create at least one region (e.g., Mumbai, Delhi, etc.) before adding regional variations.</p>
                            </Banner>
                        ) : (
                            <>
                                <Text as="p">Choose which region should have a custom version of this component.</Text>
                                <Select
                                    label="Target Region"
                                    options={[
                                        { label: 'Select a region...', value: '' },
                                        ...regions.map((r: any) => ({ label: r.name, value: r.id }))
                                    ]}
                                    value={newOverrideRegionId}
                                    onChange={(v) => setNewOverrideRegionId(v)}
                                />
                            </>
                        )}
                    </BlockStack>
                </Modal.Section>
            </Modal>
        </Page>
    );
  };

  const renderVisibilitySection = () => (
    <BlockStack gap="400">
      <Banner tone="info" title="Targeting Existing Theme Elements">
        <p>Use these rules to hide standard sections or show region-exclusive blocks that you've already created in your Shopify Theme Editor.</p>
      </Banner>
      
      <Layout>
        {regions.map((region: any) => {
          const config = visibilityConfigs.find((c: any) => c.regionId === region.id);
          const data = JSON.parse(config?.sectionsOrder || "{}");
          return (
            <Layout.Section key={region.id}>
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="headingSm" as="h3">{region.name}</Text>
                    <Badge tone={data.hiddenSelectors || data.showOnlySelectors ? "attention" : undefined}>
                        {data.hiddenSelectors || data.showOnlySelectors ? "Active Rules" : "No rules"}
                    </Badge>
                  </InlineStack>
                  
                  <Grid>
                    <Grid.Cell columnSpan={{xs: 6, md: 3}}>
                        <TextField
                            label="Hide these elements (CSS Selectors)"
                            value={data.hiddenSelectors || ""}
                            onChange={(v) => fetcher.submit({ 
                                intent: 'save_visibility', 
                                regionId: region.id, 
                                hiddenSelectors: v, 
                                showOnlySelectors: data.showOnlySelectors || "" 
                            }, { method: 'POST' })}
                            placeholder=".announcement-bar, .hero-default"
                            autoComplete="off"
                            helpText="Comma-separated classes or IDs to HIDE for this region."
                        />
                    </Grid.Cell>
                    <Grid.Cell columnSpan={{xs: 6, md: 3}}>
                        <TextField
                            label="Show ONLY for this region"
                            value={data.showOnlySelectors || ""}
                            onChange={(v) => fetcher.submit({ 
                                intent: 'save_visibility', 
                                regionId: region.id, 
                                hiddenSelectors: data.hiddenSelectors || "", 
                                showOnlySelectors: v 
                            }, { method: 'POST' })}
                            placeholder=".exclusive-delhi-banner"
                            autoComplete="off"
                            helpText="Elements that will be HIDDEN for everyone else."
                        />
                    </Grid.Cell>
                  </Grid>
                </BlockStack>
              </Card>
            </Layout.Section>
          );
        })}
      </Layout>
    </BlockStack>
  );

  if (isStudioOpen) return renderStudio();

  return (
    <Page 
        title="Pincode-Based Dynamic Pricing - Components"
        primaryAction={{
            content: "Create New Component",
            onAction: () => setIsComponentModalOpen(true)
        }}
    >
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                <Box padding="400">
                    {selectedTab === 0 ? renderComponentList() : renderVisibilitySection()}
                </Box>
            </Tabs>
          </Card>
        </Layout.Section>
      </Layout>

      <Modal
        open={isComponentModalOpen}
        onClose={() => setIsComponentModalOpen(false)}
        title="Create Regional Component"
        primaryAction={{ content: 'Create Component', onAction: handleCreateComponent, disabled: !newComponentName }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setIsComponentModalOpen(false) }]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <TextField label="Component Name" value={newComponentName} onChange={setNewComponentName} autoComplete="off" placeholder="e.g. Summer Hero Banner" />
            <Select
              label="Component Type"
              options={[
                { label: 'Image Banner', value: 'banner' },
                { label: 'Countdown Timer', value: 'counter' },
                { label: 'Featured Products', value: 'products' }
              ]}
              value={newComponentType}
              onChange={setNewComponentType}
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
