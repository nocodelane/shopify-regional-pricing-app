import {
  Page,
  Layout,
  BlockStack,
  Card,
  Box,
  Text,
  Button,
  InlineStack,
  Badge,
  Banner,
  Divider,
  TextField,
  Select,
  Grid,
  Modal,
} from "@shopify/polaris";
import {
  PlusIcon,
  SearchIcon,
  ViewIcon,
  DeleteIcon,
} from "@shopify/polaris-icons";

interface DesignStudioProps {
  editingComponent: any;
  components: any[];
  regions: any[];
  activeRegionId: string;
  setActiveRegionId: (id: string) => void;
  setIsStudioOpen: (open: boolean) => void;
  handleUpdateComponent: () => void;
  handleSaveOverride: (settings: any, rId: string) => void;
  fetcher: any;
  isAddOverrideModalOpen: boolean;
  setIsAddOverrideModalOpen: (open: boolean) => void;
  newOverrideRegionId: string;
  setNewOverrideRegionId: (id: string) => void;
  handleAddOverride: () => void;
  setEditingComponent: (comp: any) => void;
}

export function DesignStudio({
  editingComponent,
  components,
  regions,
  activeRegionId,
  setActiveRegionId,
  setIsStudioOpen,
  handleUpdateComponent,
  handleSaveOverride,
  fetcher,
  isAddOverrideModalOpen,
  setIsAddOverrideModalOpen,
  newOverrideRegionId,
  setNewOverrideRegionId,
  handleAddOverride,
  setEditingComponent,
}: DesignStudioProps) {
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
                      <Button
                        variant="plain"
                        size="micro"
                        tone="critical"
                        onClick={() => {
                          if (confirm("Remove override?")) fetcher.submit({ intent: 'delete_override', id: ov.id }, { method: 'POST' });
                        }}
                        icon={DeleteIcon}
                      />
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
                  <Grid.Cell columnSpan={{ xs: 6, md: 3 }}>
                    <BlockStack gap="200">
                      <TextField label="Desktop Aspect Ratio" value={activeSettings.desktopAspectRatio || ''} onChange={(v) => updateActiveSettings('desktopAspectRatio', v)} autoComplete="off" placeholder="16 / 9" />
                      <TextField label="Desktop Min Height (px)" value={activeSettings.desktopHeight || ''} onChange={(v) => updateActiveSettings('desktopHeight', v)} autoComplete="off" placeholder="400" />
                    </BlockStack>
                  </Grid.Cell>
                  <Grid.Cell columnSpan={{ xs: 6, md: 3 }}>
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
}
