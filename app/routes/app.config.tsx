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
  Tooltip,
  Avatar,
  Checkbox,
  Popover,
  ResourceList,
  ResourceItem,
  ColorPicker,
  hsbToHex,
  rgbToHsb,
} from "@shopify/polaris";
import {
  EditIcon,
  DeleteIcon,
  PlusIcon,
  SearchIcon,
  ViewIcon,
  SettingsIcon,
  ExternalIcon,
  MagicIcon,
  PageIcon,
  PaintBrushFlatIcon,
  AppsIcon,
  ListBulletedIcon,
  ShieldCheckMarkIcon,
  PhoneIcon,
  DesktopIcon,
  CheckIcon,
  CollectionIcon,
  PinIcon,
  ChevronRightIcon,
  InfoIcon,
} from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { generateCopy } from "../utils/llm.server";
import { useEffect } from "react";

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

  const [visibilityConfigs, appConfig, modalConfig] = await Promise.all([
    prisma.regionHomepageConfig.findMany({ where: { shop }, include: { region: true } }),
    prisma.appConfig.findUnique({ where: { shop } }),
    prisma.modalConfig.findUnique({ where: { shop } }) || prisma.modalConfig.create({ data: { shop } })
  ]);
  
  return json({ components, regions, visibilityConfigs, appConfig, modalConfig, shop });
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

    case "save_app_config": {
        const regionalPricingActive = formData.get("regionalPricingActive") === "true";
        const visibilityRulesActive = formData.get("visibilityRulesActive") === "true";
        const abTestingActive = formData.get("abTestingActive") === "true";
        const waitlistActive = formData.get("waitlistActive") === "true";
        const pincodeGuardActive = formData.get("pincodeGuardActive") === "true";
        const lockoutMessage = formData.get("lockoutMessage") as string;
        const excludedPaths = formData.get("excludedPaths") as string;

        await (prisma.appConfig as any).upsert({
            where: { shop },
            update: { 
                regionalPricingActive, 
                visibilityRulesActive, 
                abTestingActive, 
                waitlistActive, 
                pincodeGuardActive,
                lockoutMessage,
                excludedPaths,
                updatedAt: new Date() 
            },
            create: { 
                shop, 
                regionalPricingActive, 
                visibilityRulesActive, 
                abTestingActive, 
                waitlistActive, 
                pincodeGuardActive,
                lockoutMessage,
                excludedPaths,
                updatedAt: new Date() 
            }
        });
        return json({ success: true });
    }

    case "save_modal_config": {
        const data = Object.fromEntries(formData);
        await prisma.modalConfig.update({
            where: { shop },
            data: {
                title: data.title as string,
                description: data.description as string,
                confirmButtonText: data.confirmButtonText as string,
                floatingButtonText: data.floatingButtonText as string,
                primaryColor: data.primaryColor as string,
                backgroundColor: data.backgroundColor as string,
                textColor: data.textColor as string,
                showFloatingButton: data.showFloatingButton === "true",
                showCurrentPincode: data.showCurrentPincode === "true",
                showLocationIcon: data.showLocationIcon === "true",
                triggerTransparent: data.triggerTransparent === "true",
                position: data.position as string,
                triggerBackgroundColor: data.triggerBackgroundColor as string,
                triggerTextColor: data.triggerTextColor as string,
                triggerIconColor: data.triggerIconColor as string,
                triggerBorderRadius: data.triggerBorderRadius as string,
                triggerPadding: data.triggerPadding as string,
                triggerFontSize: data.triggerFontSize as string,
                triggerFontWeight: data.triggerFontWeight as string,
                triggerLayoutStyle: data.triggerLayoutStyle as string,
                triggerIconSize: data.triggerIconSize as string,
                triggerBorderWidth: data.triggerBorderWidth as string,
                triggerBorderColor: data.triggerBorderColor as string,
                usePulse: data.usePulse === "true",
                useGlassmorphism: data.useGlassmorphism === "true",
                showOnAnyPage: data.showOnAnyPage === "true",
                disableScroll: data.disableScroll === "true",
                overlayColor: data.overlayColor as string,
                overlayBlur: data.overlayBlur as string,
                pincodePrefixText: data.pincodePrefixText as string,
                injectionSelector: data.injectionSelector as string,
                headerImage: data.headerImage as string,
            } as any
        });
        return json({ success: true });
    }

    case "generate-ai-content": {
        const prompt = formData.get("prompt") as string;
        try {
            const copy = await generateCopy(shop, prompt);
            return json({ success: true, aiCopy: copy });
        } catch (e: any) {
            return json({ error: e.message }, { status: 500 });
        }
    }
  }

  return json({ success: true });
};

