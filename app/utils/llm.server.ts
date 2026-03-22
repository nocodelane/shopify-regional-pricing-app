import { decrypt } from "./encryption.server";
import prisma from "../db.server";

export async function getLLMClient(shop: string) {
  const config = await (prisma as any).lLMConfig.findUnique({ where: { shop } });
  if (!config || !config.apiKeyEncrypted || !config.encryptionIV) {
    throw new Error("AI not configured. Please add your API key in settings.");
  }

  const apiKey = decrypt(config.apiKeyEncrypted, config.encryptionIV);
  return { 
    provider: config.provider, 
    apiKey, 
    modelId: (config as any).modelId || (config.provider === "openai" ? "gpt-4o" : ""),
    baseUrl: (config as any).baseUrl
  };
}

export async function generateCopy(shop: string, prompt: string) {
  const { provider, apiKey, modelId, baseUrl } = await getLLMClient(shop);

  if (provider === "openai") {
    const url = baseUrl || "https://api.openai.com/v1/chat/completions";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId || "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(`OpenAI Error: ${data.error.message}`);
    return data.choices[0].message.content;
  }

  if (provider === "anthropic") {
    const url = baseUrl || "https://api.anthropic.com/v1/messages";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: modelId || "claude-3-5-sonnet-20240620",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(`Anthropic Error: ${data.error.message}`);
    return data.content[0].text;
  }

  if (provider === "google" || provider === "gemini") {
    const model = modelId || "gemini-1.5-flash";
    const url = baseUrl || `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(`Google Error: ${data.error.message}`);
    return data.candidates[0].content.parts[0].text;
  }

  if (provider === "custom") {
    if (!baseUrl) throw new Error("Base URL is required for custom LLM provider.");
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        prompt: prompt,
        messages: [{ role: "user", content: prompt }], // Supporting both prompt/message styles
      }),
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || data.response || JSON.stringify(data);
  }
  
  throw new Error(`Provider ${provider} not supported.`);
}
