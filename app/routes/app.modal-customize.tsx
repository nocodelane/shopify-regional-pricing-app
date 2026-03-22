import { useState, useEffect, useCallback } from "react";
import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useFetcher, useNavigate, useSearchParams, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  TextField,
  Box,
  InlineStack,
  Divider,
  Grid,
  Tabs,
  Badge,
  Icon,
  ContextualSaveBar,
  SkeletonPage,
  Checkbox,
  Select,
  Banner,
  Popover,
  ColorPicker,
  hsbToHex,
  rgbToHsb,
} from "@shopify/polaris";
import {
  ViewIcon,
  MagicIcon,
} from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { generateCopy } from "../utils/llm.server";

// Helper to sanitize database strings
const s = (val: any, fallback: string) => {
  if (!val || val === "undefined" || val === "null" || val === "") return fallback;
  return String(val);
};

// Utils for color conversion
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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  let config = await prisma.modalConfig.findUnique({ where: { shop: session.shop } });
  
  if (!config) {
    config = await prisma.modalConfig.create({ data: { shop: session.shop } });
  }

  return json({ config: {
    ...config,
    showFloatingButton: config.showFloatingButton === true,
    showCurrentPincode: config.showCurrentPincode === true,
    showLocationIcon: config.showLocationIcon === true,
    triggerTransparent: config.triggerTransparent === true,
    usePulse: (config as any).usePulse === true,
    useGlassmorphism: (config as any).useGlassmorphism === true,
    showOnAnyPage: (config as any).showOnAnyPage !== false,
    disableScroll: (config as any).disableScroll !== false,
    overlayColor: s((config as any).overlayColor, "rgba(0,0,0,0.6)"),
    overlayBlur: s((config as any).overlayBlur, "8px"),
    title: s(config.title, "Enter your Pincode"),
    description: s(config.description, "Please provide your pincode to see accurate regional pricing."),
    confirmButtonText: s(config.confirmButtonText, "Confirm"),
    floatingButtonText: s(config.floatingButtonText, "Change Pincode"),
    primaryColor: s(config.primaryColor, "#4338ca"),
    backgroundColor: s(config.backgroundColor, "#ffffff"),
    textColor: s(config.textColor, "#1a1a1a"),
    triggerBackgroundColor: s(config.triggerBackgroundColor, "#4338ca"),
    triggerTextColor: s(config.triggerTextColor, "#ffffff"),
    triggerIconColor: s(config.triggerIconColor, "#ffffff"),
    triggerBorderRadius: s(config.triggerBorderRadius, "24px"),
    triggerPadding: s((config as any).triggerPadding, "10px 18px"),
    triggerFontSize: s((config as any).triggerFontSize, "14px"),
    triggerFontWeight: s((config as any).triggerFontWeight, "600"),
    triggerLayoutStyle: s((config as any).triggerLayoutStyle, "boxed"),
    triggerIconSize: s((config as any).triggerIconSize, "18px"),
    triggerBorderWidth: s((config as any).triggerBorderWidth, "1px"),
    triggerBorderColor: s((config as any).triggerBorderColor, "#4338ca"),
    pincodePrefixText: s(config.pincodePrefixText, "Delivering to: "),
    injectionSelector: s(config.injectionSelector, ""),
  }});
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const data = Object.fromEntries(formData);
  
  await prisma.modalConfig.update({
    where: { shop: session.shop },
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

  if (intent === "generate-ai-content") {
    const prompt = formData.get("prompt") as string;
    try {
        const copy = await generateCopy(session.shop, prompt);
        return json({ success: true, aiCopy: copy });
    } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
    }
  }

  return json({ success: true });
};

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

