import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

export type ProviderKind = "gateway" | "openrouter";

export const detectProvider = (apiKey: string): ProviderKind =>
  apiKey.startsWith("sk-or-") ? "openrouter" : "gateway";

export const resolveModel = (
  kind: ProviderKind,
  modelId: string,
  apiKey: string,
): LanguageModel => {
  if (kind === "openrouter") {
    const openrouter = createOpenAICompatible({
      name: "openrouter",
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
      headers: {
        "HTTP-Referer": "https://www.npmjs.com/package/claude-roast",
        "X-Title": "claude-roast",
      },
    });
    return openrouter(modelId);
  }
  process.env.AI_GATEWAY_API_KEY = apiKey;
  return modelId;
};

export const providerLabel = (kind: ProviderKind) =>
  kind === "openrouter" ? "OpenRouter" : "Vercel AI Gateway";
