import { decrypt } from "./encryption.server";
import prisma from "../db.server";

export async function getLLMClient(shop: string) {
  const config = await (prisma as any).lLMConfig.findUnique({ where: { shop } });
  if (!config || !config.apiKeyEncrypted || !config.encryptionIV) {
    throw new Error("AI not configured. Please add your API key in settings.");
  }

  const apiKey = decrypt(config.apiKeyEncrypted, config.encryptionIV);
  return { provider: config.provider, apiKey };
}

export async function generateCopy(shop: string, prompt: string) {
  const { provider, apiKey } = await getLLMClient(shop);

  if (provider === "openai") {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });
    const data = await response.json();
    return data.choices[0].message.content;
  }
  
  // Add other providers (Anthropic, Google) similarly
  throw new Error(`Provider ${provider} not yet fully implemented in this demo.`);
}
