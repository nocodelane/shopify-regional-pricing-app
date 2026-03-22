import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Text,
  Badge,
  ProgressBar,
  Icon,
  Button,
  BlockStack,
  InlineStack,
  Box,
  EmptyState,
} from "@shopify/polaris";
import {
  DeleteIcon,
  ExportIcon,
  PersonIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const waitlist = await prisma.waitlistEntry.findMany({
    where: { shop },
    orderBy: { createdAt: 'desc' },
  });

  return json({ waitlist });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete-lead") {
    await prisma.waitlistEntry.delete({ where: { id: formData.get("id") as string } });
    return json({ success: true });
  }

  return json({ success: true });
};

export default function WaitlistHub() {
  const { waitlist } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const handleExport = () => {
    const csvRows = [
      ["Email", "Pincode", "Date"],
      ...waitlist.map((item: any) => [item.email, item.pincode, new Date(item.createdAt).toLocaleDateString()])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "waitlist_leads.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <Page 
      title="Waitlist Hub" 
      subtitle="Manage leads from customers in unserved areas."
      backAction={{ content: 'Dashboard', url: '/app' }}
      primaryAction={{ content: 'Export to CSV', icon: ExportIcon, onAction: handleExport }}
    >
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card padding="0">
              {waitlist.length === 0 ? (
                <EmptyState 
                  heading="Your waitlist is empty" 
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>When customers enter a pincode you don't serve, they can join the waitlist. Their interest will appear here.</p>
                </EmptyState>
              ) : (
                <IndexTable
                  resourceName={{ singular: 'lead', plural: 'leads' }}
                  itemCount={waitlist.length}
                  headings={[
                    { title: 'Email' },
                    { title: 'Pincode' },
                    { title: 'Date' },
                    { title: 'Actions' },
                  ]}
                  selectable={false}
                >
                  {waitlist.map((lead: any, index: number) => (
                    <IndexTable.Row id={lead.id} key={lead.id} position={index}>
                      <IndexTable.Cell><Text variant="bodyMd" fontWeight="bold" as="span">{lead.email}</Text></IndexTable.Cell>
                      <IndexTable.Cell><Badge tone="info">{lead.pincode}</Badge></IndexTable.Cell>
                      <IndexTable.Cell>{new Date(lead.createdAt).toLocaleDateString()}</IndexTable.Cell>
                      <IndexTable.Cell>
                        <Button 
                          icon={DeleteIcon} 
                          tone="critical" 
                          variant="tertiary" 
                          onClick={() => {
                            if (confirm("Delete this lead?")) {
                                fetcher.submit({ id: lead.id, intent: 'delete-lead' }, { method: 'POST' });
                            }
                          }} 
                        />
                      </IndexTable.Cell>
                    </IndexTable.Row>
                  ))}
                </IndexTable>
              )}
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
                <Card>
                    <BlockStack gap="200">
                        <InlineStack gap="200" blockAlign="center">
                            <Icon source={PersonIcon} tone="info" />
                            <Text variant="headingMd" as="h2">Market Validation</Text>
                        </InlineStack>
                        <Text as="p" variant="bodySm">These leads represent validated demand for your products in new territories.</Text>
                        <Text as="p" variant="bodySm"><strong>Tip:</strong> Filter by pincode in Excel to identify which city to expand into next.</Text>
                    </BlockStack>
                </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