export default function RegionalManagement() {
  const { components, regions, visibilityConfigs, appConfig, modalConfig, shop } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const navigation = useNavigation();

  const [selectedTab, setSelectedTab] = useState(0);
  const [modalFormState, setModalFormState] = useState<any>(modalConfig);
  
  useEffect(() => {
    setModalFormState(modalConfig);
  }, [modalConfig]);
  
  const isModalDirty = JSON.stringify(modalFormState) !== JSON.stringify(modalConfig);

  const handleSaveModal = () => {
    const formData = new FormData();
    formData.append("intent", "save_modal_config");
    Object.keys(modalFormState).forEach(key => {
      const val = modalFormState[key];
      if (val !== undefined && val !== null) {
        formData.append(key, String(val));
      }
    });
    fetcher.submit(formData, { method: "POST" });
    shopify.toast.show("Widget preferences saved");
  };

  const applyPreset = (type: 'modern' | 'minimal' | 'classic' | 'premium') => {
    const presets = {
       modern: { triggerLayoutStyle: 'boxed', triggerPadding: '10px 20px', triggerBorderRadius: '30px', triggerTransparent: false, usePulse: true, useGlassmorphism: false },
       minimal: { triggerLayoutStyle: 'minimal', triggerPadding: '6px 12px', triggerBorderRadius: '0px', triggerTransparent: true, usePulse: false, useGlassmorphism: false },
       classic: { triggerLayoutStyle: 'boxed', triggerPadding: '12px 24px', triggerBorderRadius: '4px', triggerTransparent: false, usePulse: false, useGlassmorphism: false },
       premium: { triggerLayoutStyle: 'premium', triggerPadding: '14px 28px', triggerBorderRadius: '30px', triggerTransparent: false, usePulse: false, useGlassmorphism: true }
    };
    setModalFormState({ ...modalFormState, ...presets[type] });
  };
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
    { id: 'components', content: 'Regional Content' },
    { id: 'experience', content: 'Popup Style' },
    { id: 'visibility', content: 'Market Areas' },
    { id: 'guard', content: 'Store Access' },
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

  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');

  const renderComponentList = () => (
    <BlockStack gap="600">
      <InlineStack align="space-between" blockAlign="center">
        <BlockStack gap="100">
            <Text variant="headingLg" as="h2">Regional Content Library</Text>
            <Text variant="bodySm" tone="subdued" as="p">Deploy regional banners, widgets, and dynamic content snippets.</Text>
        </BlockStack>
        <InlineStack gap="200">
            <ButtonGroup variant="segmented">
                <Button pressed={viewMode === 'list'} onClick={() => setViewMode('list')} icon={ListBulletedIcon}>List</Button>
                <Button pressed={viewMode === 'card'} onClick={() => setViewMode('card')} icon={AppsIcon}>Cards</Button>
            </ButtonGroup>
            <Button variant="primary" icon={PlusIcon} onClick={() => setIsComponentModalOpen(true)}>Create Component</Button>
        </InlineStack>
      </InlineStack>

      {components.length === 0 ? (
        <Card>
            <EmptyState
                heading="Your design library is empty"
                action={{ content: 'Initialize Studio Library', onAction: () => setIsComponentModalOpen(true) }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
                <p>Start by creating a regional banner or delivery widget to engage your audience.</p>
            </EmptyState>
        </Card>
      ) : viewMode === 'card' ? (
        <Grid>
          {components.map((comp: any) => (
            <Grid.Cell key={comp.id} columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4 }}>
              <Box 
                background="bg-surface" 
                borderRadius="400" 
                padding="0" 
                borderStyle="solid" 
                borderWidth="025" 
                borderColor="border"
                shadow="100"
              >
                <Box padding="400" borderBlockEndWidth="025" borderColor="border-secondary">
                    <InlineStack align="space-between" blockAlign="center">
                        <Badge tone="info">{comp.type.replace('_', ' ').toUpperCase()}</Badge>
                        <InlineStack gap="100">
                            <Tooltip content="Launch Editor">
                                <Button icon={EditIcon} variant="tertiary" onClick={() => {
                                    setEditingComponent({ ...comp, defaultSettings: JSON.parse(comp.defaultSettings || "{}") });
                                    setActiveRegionId('global');
                                    setIsStudioOpen(true);
                                }} />
                            </Tooltip>
                            <Button icon={DeleteIcon} tone="critical" variant="tertiary" onClick={() => { if (confirm("Permanently delete this component?")) fetcher.submit({ intent: 'delete_component', id: comp.id }, { method: 'POST' }) }} />
                        </InlineStack>
                    </InlineStack>
                </Box>
                
                <Box padding="500">
                    <BlockStack gap="400">
                        <BlockStack gap="100">
                            <Text variant="headingMd" as="h3" fontWeight="bold">{comp.name}</Text>
                            <InlineStack gap="100" blockAlign="center">
                                <Text variant="bodyXs" tone="subdued" as="p">Component ID: <code>{comp.id.substring(0, 8)}</code></Text>
                                <Button variant="plain" size="micro" onClick={() => {
                                    navigator.clipboard.writeText(comp.id);
                                    shopify.toast.show("ID Copied to Clipboard");
                                }}>Copy</Button>
                            </InlineStack>
                        </BlockStack>

                        <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                            <InlineStack align="space-between" blockAlign="center">
                                <BlockStack gap="050">
                                    <Text variant="bodyXs" tone="subdued" as="p">Variants</Text>
                                    <Text variant="headingSm" as="p">{comp.overrides.length + 1} Managed</Text>
                                </BlockStack>
                                <Avatar size="sm" customer name={comp.name} />
                            </InlineStack>
                        </Box>

                        <Button fullWidth variant="secondary" onClick={() => {
                             setEditingComponent({ ...comp, defaultSettings: JSON.parse(comp.defaultSettings || "{}") });
                             setActiveRegionId('global');
                             setIsStudioOpen(true);
                        }}>Enter Design Studio</Button>
                    </BlockStack>
                </Box>
              </Box>
            </Grid.Cell>
          ))}
        </Grid>
      ) : (
        <Card padding="0">
            <ResourceList
                resourceName={{ singular: 'component', plural: 'components' }}
                items={components}
                renderItem={(comp: any) => (
                    <ResourceItem id={comp.id} onClick={() => {
                        setEditingComponent({ ...comp, defaultSettings: JSON.parse(comp.defaultSettings || "{}") });
                        setActiveRegionId('global');
                        setIsStudioOpen(true);
                    }}>
                        <InlineStack align="space-between" blockAlign="center">
                            <InlineStack gap="400" blockAlign="center">
                                <Avatar size="md" customer name={comp.name} />
                                <BlockStack gap="100">
                                    <Text variant="headingMd" as="h3">{comp.name}</Text>
                                    <InlineStack gap="200">
                                        <Badge tone="info" size="small">{comp.type.replace('_', ' ').toUpperCase()}</Badge>
                                        <Text variant="bodySm" tone="subdued" as="p">{comp.overrides.length + 1} variants</Text>
                                    </InlineStack>
                                </BlockStack>
                            </InlineStack>
                            <InlineStack gap="400" blockAlign="center">
                                <Button variant="tertiary" icon={EditIcon} onClick={() => {
                                    setEditingComponent({ ...comp, defaultSettings: JSON.parse(comp.defaultSettings || "{}") });
                                    setActiveRegionId('global');
                                    setIsStudioOpen(true);
                                }} />
                                <Button icon={DeleteIcon} tone="critical" variant="tertiary" onClick={() => { if (confirm("Permanently delete?")) fetcher.submit({ intent: 'delete_component', id: comp.id }, { method: 'POST' }) }} />
                            </InlineStack>
                        </InlineStack>
                    </ResourceItem>
                )}
            />
        </Card>
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

                                        {editingComponent.type === 'pincode_widget' && (
                                    <BlockStack gap="400">
                                        <TextField 
                                            label="Regional Message" 
                                            value={activeSettings.message || ''} 
                                            onChange={(v) => updateActiveSettings('message', v)} 
                                            autoComplete="off" 
                                            placeholder="e.g. Free Delivery in Mumbai!"
                                            helpText="This message will change based on the customer's region."
                                        />
                                        <Select
                                            label="Display Style"
                                            options={[
                                                { label: 'Minimal (Text only)', value: 'minimal' },
                                                { label: 'Standard (Two lines)', value: 'standard' },
                                                { label: 'Pill (Compact)', value: 'pill' }
                                            ]}
                                            value={activeSettings.style || 'standard'}
                                            onChange={(v) => updateActiveSettings('style', v)}
                                        />
                                        <InlineStack gap="400">
                                            <Box width="50%">
                                                <TextField 
                                                    label="Text Font Size" 
                                                    value={activeSettings.fontSize || '14px'} 
                                                    onChange={(v) => updateActiveSettings('fontSize', v)} 
                                                    autoComplete="off" 
                                                />
                                            </Box>
                                            <Box width="50%">
                                                <TextField 
                                                    label="Icon Color" 
                                                    value={activeSettings.iconColor || '#000000'} 
                                                    onChange={(v) => updateActiveSettings('iconColor', v)} 
                                                    autoComplete="off" 
                                                />
                                            </Box>
                                        </InlineStack>
                                    </BlockStack>
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

                                {editingComponent.type === 'custom_liquid' && (
                                    <BlockStack gap="400">
                                        <Banner tone="warning" title="Expert Feature">
                                            <p>Use this to inject raw HTML or Liquid. Great for theme-native snippets or custom scripts.</p>
                                        </Banner>
                                        <TextField 
                                            label="Liquid / HTML Code" 
                                            value={activeSettings.code || ''} 
                                            onChange={(v) => updateActiveSettings('code', v)} 
                                            autoComplete="off" 
                                            multiline={10}
                                            placeholder="<div>Hello {{ region_name }}</div>"
                                        />
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

  const [activeDesignerTab, setActiveDesignerTab] = useState(0);

  const renderExperienceDesigner = () => (
    <BlockStack gap="600">
        <InlineStack gap="300" align="space-between" blockAlign="center">
            <BlockStack gap="100">
                <Text variant="headingLg" as="h2">Popup Style</Text>
                <Text variant="bodySm" tone="subdued" as="p">Sculpt the visual identity of your regional widgets and modals.</Text>
            </BlockStack>
            <Box background="bg-surface-secondary" padding="200" borderRadius="300">
                <InlineStack gap="200">
                    <Button variant="tertiary" size="slim" onClick={() => applyPreset('modern')}>Modern</Button>
                    <Button variant="tertiary" size="slim" onClick={() => applyPreset('minimal')}>Minimal</Button>
                    <Button variant="tertiary" size="slim" onClick={() => applyPreset('premium')}>Premium</Button>
                </InlineStack>
            </Box>
        </InlineStack>

        <Layout>
            <Layout.Section>
                <Card padding="0">
                    <Tabs 
                        tabs={[
                            {id: 'content', content: 'Content & Copy'}, 
                            {id: 'style', content: 'Visual Style'}, 
                            {id: 'behavior', content: 'Interaction & Scroll'}
                        ]} 
                        selected={activeDesignerTab} 
                        onSelect={setActiveDesignerTab}
                    >
                        <Box padding="600">
                             {activeDesignerTab === 0 && (
                                <BlockStack gap="500">
                                    <BlockStack gap="400">
                                        <Text variant="headingMd" as="h3">Core Messaging</Text>
                                        <TextField label="Modal Title" value={modalFormState.title} onChange={(v) => setModalFormState({...modalFormState, title: v})} autoComplete="off" />
                                        <TextField label="Modal Description" value={modalFormState.description} multiline={3} onChange={(v) => setModalFormState({...modalFormState, description: v})} autoComplete="off" />
                                        
                                        <Box background="bg-surface-secondary" padding="400" borderRadius="200" borderStyle="dashed" borderWidth="025" borderColor="border-info">
                                            <InlineStack align="space-between" blockAlign="center">
                                                <BlockStack gap="100">
                                                    <Text variant="headingSm" as="h4">Intelligence Insight</Text>
                                                    <Text variant="bodyXs" tone="subdued" as="p">Use AI to craft high-converting regional messaging.</Text>
                                                </BlockStack>
                                                <Button icon={MagicIcon} variant="primary" onClick={() => {
                                                    fetcher.submit({ 
                                                        intent: "generate-ai-content", 
                                                        prompt: `Generate a premium, high-converting title and description for a regional pricing modal. Current title: ${modalFormState.title}` 
                                                    }, { method: "POST" });
                                                }} loading={fetcher.state === 'submitting' && fetcher.formData?.get('intent') === 'generate-ai-content'}>Optimize Copy</Button>
                                            </InlineStack>
                                        </Box>
                                    </BlockStack>
                                    <Divider />
                                    <BlockStack gap="400">
                                        <Text variant="headingSm" as="h3">Visual Assets & Toggles</Text>
                                        <TextField label="Header Image URL" value={modalFormState.headerImage || ''} onChange={(v) => setModalFormState({...modalFormState, headerImage: v})} placeholder="https://cdn.shopify.com/..." autoComplete="off" />
                                        <InlineStack gap="400">
                                            <Checkbox label="Show Location Button" checked={modalFormState.showLocationIcon} onChange={(v) => setModalFormState({...modalFormState, showLocationIcon: v})} />
                                            <Checkbox label="Show Current Pincode on Trigger" checked={modalFormState.showCurrentPincode} onChange={(v) => setModalFormState({...modalFormState, showCurrentPincode: v})} />
                                        </InlineStack>
                                        {modalFormState.showCurrentPincode && (
                                            <TextField 
                                                label="Pincode Prefix Text" 
                                                value={modalFormState.pincodePrefixText || 'Delivering to:'} 
                                                onChange={(v) => setModalFormState({...modalFormState, pincodePrefixText: v})} 
                                                placeholder="Delivering to:" 
                                                autoComplete="off" 
                                                helpText="Appears above the pincode/region name on the floating button."
                                            />
                                        )}
                                    </BlockStack>
                                    <Divider />
                                    <BlockStack gap="400">
                                        <Text variant="headingSm" as="h3">Button Labels</Text>
                                        <TextField label="Floating Trigger Text" value={modalFormState.floatingButtonText} onChange={(v) => setModalFormState({...modalFormState, floatingButtonText: v})} autoComplete="off" />
                                        <TextField label="Modal Confirm Button" value={modalFormState.confirmButtonText} onChange={(v) => setModalFormState({...modalFormState, confirmButtonText: v})} autoComplete="off" />
                                    </BlockStack>
                                </BlockStack>
                            )}

                            {activeDesignerTab === 1 && (
                                <BlockStack gap="500">
                                    <BlockStack gap="400">
                                        <Text variant="headingMd" as="h3">Pincode Modal Style</Text>
                                        <Grid>
                                            <Grid.Cell columnSpan={{xs: 6, md: 3}}>
                                                <ColorField label="Surface Background" value={modalFormState.backgroundColor} onChange={(v) => setModalFormState({...modalFormState, backgroundColor: v})} />
                                            </Grid.Cell>
                                            <Grid.Cell columnSpan={{xs: 6, md: 3}}>
                                                <ColorField label="Primary Accent" value={modalFormState.primaryColor} onChange={(v) => setModalFormState({...modalFormState, primaryColor: v})} />
                                            </Grid.Cell>
                                            <Grid.Cell columnSpan={{xs: 6, md: 3}}>
                                                <ColorField label="Text Color" value={modalFormState.textColor} onChange={(v) => setModalFormState({...modalFormState, textColor: v})} />
                                            </Grid.Cell>
                                            <Grid.Cell columnSpan={{xs: 6, md: 3}}>
                                                <ColorField label="Overlay Backdrop" value={modalFormState.overlayColor} onChange={(v) => setModalFormState({...modalFormState, overlayColor: v})} />
                                            </Grid.Cell>
                                        </Grid>
                                    </BlockStack>
                                    <Divider />
                                    <BlockStack gap="400">
                                        <Text variant="headingMd" as="h3">Floating Button Style</Text>
                                        <Grid>
                                            <Grid.Cell columnSpan={{xs: 6, md: 3}}>
                                                <Select
                                                   label="Layout Style"
                                                   options={[
                                                       {label: 'Boxed', value: 'boxed'},
                                                       {label: 'Minimal Pin', value: 'minimal'},
                                                       {label: 'Premium Glass', value: 'premium'},
                                                   ]}
                                                   value={modalFormState.triggerLayoutStyle}
                                                   onChange={(v) => setModalFormState({...modalFormState, triggerLayoutStyle: v})}
                                                />
                                            </Grid.Cell>
                                            <Grid.Cell columnSpan={{xs: 6, md: 3}}>
                                                <TextField label="Border Radius (px)" value={modalFormState.triggerBorderRadius} onChange={(v) => setModalFormState({...modalFormState, triggerBorderRadius: v})} autoComplete="off" />
                                            </Grid.Cell>
                                            <Grid.Cell columnSpan={{xs: 6, md: 3}}>
                                                <Checkbox label="Enable Pulse Effect" checked={modalFormState.usePulse} onChange={(v) => setModalFormState({...modalFormState, usePulse: v})} />
                                            </Grid.Cell>
                                            <Grid.Cell columnSpan={{xs: 6, md: 3}}>
                                                <Checkbox label="Transparent Background" checked={modalFormState.triggerTransparent} onChange={(v) => setModalFormState({...modalFormState, triggerTransparent: v})} />
                                            </Grid.Cell>
                                            <Grid.Cell columnSpan={{xs: 6, md: 3}}>
                                                <ColorField label="Button Background" value={modalFormState.triggerBackgroundColor} disabled={modalFormState.triggerTransparent || modalFormState.triggerLayoutStyle === 'minimal'} onChange={(v) => setModalFormState({...modalFormState, triggerBackgroundColor: v})} />
                                            </Grid.Cell>
                                            <Grid.Cell columnSpan={{xs: 6, md: 3}}>
                                                <ColorField label="Button Text & Icon" value={modalFormState.triggerTextColor} onChange={(v) => setModalFormState({...modalFormState, triggerTextColor: v})} />
                                            </Grid.Cell>
                                            <Grid.Cell columnSpan={{xs: 6, md: 3}}>
                                                <ColorField label="Button Border" value={modalFormState.triggerBorderColor} disabled={modalFormState.triggerLayoutStyle === 'minimal'} onChange={(v) => setModalFormState({...modalFormState, triggerBorderColor: v})} />
                                            </Grid.Cell>
                                        </Grid>
                                    </BlockStack>
                                </BlockStack>
                            )}

                            {activeDesignerTab === 2 && (
                                <BlockStack gap="500">
                                    <BlockStack gap="400">
                                        <Text variant="headingMd" as="h3">Modal Interaction</Text>
                                        <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                                            <BlockStack gap="300">
                                                <Checkbox 
                                                    label="Lock Background Scroll" 
                                                    helpText="Prevent visitors from scrolling the storefront page while the pincode modal is active."
                                                    checked={modalFormState.disableScroll} 
                                                    onChange={(v) => setModalFormState({...modalFormState, disableScroll: v})} 
                                                />
                                                <Checkbox 
                                                    label="Show on Any Page" 
                                                    helpText="If active, the pincode prompt can appear on any page until a pincode is set."
                                                    checked={modalFormState.showOnAnyPage} 
                                                    onChange={(v) => setModalFormState({...modalFormState, showOnAnyPage: v})} 
                                                />
                                            </BlockStack>
                                        </Box>
                                    </BlockStack>
                                    <Divider />
                                    <BlockStack gap="400">
                                        <Text variant="headingMd" as="h3">Overlay & Backdrop</Text>
                                        <Grid>
                                            <Grid.Cell columnSpan={{xs: 6, md: 3}}>
                                                <TextField 
                                                    label="Overlay Blur Intensity" 
                                                    value={modalFormState.overlayBlur} 
                                                    onChange={(v) => setModalFormState({...modalFormState, overlayBlur: v})} 
                                                    autoComplete="off" 
                                                    placeholder="10px"
                                                    helpText="Amount of background blur when modal is open."
                                                />
                                            </Grid.Cell>
                                            <Grid.Cell columnSpan={{xs: 6, md: 3}}>
                                                <Select
                                                    label="Modal Position"
                                                    options={[
                                                        {label: 'Center', value: 'center'},
                                                        {label: 'Bottom Sheet', value: 'bottom'},
                                                    ]}
                                                    value={modalFormState.position}
                                                    onChange={(v) => setModalFormState({...modalFormState, position: v})}
                                                />
                                            </Grid.Cell>
                                        </Grid>
                                    </BlockStack>
                                </BlockStack>
                            )}
                        </Box>
                    </Tabs>
                </Card>
            </Layout.Section>

            <Layout.Section variant="oneThird">
                <Card padding="0">
                    <Box padding="400" borderBlockEndWidth="025" borderColor="border-secondary" background="bg-surface-secondary">
                        <InlineStack align="space-between" blockAlign="center">
                            <Text variant="headingSm" as="h3">Interactive Preview</Text>
                            <InlineStack gap="100">
                                <Icon source={PhoneIcon} tone="subdued" />
                                <Icon source={DesktopIcon} tone="info" />
                            </InlineStack>
                        </InlineStack>
                    </Box>
                    <Box padding="0" background="bg-surface-tertiary" minHeight="450px" overflowX="hidden" overflowY="hidden">
                        <div style={{ 
                            position: 'relative', 
                            height: '450px', 
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: modalFormState.position === 'bottom' ? 'flex-end' : 'center',
                            alignItems: 'center',
                            padding: '20px',
                            background: `url('https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png') center/cover no-repeat`,
                        }}>
                             {/* Overlay Simulation */}
                             <div style={{
                                 position: 'absolute',
                                 inset: 0,
                                 backgroundColor: modalFormState.overlayColor || 'rgba(0,0,0,0.4)',
                                 backdropFilter: `blur(${modalFormState.overlayBlur || '0px'})`,
                                 zIndex: 1
                             }} />

                             {/* Modal Mockup */}
                             <div style={{ 
                                 position: 'relative',
                                 zIndex: 2,
                                 width: '100%',
                                 maxWidth: '280px',
                                 borderRadius: '16px', 
                                 backgroundColor: modalFormState.backgroundColor || '#fff',
                                 color: modalFormState.textColor || '#000',
                                 boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                                 transform: 'scale(0.9)',
                                 border: `1px solid ${modalFormState.primaryColor || '#ddd'}`,
                                 overflow: 'hidden'
                             }}>
                                  {modalFormState.headerImage && (
                                     <div style={{ width: '100%', height: '80px', overflow: 'hidden' }}>
                                         <img src={modalFormState.headerImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                     </div>
                                  )}
                                  <div style={{ padding: '24px' }}>
                                      <BlockStack gap="300">
                                         <Text variant="headingMd" as="h4">{modalFormState.title || 'Enter Pincode'}</Text>
                                         <Text variant="bodySm" as="p">{modalFormState.description || 'Check availability'}</Text>
                                         <div style={{ display: 'flex', gap: '8px' }}>
                                            <div style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '10px', background: '#fff', color: '#333' }}>400001</div>
                                            <div style={{ backgroundColor: modalFormState.primaryColor, color: '#fff', padding: '8px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>Check</div>
                                         </div>
                                         {modalFormState.showLocationIcon && (
                                            <div style={{ width: '100%', padding: '8px', background: '#f4f4f4', border: '1px solid #ddd', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '9px', color: '#333' }}>
                                                <Icon source={PinIcon} tone="subdued" />
                                                Use my current location
                                            </div>
                                         )}
                                      </BlockStack>
                                  </div>
                             </div>

                             {/* Trigger Button Mockup (smaller) */}
                             <div style={{
                                 position: 'absolute',
                                 bottom: '10px',
                                 right: '10px',
                                 zIndex: 3,
                                 padding: modalFormState.triggerPadding || '8px 16px', 
                                 borderRadius: modalFormState.triggerBorderRadius || '20px', 
                                 backgroundColor: modalFormState.triggerTransparent || modalFormState.triggerLayoutStyle === 'minimal' ? 'rgba(255,255,255,0.2)' : modalFormState.triggerBackgroundColor,
                                 color: modalFormState.triggerTextColor,
                                 border: `1px solid ${modalFormState.triggerBorderColor}`,
                                 backdropFilter: modalFormState.useGlassmorphism ? 'blur(10px)' : 'none',
                                 fontSize: '10px',
                                 display: 'flex',
                                 alignItems: 'center',
                                 gap: '8px',
                                 boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                             }}>
                                  {modalFormState.showCurrentPincode ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: '1.1' }}>
                                              <span style={{ fontSize: '8px', opacity: 0.7 }}>{modalFormState.pincodePrefixText || 'Delivering to:'}</span>
                                              <strong>Mumbai Central</strong>
                                          </div>
                                          <div style={{ padding: '2px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '4px' }}>
                                              <Icon source={EditIcon} tone="inherit" />
                                          </div>
                                      </div>
                                  ) : (
                                      <>
                                          <Icon source={PinIcon} tone="inherit" />
                                          <strong>{modalFormState.floatingButtonText || 'Location'}</strong>
                                      </>
                                  )}
                             </div>
                        </div>
                    </Box>
                    <Box padding="400">
                        <BlockStack gap="300">
                            <Button fullWidth variant="primary" size="large" onClick={handleSaveModal} disabled={!isModalDirty} loading={fetcher.state === 'submitting'}>Deploy Design Architecture</Button>
                            <Text variant="bodyXs" tone="subdued" alignment="center" as="p">Visual changes are pushed to your Edge CDN across all regions.</Text>
                        </BlockStack>
                    </Box>
                </Card>
            </Layout.Section>
        </Layout>
    </BlockStack>
  );

  const renderVisibilitySection = () => (
    <BlockStack gap="600">
      <InlineStack align="space-between" blockAlign="center">
        <BlockStack gap="100">
            <Text variant="headingLg" as="h2">Market Areas</Text>
            <Text variant="bodySm" tone="subdued" as="p">Control theme element visibility across your global market segments.</Text>
        </BlockStack>
        <Badge tone="info">Advanced Mode</Badge>
      </InlineStack>

      {regions.length === 0 ? (
          <Card>
              <EmptyState
                  heading="No regions defined"
                  action={{ content: 'Create Regions', url: '/app/pincodes' }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                  <p>You need to define at least one region in Markets & Coverage before setting up visibility rules.</p>
              </EmptyState>
          </Card>
      ) : (
        <Grid>
            {regions.map((region: any) => {
                const config = visibilityConfigs.find((c: any) => c.regionId === region.id);
                const data = JSON.parse(config?.sectionsOrder || "{}");
                const hasRules = data.hiddenSelectors || data.showOnlySelectors;

                return (
                    <Grid.Cell key={region.id} columnSpan={{ xs: 6, md: 6, lg: 6 }}>
                        <Box 
                            background="bg-surface" 
                            borderRadius="400" 
                            padding="500" 
                            borderStyle="solid" 
                            borderWidth="025" 
                            borderColor={hasRules ? "border-info" : "border"}
                            shadow={hasRules ? "100" : undefined}
                        >
                            <BlockStack gap="400">
                                <InlineStack align="space-between" blockAlign="center">
                                    <InlineStack gap="200" blockAlign="center">
                                        <Avatar size="sm" initials={region.name.substring(0, 1)} name={region.name} />
                                        <Text variant="headingMd" as="h3">{region.name}</Text>
                                    </InlineStack>
                                    <Badge tone={hasRules ? "attention" : undefined}>
                                        {hasRules ? "Active Logic" : "Inherit Global"}
                                    </Badge>
                                </InlineStack>
                                
                                <Divider />

                                <BlockStack gap="400">
                                    <BlockStack gap="200">
                                        <Box width="fit-content">
                                            <InlineStack gap="200" align="start" blockAlign="center">
                                                <Icon source={ViewIcon} tone="subdued" />
                                                <Text variant="bodyMd" fontWeight="semibold" as="span">Exclusion List (CSS)</Text>
                                            </InlineStack>
                                        </Box>
                                        <TextField
                                            label="Exclusion List (CSS)"
                                            labelHidden
                                            value={data.hiddenSelectors || ""}
                                            onChange={(v) => fetcher.submit({ 
                                                intent: 'save_visibility', 
                                                regionId: region.id, 
                                                hiddenSelectors: v, 
                                                showOnlySelectors: data.showOnlySelectors || "" 
                                            }, { method: 'POST' })}
                                            placeholder=".announcement-bar, #hero"
                                            autoComplete="off"
                                            helpText="Elements to hide specifically for visitors in this market."
                                        />
                                    </BlockStack>

                                    <BlockStack gap="200">
                                        <Box width="fit-content">
                                            <InlineStack gap="200" align="start" blockAlign="center">
                                                <Icon source={MagicIcon} tone="info" />
                                                <Text variant="bodyMd" fontWeight="semibold" as="span">Regional Exclusive (CSS)</Text>
                                            </InlineStack>
                                        </Box>
                                        <TextField
                                            label="Regional Exclusive (CSS)"
                                            labelHidden
                                            value={data.showOnlySelectors || ""}
                                            onChange={(v) => fetcher.submit({ 
                                                intent: 'save_visibility', 
                                                regionId: region.id, 
                                                hiddenSelectors: data.hiddenSelectors || "", 
                                                showOnlySelectors: v 
                                            }, { method: 'POST' })}
                                            placeholder=".mumbai-only-banner"
                                            autoComplete="off"
                                            helpText="Elements to show ONLY for visitors in this market."
                                        />
                                    </BlockStack>
                                </BlockStack>
                            </BlockStack>
                        </Box>
                    </Grid.Cell>
                );
            })}
        </Grid>
      )}
    </BlockStack>
  );

  const renderGuardSection = () => {
    const config = (appConfig as any) || {
        pincodeGuardActive: false,
        lockoutMessage: "We don't serve your area yet.",
        excludedPaths: "/pages/contact, /pages/about"
    };

    return (
        <BlockStack gap="600">
            <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                    <Text variant="headingLg" as="h2">Store Access</Text>
                    <Text variant="bodySm" tone="subdued" as="p">Configure storefront gatekeeping and global security protocols.</Text>
                </BlockStack>
                <Badge tone={config.pincodeGuardActive ? "success" : "info"}>
                    {config.pincodeGuardActive ? "Shield Active" : "Unrestricted"}
                </Badge>
            </InlineStack>

            <Layout>
                <Layout.Section>
                    <Box 
                        background="bg-surface" 
                        borderRadius="400" 
                        padding="600" 
                        borderStyle="solid" 
                        borderWidth="025" 
                        borderColor={config.pincodeGuardActive ? "border-success" : "border"}
                        shadow="100"
                    >
                        <BlockStack gap="500">
                            <InlineStack align="space-between" blockAlign="center">
                                <BlockStack gap="100">
                                    <Text variant="headingMd" as="h3">Store Access Gate</Text>
                                    <Text variant="bodySm" tone="subdued" as="p">Require customers to enter a valid pincode before browsing.</Text>
                                </BlockStack>
                                <Button 
                                    variant={config.pincodeGuardActive ? "primary" : "secondary"} 
                                    onClick={() => fetcher.submit({ 
                                        intent: 'save_app_config', 
                                        pincodeGuardActive: String(!config.pincodeGuardActive),
                                        lockoutMessage: config.lockoutMessage || "",
                                        excludedPaths: config.excludedPaths || "",
                                        regionalPricingActive: String(config.regionalPricingActive ?? true),
                                        visibilityRulesActive: String(config.visibilityRulesActive ?? true),
                                        abTestingActive: String(config.abTestingActive ?? false),
                                        waitlistActive: String(config.waitlistActive ?? true)
                                    }, { method: 'POST' })}
                                >
                                    {config.pincodeGuardActive ? "Deactivate Wall" : "Activate Wall"}
                                </Button>
                            </InlineStack>

                            {config.pincodeGuardActive && (
                                <Box background="bg-surface-secondary" padding="500" borderRadius="300">
                                    <BlockStack gap="400">
                                        <TextField
                                            label="Lockout Messaging"
                                            value={config.lockoutMessage || ""}
                                            autoComplete="off"
                                            onChange={(v) => fetcher.submit({ 
                                                intent: 'save_app_config', 
                                                pincodeGuardActive: 'true',
                                                lockoutMessage: v,
                                                excludedPaths: config.excludedPaths || "",
                                                regionalPricingActive: String(config.regionalPricingActive ?? true),
                                                visibilityRulesActive: String(config.visibilityRulesActive ?? true),
                                                abTestingActive: String(config.abTestingActive ?? false),
                                                waitlistActive: String(config.waitlistActive ?? true)
                                            }, { method: 'POST' })}
                                            helpText="Message displayed when coverage is unavailable."
                                        />
                                        <TextField
                                            label="Whitelisted URL Paths"
                                            value={config.excludedPaths || ""}
                                            autoComplete="off"
                                            onChange={(v) => fetcher.submit({ 
                                                intent: 'save_app_config', 
                                                pincodeGuardActive: 'true',
                                                lockoutMessage: config.lockoutMessage || "",
                                                excludedPaths: v,
                                                regionalPricingActive: String(config.regionalPricingActive ?? true),
                                                visibilityRulesActive: String(config.visibilityRulesActive ?? true),
                                                abTestingActive: String(config.abTestingActive ?? false),
                                                waitlistActive: String(config.waitlistActive ?? true)
                                            }, { method: 'POST' })}
                                            helpText="Allow access to these pages without a pincode (CSV)."
                                        />
                                    </BlockStack>
                                </Box>
                            )}
                        </BlockStack>
                    </Box>
                </Layout.Section>

                <Layout.Section variant="oneThird">
                    <Card>
                        <BlockStack gap="300">
                            <Text variant="headingSm" as="h4">Deployment Status</Text>
                            <Divider />
                            <InlineStack align="space-between">
                                <Text variant="bodySm" tone="subdued" as="span">Theme Blocks</Text>
                                <Badge tone="success">Active</Badge>
                            </InlineStack>
                            <InlineStack align="space-between">
                                <Text variant="bodySm" tone="subdued" as="span">API Sync</Text>
                                <Badge tone="success">Healthy</Badge>
                            </InlineStack>
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>
        </BlockStack>
    );
  };

  if (isStudioOpen) return renderStudio();

  return (
    <Page 
        fullWidth
        title="Visual Studio Hub"
        subtitle="Design and deploy regional elements with the precision of a master architect."
        backAction={{ content: 'Dashboard', url: '/app' }}
        primaryAction={{
            content: "Create Component",
            onAction: () => setIsComponentModalOpen(true),
            icon: PlusIcon
        }}
    >
      <BlockStack gap="600">
        {/* Studio Intelligence Header */}
        <Grid>
            {/* ... (Grid content remains the same) */}
            <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 4, lg: 3}}>
                <Card>
                    <BlockStack gap="200">
                        <InlineStack align="space-between">
                            <Text variant="headingSm" as="h3" tone="subdued">Design Library</Text>
                            <Icon source={AppsIcon} tone="info" />
                        </InlineStack>
                        <Text variant="headingLg" as="p">{components.length} Master Assets</Text>
                    </BlockStack>
                </Card>
            </Grid.Cell>
            <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 4, lg: 3}}>
                <Card>
                    <BlockStack gap="200">
                        <InlineStack align="space-between">
                            <Text variant="headingSm" as="h3" tone="subdued">Active Variants</Text>
                            <Icon source={CollectionIcon} tone="success" />
                        </InlineStack>
                        <Text variant="headingLg" as="p">{components.reduce((acc: number, c: any) => acc + c.overrides.length, 0)} Contexts</Text>
                    </BlockStack>
                </Card>
            </Grid.Cell>
            <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 4, lg: 3}}>
                <Card>
                    <BlockStack gap="200">
                        <InlineStack align="space-between">
                            <Text variant="headingSm" as="h3" tone="subdued">Widget Status</Text>
                            <Icon source={ShieldCheckMarkIcon} tone="success" />
                        </InlineStack>
                        <Text variant="headingLg" as="p">{appConfig?.pincodeGuardActive ? "Secured" : "Public"}</Text>
                    </BlockStack>
                </Card>
            </Grid.Cell>
            <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 4, lg: 3}}>
                <Card>
                    <BlockStack gap="200">
                        <InlineStack align="space-between">
                            <Text variant="headingSm" as="h3" tone="subdued">System Health</Text>
                            <Icon source={CheckIcon} tone="success" />
                        </InlineStack>
                        <Text variant="headingLg" as="p">Studio Online</Text>
                    </BlockStack>
                </Card>
            </Grid.Cell>
        </Grid>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            <div style={{ width: '260px', flexShrink: 0 }}>
                <Card padding="0">
                    <Box padding="400" background="bg-surface-secondary" borderBlockEndWidth="025" borderColor="border-secondary">
                        <Text variant="headingSm" as="h3">Studio Pillars</Text>
                    </Box>
                    <Box padding="200">
                        <BlockStack gap="100">
                            {[
                                { id: 0, label: 'Regional Content', icon: AppsIcon, desc: "Create and manage custom banners, text, and popups for specific regions." },
                                { id: 1, label: 'Popup Style', icon: PaintBrushFlatIcon, desc: "Customize how your pincode popup looks and behaves on your storefront." },
                                { id: 2, label: 'Market Areas', icon: PinIcon, desc: "Define the countries, states, or pincode lists that your rules will target." },
                                { id: 3, label: 'Store Access', icon: ShieldCheckMarkIcon, desc: "Control store entry with entrance guards, scroll-locks, and regional redirects." },
                            ].map((item) => {
                                const isActive = selectedTab === item.id;
                                return (
                                    <div 
                                        key={item.id} 
                                        style={{ cursor: 'pointer' }} 
                                        onClick={() => setSelectedTab(item.id)}
                                    >
                                        <Box 
                                            padding="200" 
                                            borderRadius="200" 
                                            background={isActive ? "bg-surface-secondary" : undefined}
                                            shadow={isActive ? "100" : undefined}
                                            borderInlineStartWidth={isActive ? "100" : "0"}
                                            borderColor="border-info"
                                        >
                                            <InlineStack gap="200" blockAlign="center" align="start">
                                                <div style={{ padding: '4px' }}>
                                                    <Icon source={item.icon} tone={isActive ? "info" : "subdued"} />
                                                </div>
                                                <div style={{ padding: '2px 0' }}>
                                                    <InlineStack gap="100" blockAlign="center">
                                                        <Text variant="bodyMd" fontWeight={isActive ? "bold" : "medium"} as="span">
                                                            {item.label}
                                                        </Text>
                                                        <Tooltip content={(item as any).desc} dismissOnMouseOut>
                                                            <Box padding="050">
                                                                <Icon source={InfoIcon} tone="subdued" />
                                                            </Box>
                                                        </Tooltip>
                                                    </InlineStack>
                                                </div>
                                            </InlineStack>
                                        </Box>
                                    </div>
                                );
                            })}
                        </BlockStack>
                    </Box>
                </Card>
            </div>

            <div style={{ flex: 1, minWidth: 0, minHeight: '600px' }}>
                {selectedTab === 0 ? renderComponentList() : 
                 selectedTab === 1 ? renderExperienceDesigner() : 
                 selectedTab === 2 ? renderVisibilitySection() : 
                 renderGuardSection()}
            </div>
        </div>
      </BlockStack>

      <Modal
        open={isComponentModalOpen}
        onClose={() => setIsComponentModalOpen(false)}
        title="Create Regional Component"
        primaryAction={{ content: 'Create Component', onAction: handleCreateComponent, disabled: !newComponentName }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setIsComponentModalOpen(false) }]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <TextField label="Component Name" value={newComponentName} onChange={setNewComponentName} autoComplete="off" placeholder="e.g. Mumbai Delivery Banner" />
            <Select
              label="Component Type"
              options={[
                { label: 'Image Banner', value: 'banner' },
                { label: 'Pincode & Delivery Widget', value: 'pincode_widget' },
                { label: 'Countdown Timer', value: 'counter' },
                { label: 'Featured Products', value: 'products' },
                { label: 'Custom Liquid / HTML', value: 'custom_liquid' }
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

function ColorField({ label, value, onChange, disabled }: { label: string, value: string, onChange: (v: string) => void, disabled?: boolean }) {
    const [popoverActive, setPopoverActive] = useState(false);
    const togglePopoverActive = useCallback(() => setPopoverActive((active) => !active), []);
    
    return (
        <BlockStack gap="100">
            <TextField
                label={label}
                value={value}
                onChange={onChange}
                disabled={disabled}
                autoComplete="off"
                prefix={
                    <div 
                        onClick={!disabled ? togglePopoverActive : undefined}
                        style={{ 
                            width: '20px', 
                            height: '20px', 
                            borderRadius: '4px', 
                            backgroundColor: value, 
                            border: '1px solid #dfe3e8', 
                            cursor: disabled ? 'default' : 'pointer' 
                        }} 
                    />
                }
            />
            {!disabled && (
                <Popover
                    active={popoverActive}
                    activator={<div style={{ height: 0 }} />}
                    onClose={togglePopoverActive}
                    autofocusTarget="none"
                >
                    <Box padding="400">
                        <ColorPicker
                            onChange={(hsb) => onChange(hsbToHex(hsb))}
                            color={hexToHsb(value)}
                        />
                    </Box>
                </Popover>
            )}
        </BlockStack>
    );
}

function hexToRgb(hex: string) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    red: parseInt(result[1], 16),
    green: parseInt(result[2], 16),
    blue: parseInt(result[3], 16)
  } : { red: 0, green: 0, blue: 0 };
}

function hexToHsb(hex: string) {
    const rgb = hexToRgb(hex);
    return rgbToHsb(rgb);
}