export default function ModalCustomize() {
  const { config } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const navigation = useNavigation();
  const [formState, setFormState] = useState<any>(config);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = parseInt(searchParams.get("tab") || "0");
  const [selectedTab, setSelectedTab] = useState(initialTab);

  const handleTabChange = (index: number) => {
    setSelectedTab(index);
    setSearchParams({ tab: index.toString() }, { replace: true });
  };

  useEffect(() => {
    setFormState(config);
  }, [config]);

  const isDirty = JSON.stringify(formState) !== JSON.stringify(config);

  const handleSave = () => {
    const formData = new FormData();
    Object.keys(formState).forEach(key => {
      const val = formState[key];
      if (val !== undefined && val !== null) {
        formData.append(key, String(val));
      }
    });
    fetcher.submit(formData, { method: "POST" });
    shopify.toast.show("Widget preferences saved");
  };

  const StorefrontIcon = ({ color, size }: { color: string, size: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={{ width: size, height: size }}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );

  if (navigation.state === "loading" && !fetcher.state) {
    return <SkeletonPage title="Widget Editor" backAction fullWidth />;
  }

  const applyPreset = (type: 'modern' | 'minimal' | 'classic' | 'premium') => {
    const presets = {
       modern: { triggerLayoutStyle: 'boxed', triggerPadding: '10px 20px', triggerBorderRadius: '30px', triggerTransparent: false, usePulse: true, useGlassmorphism: false },
       minimal: { triggerLayoutStyle: 'minimal', triggerPadding: '6px 12px', triggerBorderRadius: '0px', triggerTransparent: true, usePulse: false, useGlassmorphism: false },
       classic: { triggerLayoutStyle: 'boxed', triggerPadding: '12px 24px', triggerBorderRadius: '4px', triggerTransparent: false, usePulse: false, useGlassmorphism: false },
       premium: { triggerLayoutStyle: 'premium', triggerPadding: '14px 28px', triggerBorderRadius: '30px', triggerTransparent: false, usePulse: false, useGlassmorphism: true }
    };
    setFormState({ ...formState, ...presets[type] });
  };

  return (
    <Page backAction={{ content: 'Dashboard', url: '/app' }} title="Experience Studio" fullWidth>
      {isDirty && (
        <ContextualSaveBar
          message="Unsaved widget changes"
          saveAction={{ onAction: handleSave, loading: fetcher.state === 'submitting' }}
          discardAction={{ onAction: () => setFormState(config) }}
        />
      )}
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
             <Card>
                <Box padding="400">
                   <BlockStack gap="400">
                      <Text variant="headingMd" as="h2">Quick Design Presets</Text>
                      <InlineStack gap="300">
                         <Button onClick={() => applyPreset('modern')}>Modern Pill</Button>
                         <Button onClick={() => applyPreset('minimal')}>Minimal Inline</Button>
                         <Button onClick={() => applyPreset('premium')}>Premium Glass</Button>
                         <Button onClick={() => applyPreset('classic')}>Classic Box</Button>
                      </InlineStack>
                   </BlockStack>
                </Box>
             </Card>

             <Card padding="0">
                <Tabs tabs={[
                    {id: 'msg', content: 'Content & Modal'}, 
                    {id: 'vis', content: 'Trigger Style'}, 
                    {id: 'lay', content: 'Theme Integration'},
                    {id: 'ai', content: 'AI Localization'}
                ]} selected={selectedTab} onSelect={handleTabChange}>
                <Box padding="600">
                   {selectedTab === 0 && (
                      <BlockStack gap="600">
                         <Layout>
                            <Layout.Section variant="oneThird">
                               <Box paddingBlockEnd="400">
                                  <Text variant="headingMd" as="h2">Modal Content</Text>
                                  <Text tone="subdued" as="p">Customize the text users see within the popup.</Text>
                               </Box>
                            </Layout.Section>
                            <Layout.Section>
                               <Card padding="400">
                                  <BlockStack gap="400">
                                     <TextField label="Main Heading" value={formState.title} onChange={(v) => setFormState({...formState, title: v})} autoComplete="off" />
                                     <TextField label="Description Instruction" value={formState.description} multiline={2} onChange={(v) => setFormState({...formState, description: v})} autoComplete="off" />
                                     <TextField label="Confirm Button Text" value={formState.confirmButtonText} onChange={(v) => setFormState({...formState, confirmButtonText: v})} autoComplete="off" />
                                  </BlockStack>
                               </Card>
                            </Layout.Section>
                         </Layout>

                         <Divider />

                         <Layout>
                            <Layout.Section variant="oneThird">
                               <Box paddingBlockEnd="400">
                                  <Text variant="headingMd" as="h2">Modal Branding</Text>
                                  <Text tone="subdued" as="p">Match the popup to your brand colors and add a custom header image.</Text>
                               </Box>
                            </Layout.Section>
                            <Layout.Section>
                               <Card padding="400">
                                  <BlockStack gap="400">
                                     <TextField label="Header Image URL" value={formState.headerImage || ''} placeholder="https://cdn.shopify.com/..." onChange={(v) => setFormState({...formState, headerImage: v})} helpText="Recommended size: 450x180px" autoComplete="off" />
                                     <Grid>
                                        <Grid.Cell columnSpan={{xs: 6, sm: 4, md: 4}}>
                                            <ColorField label="Modal Background" value={formState.backgroundColor} onChange={(v) => setFormState({...formState, backgroundColor: v})} />
                                        </Grid.Cell>
                                        <Grid.Cell columnSpan={{xs: 6, sm: 4, md: 4}}>
                                            <ColorField label="Primary Action Color" value={formState.primaryColor} onChange={(v) => setFormState({...formState, primaryColor: v})} />
                                        </Grid.Cell>
                                         <Grid.Cell columnSpan={{xs: 6, sm: 4, md: 4}}>
                                             <ColorField label="Modal Text Color" value={formState.textColor} onChange={(v) => setFormState({...formState, textColor: v})} />
                                         </Grid.Cell>
                                      </Grid>
                                      <Grid>
                                         <Grid.Cell columnSpan={{xs: 6, sm: 4, md: 6}}>
                                             <TextField label="Overlay Color (RGBA)" value={formState.overlayColor} onChange={(v) => setFormState({...formState, overlayColor: v})} helpText="E.g. rgba(0,0,0,0.6)" autoComplete="off" prefix={<div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: formState.overlayColor, border: '1px solid #ddd' }} />} />
                                         </Grid.Cell>
                                         <Grid.Cell columnSpan={{xs: 6, sm: 4, md: 6}}>
                                             <TextField label="Overlay Blur" value={formState.overlayBlur} onChange={(v) => setFormState({...formState, overlayBlur: v})} helpText="E.g. 5px, 10px" autoComplete="off" />
                                         </Grid.Cell>
                                      </Grid>
                                   </BlockStack>
                               </Card>
                            </Layout.Section>
                         </Layout>

                         <Divider />

                         <Layout>
                            <Layout.Section variant="oneThird">
                               <Box paddingBlockEnd="400">
                                  <Text variant="headingMd" as="h2">Trigger Labels</Text>
                                  <Text tone="subdued" as="p">The text shown on the buttons that open the pincode modal.</Text>
                               </Box>
                            </Layout.Section>
                            <Layout.Section>
                               <Card padding="400">
                                  <BlockStack gap="400">
                                     <TextField label="Default Button Text" value={formState.floatingButtonText} onChange={(v) => setFormState({...formState, floatingButtonText: v})} helpText="Shown when no location is set." autoComplete="off" />
                                     <TextField label="Detected Location Prefix" value={formState.pincodePrefixText} onChange={(v) => setFormState({...formState, pincodePrefixText: v})} helpText="E.g. 'Delivering to: '" autoComplete="off" />
                                  </BlockStack>
                               </Card>
                            </Layout.Section>
                         </Layout>
                      </BlockStack>
                   )}

                   {selectedTab === 1 && (
                      <BlockStack gap="800">
                         <Layout>
                            <Layout.Section variant="oneThird">
                               <Box paddingBlockEnd="400">
                                  <Text variant="headingMd" as="h2">Layout & Effects</Text>
                                  <Text tone="subdued" as="p">Choose how the widget appears. Premium layouts include subtle transitions and elevation.</Text>
                               </Box>
                            </Layout.Section>
                            <Layout.Section>
                               <Card padding="400">
                                  <BlockStack gap="500">
                                     <Grid>
                                        <Grid.Cell columnSpan={{xs: 6, sm: 4, md: 4}}>
                                           <Select label="Base Layout" options={[{label: 'Boxed (Elevated)', value: 'boxed'}, {label: 'Minimal (Clean)', value: 'minimal'}, {label: 'Inline (Row)', value: 'inline'}, {label: 'Premium (Glass)', value: 'premium'}]} value={formState.triggerLayoutStyle} onChange={(v) => setFormState({...formState, triggerLayoutStyle: v})} />
                                        </Grid.Cell>
                                        <Grid.Cell columnSpan={{xs: 6, sm: 4, md: 4}}>
                                           <TextField label="Widget Padding" value={formState.triggerPadding} placeholder="10px 20px" onChange={(v) => setFormState({...formState, triggerPadding: v})} autoComplete="off" />
                                        </Grid.Cell>
                                        <Grid.Cell columnSpan={{xs: 6, sm: 4, md: 4}}>
                                           <TextField label="Corner Radius" value={formState.triggerBorderRadius} placeholder="30px" onChange={(v) => setFormState({...formState, triggerBorderRadius: v})} autoComplete="off" />
                                        </Grid.Cell>
                                     </Grid>
                                     <InlineStack gap="600">
                                        <Checkbox label="Frosted Glass Effect" checked={formState.useGlassmorphism} onChange={(v) => setFormState({...formState, useGlassmorphism: v})} />
                                        <Checkbox label="Pulse Animation" checked={formState.usePulse} onChange={(v) => setFormState({...formState, usePulse: v})} />
                                        <Checkbox label="Transparent BG" checked={formState.triggerTransparent} onChange={(v) => setFormState({...formState, triggerTransparent: v})} />
                                     </InlineStack>
                                  </BlockStack>
                               </Card>
                            </Layout.Section>
                         </Layout>

                         <Divider />

                         <Layout>
                            <Layout.Section variant="oneThird">
                               <Box paddingBlockEnd="400">
                                  <Text variant="headingMd" as="h2">Branding & Colors</Text>
                                  <Text tone="subdued" as="p">Match the widget to your store color palette.</Text>
                               </Box>
                            </Layout.Section>
                            <Layout.Section>
                               <Card padding="400">
                                  <BlockStack gap="400">
                                     <Grid>
                                        <Grid.Cell columnSpan={{xs: 6, sm: 4, md: 4}}>
                                            <ColorField label="Background Color" value={formState.triggerBackgroundColor} disabled={formState.triggerTransparent} onChange={(v) => setFormState({...formState, triggerBackgroundColor: v})} />
                                        </Grid.Cell>
                                        <Grid.Cell columnSpan={{xs: 6, sm: 4, md: 4}}>
                                            <ColorField label="Text Color" value={formState.triggerTextColor} onChange={(v) => setFormState({...formState, triggerTextColor: v})} />
                                        </Grid.Cell>
                                        <Grid.Cell columnSpan={{xs: 6, sm: 4, md: 4}}>
                                            <ColorField label="Icon Tint" value={formState.triggerIconColor} onChange={(v) => setFormState({...formState, triggerIconColor: v})} />
                                        </Grid.Cell>
                                     </Grid>
                                     <Grid>
                                        <Grid.Cell columnSpan={{xs: 6, sm: 4, md: 4}}><TextField label="Font Size" value={formState.triggerFontSize} onChange={(v) => setFormState({...formState, triggerFontSize: v})} autoComplete="off" /></Grid.Cell>
                                        <Grid.Cell columnSpan={{xs: 6, sm: 4, md: 4}}><TextField label="Icon Size" value={formState.triggerIconSize} onChange={(v) => setFormState({...formState, triggerIconSize: v})} autoComplete="off" /></Grid.Cell>
                                        <Grid.Cell columnSpan={{xs: 6, sm: 4, md: 4}}><Select label="Weight" options={[{label: 'Regular', value: '400'}, {label: 'Medium', value: '500'}, {label: 'Bold', value: '700'}]} value={formState.triggerFontWeight} onChange={(v) => setFormState({...formState, triggerFontWeight: v})} /></Grid.Cell>
                                     </Grid>
                                  </BlockStack>
                               </Card>
                            </Layout.Section>
                         </Layout>
                      </BlockStack>
                   )}

                   {selectedTab === 2 && (
                      <BlockStack gap="600">
                         <Layout>
                            <Layout.Section variant="oneThird">
                               <Box paddingBlockEnd="400">
                                  <Text variant="headingMd" as="h2">Theme Integration</Text>
                                  <Text tone="subdued" as="p">Specify exactly where the widget should live in your theme.</Text>
                               </Box>
                            </Layout.Section>
                            <Layout.Section>
                               <Card padding="400">
                                  <BlockStack gap="400">
                                      <TextField label="Header/Target Selector" value={formState.injectionSelector} placeholder=".header__icons" onChange={(v) => setFormState({...formState, injectionSelector: v})} helpText="E.g. .header__icons, .footer__content, or #custom-pincode-holder" autoComplete="off" />
                                      <Select label="Floating Position" options={[{label: 'Bottom Right', value: 'bottom-right'}, {label: 'Bottom Left', value: 'bottom-left'}, {label: 'Top Right', value: 'top-right'}, {label: 'Top Left', value: 'top-left'}]} value={formState.position} onChange={(v) => setFormState({...formState, position: v})} />
                                      <Divider />
                                      <Text variant="headingSm" as="h3">Visibility & Behavior</Text>
                                      <BlockStack gap="200">
                                         <Checkbox label="Show floating locator on all pages" checked={formState.showFloatingButton} onChange={(checked) => setFormState({...formState, showFloatingButton: checked})} />
                                         <Checkbox label="Show popup on every page visit (if no location)" checked={formState.showOnAnyPage} onChange={(checked) => setFormState({...formState, showOnAnyPage: checked})} helpText="If disabled, the popup only appears automatically on the homepage." />
                                         <Checkbox label="Lock background scroll when popup is open" checked={formState.disableScroll} onChange={(checked) => setFormState({...formState, disableScroll: checked})} />
                                      </BlockStack>
                                   </BlockStack>
                               </Card>
                            </Layout.Section>
                         </Layout>
                      </BlockStack>
                   )}

                   {selectedTab === 3 && (
                      <BlockStack gap="600">
                         <Layout>
                            <Layout.Section variant="oneThird">
                                <Box paddingBlockEnd="400">
                                   <Text variant="headingMd" as="h2">AI Optimization</Text>
                                   <Text tone="subdued" as="p">Use AI to generate high-conversion regional copy based on your storefront context.</Text>
                                </Box>
                             </Layout.Section>
                             <Layout.Section>
                                <Card padding="400">
                                   <BlockStack gap="400">
                                      <Button 
                                        icon={MagicIcon} 
                                        variant="primary" 
                                        onClick={() => {
                                            fetcher.submit({ 
                                                intent: "generate-ai-content", 
                                                prompt: `Generate 3 variations of a short, high-conversion heading for a regional pricing pincode modal. The store is likely a retail store. The current heading is "${formState.title}". Provide ONLY the best variation as a plain string.` 
                                            }, { method: "POST" });
                                        }}
                                        loading={fetcher.state === 'submitting' && fetcher.formData?.get('intent') === 'generate-ai-content'}
                                      >
                                        Optimize Heading & Description
                                      </Button>
                                      {fetcher.data && (fetcher.data as any).aiCopy && (
                                          <Banner tone="success" title="AI Suggestion Ready">
                                              <BlockStack gap="200">
                                                <Text as="p">{(fetcher.data as any).aiCopy}</Text>
                                                <Button size="slim" onClick={() => {
                                                    setFormState({
                                                        ...formState,
                                                        title: (fetcher.data as any).aiCopy.split('\n')[0].replace('Heading: ', '').trim(),
                                                        description: (fetcher.data as any).aiCopy.includes('\n') ? (fetcher.data as any).aiCopy.split('\n')[1].replace('Description: ', '').trim() : formState.description
                                                    });
                                                }}>Apply Suggestion</Button>
                                              </BlockStack>
                                          </Banner>
                                      )}
                                      {fetcher.data && (fetcher.data as any).error && (
                                          <Banner tone="critical" title="AI Error">
                                              <p>{(fetcher.data as any).error}</p>
                                          </Banner>
                                      )}
                                   </BlockStack>
                                </Card>
                             </Layout.Section>
                          </Layout>
                       </BlockStack>
                    )}
                </Box>
                </Tabs>
             </Card>
          </BlockStack>
          <Box paddingBlockStart="500">
             <Banner tone="info">
                <p>Changes saved here are instantly applied to your storefront. Clear your browser cache if you don't see updates immediately.</p>
             </Banner>
          </Box>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
             <Banner icon={MagicIcon} tone="success">
                <Text variant="bodySm" fontWeight="bold" as="p">AI Tip: Localized Trust</Text>
                <Text variant="bodyXs" as="p">Using specific location prefixes like "Delivering to:" increases checkout trust by up to 15% in regional markets.</Text>
             </Banner>
             
             <Card padding="500">
                <BlockStack gap="600">
                  <InlineStack gap="200" blockAlign="center">
                     <Icon source={ViewIcon} tone="base" />
                     <Text variant="headingMd" as="h2">Fidelity Preview</Text>
                  </InlineStack>

                  <BlockStack gap="400">
                      <Text variant="bodySm" tone="subdued" fontWeight="bold" as="p">Storefront Context (Pincode Locator)</Text>
                      {/* Immersive Storefront Mock */}
                      <div style={{ 
                          padding: '60px 20px', 
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundImage: 'linear-gradient(rgba(255,255,255,0.8), rgba(255,255,255,0.8)), url("https://cdn.shopify.com/s/files/1/0262/4071/2726/files/lifestyle-1.jpg?v=1602112345")', 
                          border: '1px solid #dfe3e8', 
                          borderRadius: '12px', 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center', 
                          position: 'relative', 
                          overflow: 'hidden',
                          minHeight: '180px'
                      }}>
                          <div style={{ position: 'absolute', top: '0', left: '0', right: '0', height: '40px', background: 'white', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', padding: '0 15px', gap: '10px' }}>
                             <div style={{ width: '40px', height: '8px', background: '#ddd', borderRadius: '4px' }}></div>
                             <div style={{ flex: 1 }}></div>
                             <div style={{ width: '20px', height: '8px', background: '#ddd', borderRadius: '4px' }}></div>
                             <div style={{ width: '20px', height: '8px', background: '#ddd', borderRadius: '4px' }}></div>
                          </div>
                          
                          <div style={{ 
                              padding: formState.triggerPadding, 
                              borderRadius: formState.triggerBorderRadius, 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '12px',
                              backgroundColor: formState.triggerTransparent ? 'transparent' : formState.triggerBackgroundColor, 
                              color: formState.triggerTextColor, 
                              fontSize: formState.triggerFontSize,
                              fontWeight: formState.triggerFontWeight,
                              border: `${formState.triggerBorderWidth} solid ${formState.triggerBorderColor}`,
                              boxShadow: (formState.triggerLayoutStyle === 'boxed' || formState.triggerLayoutStyle === 'premium') ? '0 10px 25px rgba(0,0,0,0.12)' : 'none',
                              backdropFilter: formState.useGlassmorphism ? 'blur(10px) saturate(180%)' : 'none',
                              WebkitBackdropFilter: formState.useGlassmorphism ? 'blur(10px) saturate(180%)' : 'none',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              zIndex: 2
                          }}>
                             {formState.showLocationIcon && <StorefrontIcon color={formState.triggerIconColor} size={formState.triggerIconSize} />}
                             
                             {formState.showCurrentPincode ? (
                                <div style={{ display: 'flex', flexDirection: formState.triggerLayoutStyle === 'inline' ? 'row' : 'column', alignItems: 'flex-start', gap: formState.triggerLayoutStyle === 'inline' ? '6px' : '0', lineHeight: '1.2' }}>
                                   <span style={{ fontSize: '9px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{formState.pincodePrefixText}</span>
                                   <strong style={{ fontSize: formState.triggerFontSize }}>110001</strong>
                                </div>
                             ) : (
                                <span style={{ fontSize: formState.triggerFontSize }}>{formState.floatingButtonText}</span>
                             )}
                          </div>
                      </div>
                      <Text variant="bodyXs" tone="subdued" as="p">Widget appears in specified theme selectors or as a floating locator.</Text>
                  </BlockStack>

                  <Divider />

                  <BlockStack gap="300">
                     <Text variant="bodySm" tone="subdued" fontWeight="bold" as="p">Active Modal Experience</Text>
                      <div style={{ 
                          padding: '40px 20px', 
                          background: `linear-gradient(${formState.overlayColor}, ${formState.overlayColor}), url("https://cdn.shopify.com/s/files/1/0262/4071/2726/files/lifestyle-1.jpg?v=1602112345")`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backdropFilter: `blur(${formState.overlayBlur})`,
                          WebkitBackdropFilter: `blur(${formState.overlayBlur})`,
                          borderRadius: '12px', 
                          display: 'flex', 
                          justifyContent: 'center' 
                      }}>
                        <div style={{ width: '100%', maxWidth: '280px', borderRadius: '16px', border: `1px solid #dfe3e8`, backgroundColor: formState.backgroundColor, color: formState.textColor, boxShadow: '0 20px 50px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                            {formState.headerImage && (
                                <div style={{ width: '100%', height: '80px', overflow: 'hidden' }}>
                                    <img src={formState.headerImage} alt="Header" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            )}
                            <Box padding="400">
                                <BlockStack gap="300">
                                   <Text variant="headingSm" as="h3" tone="inherit">{formState.title}</Text>
                                   <Text variant="bodySm" tone="inherit" as="p">{formState.description}</Text>
                                   <div style={{ marginTop: '8px', padding: '10px', borderRadius: '8px', textAlign: 'center', backgroundColor: formState.primaryColor, color: '#ffffff', cursor: 'pointer' }}>
                                      <Text variant="bodyMd" fontWeight="bold" as="span">{formState.confirmButtonText}</Text>
                                   </div>
                                </BlockStack>
                            </Box>
                        </div>
                     </div>
                  </BlockStack>

                  <Divider />
                  
                  <BlockStack gap="200">
                     <InlineStack gap="100" blockAlign="center">
                        <Icon source={MagicIcon} tone="success" />
                        <Text variant="bodySm" fontWeight="bold" as="span">Live Stylesheet Active</Text>
                     </InlineStack>
                     <Text variant="bodyXs" tone="subdued" as="p">Your preferences generate a dynamic CSS payload injected into the theme.</Text>
                  </BlockStack>
                </BlockStack>
             </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
