import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError, useNavigation } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { Frame, Box } from "@shopify/polaris";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import customStyles from "../styles/custom.css?url";

import { authenticate } from "../shopify.server";

export const links = () => [
  { rel: "stylesheet", href: polarisStyles },
  { rel: "stylesheet", href: customStyles },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isLoading = navigation.state !== 'idle';

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link key="dashboard" to="/app" rel="home">Dashboard</Link>
        <Link key="pincodes" to="/app/pincodes">Markets & Coverage</Link>
        <Link key="logic" to="/app/logic">Regional Rules</Link>
        <Link key="visual" to="/app/config">Visual Studio</Link>
        <Link key="intelligence" to="/app/analytics">Intelligence & Growth</Link>
        <Link key="guide" to="/app/guide">Setup Guide</Link>
      </NavMenu>
      <Frame>
        <Box paddingBlockStart="400" paddingBlockEnd="400">
          <Outlet />
        </Box>
      </Frame>
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
