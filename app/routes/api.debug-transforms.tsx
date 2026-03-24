import { json } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  const response = await admin.graphql(`
    query {
      cartTransforms(first: 10) {
        nodes {
          id
          functionId
          blockParentUpdateOperations
        }
      }
    }
  `);
  
  const data = await response.json();
  return json(data);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const functionId = formData.get("functionId") as string;

  if (!functionId) {
    return json({ error: "Missing functionId" }, { status: 400 });
  }

  const response = await admin.graphql(`
    mutation cartTransformCreate($functionId: String!) {
      cartTransformCreate(functionId: $functionId) {
        cartTransform {
          id
          functionId
        }
        userErrors {
          field
          message
        }
      }
    }
  `, { variables: { functionId } });

  const data = await response.json();
  return json(data);
};
