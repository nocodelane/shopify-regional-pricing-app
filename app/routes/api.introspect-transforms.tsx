import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  const response = await admin.graphql(`
    query IntrospectMutations {
      __type(name: "Mutation") {
        fields {
          name
          args {
            name
            type {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
        }
      }
    }
  `);
  
  const data = await response.json();
  const mutations = data.data.__type.fields.filter((f: { name: string }) => f.name.toLowerCase().includes("carttransform"));
  
  return json({ mutations, raw: data });
};
