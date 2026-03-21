import { useState, useCallback } from "react";
import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher, useNavigation, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  InlineStack,
  Badge,
  Divider,
  EmptyState,
  Icon,
  Modal,
  TextField,
  ResourceList,
  ResourceItem,
  Avatar,
  SkeletonPage,
  DropZone,
  Banner,
} from "@shopify/polaris";
import {
  EditIcon,
  ImportIcon,
  ExportIcon,
  PlusIcon,
} from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const regions = await prisma.region.findMany({ 
    where: { shop }, 
    include: {
      _count: {
        select: {
          pincodes: true,
          pincodeRanges: true,
          pricingRules: true,
          productRules: true,
          collectionRules: true,
        }
      }
    }
  });
  
  const [pincodes, pincodeRanges] = await Promise.all([
    prisma.pincode.findMany({ where: { shop }, include: { region: true } }),
    prisma.pincodeRange.findMany({ where: { shop }, include: { region: true } })
  ]);
  
  return json({ regions, pincodes, pincodeRanges });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "save_pincodes") {
    const regionId = formData.get("regionId") as string;
    const input = formData.get("pincodes") as string;
    const items = input.split(",").map(c => c.trim()).filter(c => c);
    
    const individualCodes: string[] = [];
    const ranges: { start: number, end: number }[] = [];
    
    items.forEach(item => {
      if (item.includes("-")) {
        const [startStr, endStr] = item.split("-").map(s => s.trim());
        const start = parseInt(startStr);
        const end = parseInt(endStr);
        if (!isNaN(start) && !isNaN(end)) {
          ranges.push({ start, end });
        }
      } else {
        individualCodes.push(item);
      }
    });

    await prisma.$transaction([
      prisma.pincode.deleteMany({ where: { regionId, shop } }),
      prisma.pincodeRange.deleteMany({ where: { regionId, shop } }),
      prisma.pincode.createMany({ 
        data: individualCodes.map(code => ({ shop, regionId, pincode: code }))
      }),
      prisma.pincodeRange.createMany({
        data: ranges.map(r => ({ shop, regionId, start: r.start, end: r.end }))
      })
    ]);
    return json({ success: true });
  }

  if (intent === "bulk_import") {
    const csvData = formData.get("csvData") as string;
    if (!csvData) return json({ error: "No data provided" }, { status: 400 });

    const rows = csvData.split("\n").map(r => r.split(",").map(c => c.trim()));
    const individualRecords: any[] = [];
    const rangeRecords: any[] = [];
    
    const allRegions = await prisma.region.findMany({ where: { shop } });
    const regionMap: Record<string, string> = {};
    allRegions.forEach(r => regionMap[r.name.toLowerCase()] = r.id);

    rows.forEach(([regionName, pincodeRaw]) => {
      if (!regionName || !pincodeRaw) return;
      const rid = regionMap[regionName.toLowerCase()];
      if (!rid) return;

      if (pincodeRaw.includes("-")) {
        const [startStr, endStr] = pincodeRaw.split("-").map(s => s.trim());
        const start = parseInt(startStr);
        const end = parseInt(endStr);
        if (!isNaN(start) && !isNaN(end)) {
          rangeRecords.push({ shop, regionId: rid, start, end });
        }
      } else {
        individualRecords.push({ shop, regionId: rid, pincode: pincodeRaw });
      }
    });

    if (individualRecords.length > 0 || rangeRecords.length > 0) {
      await prisma.$transaction([
        prisma.pincode.createMany({ data: individualRecords }),
        prisma.pincodeRange.createMany({ data: rangeRecords })
      ]);
    }
    return json({ success: true, count: individualRecords.length + rangeRecords.length });
  }

  return json({ success: true });
};

