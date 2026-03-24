import { useState, useCallback } from "react";
import {
  BlockStack,
  InlineStack,
  Text,
  Box,
  Button,
  Layout,
  Card,
  Tabs,
  TextField,
  Divider,
  Icon,
  Checkbox,
  Grid,
  Select,
  Popover,
  ColorPicker,
  hsbToHex,
  rgbToHsb,
} from "@shopify/polaris";
import {
  MagicIcon,
  PhoneIcon,
  DesktopIcon,
  PinIcon,
  EditIcon,
} from "@shopify/polaris-icons";

interface ExperienceDesignerProps {
  modalFormState: any;
  setModalFormState: (s: any) => void;
  applyPreset: (type: 'modern' | 'minimal' | 'classic' | 'premium') => void;
  activeDesignerTab: number;
  setActiveDesignerTab: (t: number) => void;
  fetcher: any;
  handleSaveModal: () => void;
  isModalDirty: boolean;
}

export function ExperienceDesigner({
  modalFormState,
  setModalFormState,
  applyPreset,
  activeDesignerTab,
  setActiveDesignerTab,
  fetcher,
  handleSaveModal,
  isModalDirty,
}: ExperienceDesignerProps) {
  return (
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
                { id: 'content', content: 'Content & Copy' },
                { id: 'style', content: 'Visual Style' },
                { id: 'behavior', content: 'Interaction & Scroll' }
              ]}
              selected={activeDesignerTab}
              onSelect={setActiveDesignerTab}
            >
              <Box padding="600">
                {activeDesignerTab === 0 && (
                  <BlockStack gap="500">
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h3">Core Messaging</Text>
                      <TextField label="Modal Title" value={modalFormState.title} onChange={(v) => setModalFormState({ ...modalFormState, title: v })} autoComplete="off" />
                      <TextField label="Modal Description" value={modalFormState.description} multiline={3} onChange={(v) => setModalFormState({ ...modalFormState, description: v })} autoComplete="off" />

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
                      <TextField label="Header Image URL" value={modalFormState.headerImage || ''} onChange={(v) => setModalFormState({ ...modalFormState, headerImage: v })} placeholder="https://cdn.shopify.com/..." autoComplete="off" />
                      <InlineStack gap="400">
                        <Checkbox label="Show Location Button" checked={modalFormState.showLocationIcon} onChange={(v) => setModalFormState({ ...modalFormState, showLocationIcon: v })} />
                        <Checkbox label="Show Current Pincode on Trigger" checked={modalFormState.showCurrentPincode} onChange={(v) => setModalFormState({ ...modalFormState, showCurrentPincode: v })} />
                      </InlineStack>
                      {modalFormState.showCurrentPincode && (
                        <TextField
                          label="Pincode Prefix Text"
                          value={modalFormState.pincodePrefixText || 'Delivering to:'}
                          onChange={(v) => setModalFormState({ ...modalFormState, pincodePrefixText: v })}
                          placeholder="Delivering to:"
                          autoComplete="off"
                          helpText="Appears above the pincode/region name on the floating button."
                        />
                      )}
                    </BlockStack>
                    <Divider />
                    <BlockStack gap="400">
                      <Text variant="headingSm" as="h3">Button Labels</Text>
                      <TextField label="Floating Trigger Text" value={modalFormState.floatingButtonText} onChange={(v) => setModalFormState({ ...modalFormState, floatingButtonText: v })} autoComplete="off" />
                      <TextField label="Modal Confirm Button" value={modalFormState.confirmButtonText} onChange={(v) => setModalFormState({ ...modalFormState, confirmButtonText: v })} autoComplete="off" />
                    </BlockStack>
                  </BlockStack>
                )}

                {activeDesignerTab === 1 && (
                  <BlockStack gap="500">
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h3">Pincode Modal Style</Text>
                      <Grid>
                        <Grid.Cell columnSpan={{ xs: 6, md: 3 }}>
                          <ColorField label="Surface Background" value={modalFormState.backgroundColor} onChange={(v) => setModalFormState({ ...modalFormState, backgroundColor: v })} />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 6, md: 3 }}>
                          <ColorField label="Primary Accent" value={modalFormState.primaryColor} onChange={(v) => setModalFormState({ ...modalFormState, primaryColor: v })} />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 6, md: 3 }}>
                          <ColorField label="Text Color" value={modalFormState.textColor} onChange={(v) => setModalFormState({ ...modalFormState, textColor: v })} />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 6, md: 3 }}>
                          <ColorField label="Overlay Backdrop" value={modalFormState.overlayColor} onChange={(v) => setModalFormState({ ...modalFormState, overlayColor: v })} />
                        </Grid.Cell>
                      </Grid>
                    </BlockStack>
                    <Divider />
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h3">Floating Button Style</Text>
                      <Grid>
                        <Grid.Cell columnSpan={{ xs: 6, md: 3 }}>
                          <Select
                            label="Layout Style"
                            options={[
                              { label: 'Boxed', value: 'boxed' },
                              { label: 'Minimal Pin', value: 'minimal' },
                              { label: 'Premium Glass', value: 'premium' },
                            ]}
                            value={modalFormState.triggerLayoutStyle}
                            onChange={(v) => setModalFormState({ ...modalFormState, triggerLayoutStyle: v })}
                          />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 6, md: 3 }}>
                          <TextField label="Border Radius (px)" value={modalFormState.triggerBorderRadius} onChange={(v) => setModalFormState({ ...modalFormState, triggerBorderRadius: v })} autoComplete="off" />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 6, md: 3 }}>
                          <Checkbox label="Enable Pulse Effect" checked={modalFormState.usePulse} onChange={(v) => setModalFormState({ ...modalFormState, usePulse: v })} />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 6, md: 3 }}>
                          <Checkbox label="Transparent Background" checked={modalFormState.triggerTransparent} onChange={(v) => setModalFormState({ ...modalFormState, triggerTransparent: v })} />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 6, md: 3 }}>
                          <ColorField label="Button Background" value={modalFormState.triggerBackgroundColor} disabled={modalFormState.triggerTransparent || modalFormState.triggerLayoutStyle === 'minimal'} onChange={(v) => setModalFormState({ ...modalFormState, triggerBackgroundColor: v })} />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 6, md: 3 }}>
                          <ColorField label="Button Text & Icon" value={modalFormState.triggerTextColor} onChange={(v) => setModalFormState({ ...modalFormState, triggerTextColor: v })} />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 6, md: 3 }}>
                          <ColorField label="Button Border" value={modalFormState.triggerBorderColor} disabled={modalFormState.triggerLayoutStyle === 'minimal'} onChange={(v) => setModalFormState({ ...modalFormState, triggerBorderColor: v })} />
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
                            onChange={(v) => setModalFormState({ ...modalFormState, disableScroll: v })}
                          />
                          <Checkbox
                            label="Show on Any Page"
                            helpText="If active, the pincode prompt can appear on any page until a pincode is set."
                            checked={modalFormState.showOnAnyPage}
                            onChange={(v) => setModalFormState({ ...modalFormState, showOnAnyPage: v })}
                          />
                        </BlockStack>
                      </Box>
                    </BlockStack>
                    <Divider />
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h3">Overlay & Backdrop</Text>
                      <Grid>
                        <Grid.Cell columnSpan={{ xs: 6, md: 3 }}>
                          <TextField
                            label="Overlay Blur Intensity"
                            value={modalFormState.overlayBlur}
                            onChange={(v) => setModalFormState({ ...modalFormState, overlayBlur: v })}
                            autoComplete="off"
                            placeholder="10px"
                            helpText="Amount of background blur when modal is open."
                          />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 6, md: 3 }}>
                          <Select
                            label="Modal Position"
                            options={[
                              { label: 'Center', value: 'center' },
                              { label: 'Bottom Sheet', value: 'bottom' },
                            ]}
                            value={modalFormState.position}
                            onChange={(v) => setModalFormState({ ...modalFormState, position: v })}
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
