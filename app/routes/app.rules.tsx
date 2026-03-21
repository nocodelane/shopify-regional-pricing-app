import { useState } from "react";
import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  Text,
  ResourceList,
  ResourceItem,
  Select,
  TextField,
  InlineStack,
  Badge,
  Modal,
  Box,
} from "@shopify/polaris";
import { PlusIcon, DeleteIcon, RefreshIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const regions = await prisma.region.findMany({ where: { shop: session.shop } });
  const tagRules = await (prisma as any).tagRegionRule.findMany({ where: { shop: session.shop }, include: { region: true } });
  return json({ regions, tagRules });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    await (prisma as any).tagRegionRule.create({
      data: {
        shop: session.shop,
        tag: formData.get("tag") as string,
        regionId: formData.get("regionId") as string,
        allowed: formData.get("allowed") === "true",
      }
    });
  } else if (intent === "delete") {
    await (prisma as any).tagRegionRule.delete({ where: { id: formData.get("id") as string } });
  } else if (intent === "sync-products") {
    const { admin } = await authenticate.admin(request);
    let hasNextPage = true;
    let after = null;

    while (hasNextPage) {
      const response: any = await admin.graphql(
        `#graphql
        query getProducts($after: String) {
          products(first: 250, after: $after) {
            pageInfo { hasNextPage endCursor }
            nodes { 
              id 
              tags 
              collections(first: 100) { nodes { id } }
            }
          }
        }`,
        { variables: { after } }
      );
      const data: any = await response.json();
      const products = data.data.products.nodes;

      for (const product of products) {
        const collectionIds = product.collections.nodes.map((c: any) => c.id);
        await (prisma as any).productCache.upsert({
          where: { id: product.id },
          update: { 
            tags: product.tags.join(", "), 
            collections: JSON.stringify(collectionIds),
            shop: session.shop 
          },
          create: { 
            id: product.id, 
            tags: product.tags.join(", "), 
            collections: JSON.stringify(collectionIds),
            shop: session.shop 
          }
        });
      }

      hasNextPage = data.data.products.pageInfo.hasNextPage;
      after = data.data.products.pageInfo.endCursor;
    }
  }

  return json({ success: true });
};

export default function TagRules() {
  const { regions, tagRules } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [modalOpen, setModalOpen] = useState(false);
  const [newRule, setNewRule] = useState({ tag: "", regionId: regions[0]?.id || "", allowed: "false" });

  const regionOptions = regions.map(r => ({ label: r.name, value: r.id }));

  return (
    <Page backAction={{ content: 'Dashboard', url: '/app' }} title="Tag-Based Automation">
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card padding="0">
              <Box padding="400" borderBlockEndWidth="025" borderColor="border-secondary">
                <InlineStack align="space-between">
                  <Text variant="headingMd" as="h2">Tag Rules</Text>
                  <InlineStack gap="200">
                    <Button icon={RefreshIcon} onClick={() => fetcher.submit({ intent: 'sync-products' }, { method: 'POST' })} loading={fetcher.state === 'submitting'}>Sync Product Tags</Button>
                    <Button variant="primary" icon={PlusIcon} onClick={() => setModalOpen(true)}>Add Tag Rule</Button>
                  </InlineStack>
                </InlineStack>
              </Box>
              <ResourceList
                resourceName={{ singular: 'rule', plural: 'rules' }}
                items={tagRules}
                renderItem={(rule: any) => (
                  <ResourceItem id={rule.id} onClick={() => {}}>
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="100">
                        <InlineStack gap="200">
                          <Badge tone="info">{rule.tag}</Badge>
                          <Text variant="bodyMd" as="span">is <b>{rule.allowed ? "Allowed" : "Restricted"}</b> in</Text>
                          <Badge>{rule.region.name}</Badge>
                        </InlineStack>
                      </BlockStack>
                      <Button icon={DeleteIcon} tone="critical" variant="tertiary" onClick={() => fetcher.submit({ id: rule.id, intent: 'delete' }, { method: "POST" })}>Remove</Button>
                    </InlineStack>
                  </ResourceItem>
                )}
              />
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add New Tag Rule"
        primaryAction={{
          content: 'Add Rule',
          onAction: () => { fetcher.submit({ ...newRule, intent: 'create' }, { method: "POST" }); setModalOpen(false); }
        }}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <TextField label="Product Tag" value={newRule.tag} onChange={(v) => setNewRule(prev => ({ ...prev, tag: v }))} autoComplete="off" placeholder="e.g. glass-items, mumbai-exclusive" />
            <Select label="In Region" options={regionOptions} value={newRule.regionId} onChange={(v) => setNewRule(prev => ({ ...prev, regionId: v }))} />
            <Select label="Action" options={[{ label: 'Allow', value: 'true' }, { label: 'Restrict', value: 'false' }]} value={newRule.allowed} onChange={(v) => setNewRule(prev => ({ ...prev, allowed: v }))} />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