export default function Pincodes() {
  const { regions, pincodes, pincodeRanges } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const navigation = useNavigation();

  const [activeRegion, setActiveRegion] = useState<any>(null);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingPincodes, setEditingPincodes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleExport = () => {
    let csvContent = "data:text/csv;charset=utf-8,Region Name,Pincode/Range\n";
    pincodes.forEach((p: any) => { csvContent += `${p.region.name},${p.pincode}\n`; });
    pincodeRanges.forEach((r: any) => { csvContent += `${r.region.name},${r.start}-${r.end}\n`; });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "region_coverage.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleManage = (region: any) => {
    setActiveRegion(region);
    const individual = pincodes.filter(p => p.regionId === region.id).map(p => p.pincode);
    const ranges = pincodeRanges.filter(r => r.regionId === region.id).map(r => `${r.start}-${r.end}`);
    setEditingPincodes([...individual, ...ranges].join(", "));
    setManageModalOpen(true);
  };

  const handleDropZoneDrop = useCallback(
    (_dropFiles: File[], acceptedFiles: File[], _rejectedFiles: File[]) =>
      setFile(acceptedFiles[0]),
    [],
  );

  const handleBulkImport = () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      fetcher.submit({ intent: "bulk_import", csvData: text }, { method: "POST" });
    };
    reader.readAsText(file);
  };

  if (navigation.state === "loading" && !fetcher.state) {
    return <SkeletonPage title="Pincode Management" backAction />;
  }

  return (
    <Page 
      backAction={{ content: 'Dashboard', url: '/app' }} 
      title="Pincode-Based Dynamic Pricing - Coverage Hub"
      primaryAction={{ content: 'Bulk Import', icon: ImportIcon, onAction: () => setImportModalOpen(true) }}
      secondaryActions={[{ content: 'Export All', icon: ExportIcon, onAction: handleExport }]}
    >
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card padding="0">
              <Box padding="400" borderBlockEndWidth="025" borderColor="border-secondary">
                <Text variant="headingMd" as="h2">Regional Coverage</Text>
              </Box>
              {regions.length === 0 ? (
                <EmptyState heading="No regions found" action={{ content: 'Go Home', url: '/app' }} image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png">
                   <p>Create a region from the dashboard to start mapping pincodes.</p>
                </EmptyState>
              ) : (
                <ResourceList
                  resourceName={{singular: 'region', plural: 'regions'}}
                  items={regions}
                  renderItem={(region: any) => {
                    const ruleCount = region._count.pricingRules + region._count.productRules + region._count.collectionRules;
                    return (
                      <ResourceItem id={region.id} onClick={() => handleManage(region)}>
                        <InlineStack align="space-between" blockAlign="center">
                           <InlineStack gap="300" blockAlign="center">
                              <Avatar customer name={region.name} size="md" />
                              <BlockStack gap="050">
                                 <Text variant="bodyMd" fontWeight="bold" as="h3">{region.name}</Text>
                                 <InlineStack gap="200" blockAlign="center">
                                    <Badge tone="info">{`${region._count.pincodes} Codes`}</Badge>
                                    {region._count.pincodeRanges > 0 && <Badge tone="attention">{`${region._count.pincodeRanges} Ranges`}</Badge>}
                                    {ruleCount > 0 && <Badge tone="success">{`${ruleCount} Rules`}</Badge>}
                                 </InlineStack>
                              </BlockStack>
                           </InlineStack>
                           <Button icon={EditIcon} variant="tertiary" onClick={() => handleManage(region)}>Edit Coverage</Button>
                        </InlineStack>
                      </ResourceItem>
                    );
                  }}
                />
              )}
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>

      {/* Manual Editor Modal */}
      {activeRegion && (
        <Modal
          open={manageModalOpen}
          onClose={() => setManageModalOpen(false)}
          title={`Coverage Editor: ${activeRegion.name}`}
          primaryAction={{
            content: 'Save Changes',
            onAction: () => {
              fetcher.submit({ intent: "save_pincodes", regionId: activeRegion.id, pincodes: editingPincodes }, { method: "POST" });
              setManageModalOpen(false);
              shopify.toast.show("Saved mappings");
            },
            loading: fetcher.state === 'submitting'
          }}
        >
          <Modal.Section>
            <BlockStack gap="400">
               <Banner tone="info">
                  <Text as="p">Separate pincodes with commas. Use a hyphen for ranges (e.g. 110001-110050).</Text>
               </Banner>
              <TextField 
                label="Pincodes & Ranges" 
                value={editingPincodes} 
                onChange={setEditingPincodes} 
                multiline={6} 
                autoComplete="off" 
                placeholder="110001, 110002, 110010-110050" 
              />
              <Divider />
              <InlineStack gap="200" blockAlign="center">
                 <Text variant="bodySm" as="span">Presets:</Text>
                 <Button size="slim" onClick={() => setEditingPincodes((p: string) => (p ? p + ", " : "") + "110000-110099")}>Delhi</Button>
                 <Button size="slim" onClick={() => setEditingPincodes((p: string) => (p ? p + ", " : "") + "400001-400099")}>Mumbai</Button>
                 <Button size="slim" onClick={() => setEditingPincodes((p: string) => (p ? p + ", " : "") + "560001-560099")}>Bangalore</Button>
              </InlineStack>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}

      {/* Bulk Import Modal */}
      <Modal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Quick Bulk Import"
        primaryAction={{
          content: 'Start Import',
          onAction: handleBulkImport,
          loading: fetcher.state === 'submitting',
          disabled: !file
        }}
      >
        <Modal.Section>
           <BlockStack gap="400">
              <Text as="p">Upload a CSV in format: <b>Region Name, Pincode/Range</b></Text>
              <DropZone onDrop={handleDropZoneDrop} allowMultiple={false}>
                {file ? (
                   <div style={{ padding: '20px' }}>
                     <InlineStack align="space-between">
                        <Text variant="bodyMd" as="p">{file.name}</Text>
                        <Button variant="plain" onClick={() => setFile(null)}>Remove</Button>
                     </InlineStack>
                   </div>
                ) : <DropZone.FileUpload />}
              </DropZone>
              {(fetcher.data as any)?.count && (
                <Banner tone="success" title="Import Completed">
                  <p>Successfully added {(fetcher.data as any).count} mapping records.</p>
                </Banner>
              )}
           </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
