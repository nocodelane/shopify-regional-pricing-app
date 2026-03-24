import {
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  InlineStack,
  Badge,
  Grid,
  EmptyState,
  ButtonGroup,
  Tooltip,
  Avatar,
  ResourceList,
  ResourceItem,
} from "@shopify/polaris";
import {
  EditIcon,
  DeleteIcon,
  PlusIcon,
  AppsIcon,
  ListBulletedIcon,
} from "@shopify/polaris-icons";

interface StudioLibraryProps {
  components: any[];
  viewMode: 'list' | 'card';
  setViewMode: (mode: 'list' | 'card') => void;
  setIsComponentModalOpen: (open: boolean) => void;
  setEditingComponent: (comp: any) => void;
  setActiveRegionId: (id: string) => void;
  setIsStudioOpen: (open: boolean) => void;
  fetcher: any;
  shopify: any;
}

export function StudioLibrary({
  components,
  viewMode,
  setViewMode,
  setIsComponentModalOpen,
  setEditingComponent,
  setActiveRegionId,
  setIsStudioOpen,
  fetcher,
  shopify,
}: StudioLibraryProps) {
  return (
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
                        <Button
                          icon={EditIcon}
                          variant="tertiary"
                          onClick={() => {
                            setEditingComponent({
                              ...comp,
                              defaultSettings: JSON.parse(comp.defaultSettings || "{}"),
                            });
                            setActiveRegionId('global');
                            setIsStudioOpen(true);
                          }}
                        />
                      </Tooltip>
                      <Button
                        icon={DeleteIcon}
                        tone="critical"
                        variant="tertiary"
                        onClick={() => {
                          if (confirm("Permanently delete this component?")) {
                            fetcher.submit({ intent: 'delete_component', id: comp.id }, { method: 'POST' });
                          }
                        }}
                      />
                    </InlineStack>
                  </InlineStack>
                </Box>

                <Box padding="500">
                  <BlockStack gap="400">
                    <BlockStack gap="100">
                      <Text variant="headingMd" as="h3" fontWeight="bold">{comp.name}</Text>
                      <InlineStack gap="100" blockAlign="center">
                        <Text variant="bodyXs" tone="subdued" as="p">
                          Component ID: <code>{comp.id.substring(0, 8)}</code>
                        </Text>
                        <Button
                          variant="plain"
                          size="micro"
                          onClick={() => {
                            navigator.clipboard.writeText(comp.id);
                            shopify.toast.show("ID Copied to Clipboard");
                          }}
                        >
                          Copy
                        </Button>
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

                    <Button
                      fullWidth
                      variant="secondary"
                      onClick={() => {
                        setEditingComponent({
                          ...comp,
                          defaultSettings: JSON.parse(comp.defaultSettings || "{}"),
                        });
                        setActiveRegionId('global');
                        setIsStudioOpen(true);
                      }}
                    >
                      Enter Design Studio
                    </Button>
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
              <ResourceItem
                id={comp.id}
                onClick={() => {
                  setEditingComponent({
                    ...comp,
                    defaultSettings: JSON.parse(comp.defaultSettings || "{}"),
                  });
                  setActiveRegionId('global');
                  setIsStudioOpen(true);
                }}
              >
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
                    <Button
                      variant="tertiary"
                      icon={EditIcon}
                      onClick={() => {
                        setEditingComponent({
                          ...comp,
                          defaultSettings: JSON.parse(comp.defaultSettings || "{}"),
                        });
                        setActiveRegionId('global');
                        setIsStudioOpen(true);
                      }}
                    />
                    <Button
                      icon={DeleteIcon}
                      tone="critical"
                      variant="tertiary"
                      onClick={() => {
                        if (confirm("Permanently delete?")) {
                          fetcher.submit({ intent: 'delete_component', id: comp.id }, { method: 'POST' });
                        }
                      }}
                    />
                  </InlineStack>
                </InlineStack>
              </ResourceItem>
            )}
          />
        </Card>
      )}
    </BlockStack>
  );
}
