import OpenAI from "openai";
import { analyzeMigrationPrompt, dictionaryPrompt, DICTIONARY_SYSTEM_PROMPT, SYSTEM_PROMPT } from "./prompts";

export interface MigrationAnalysis {
  summary: string;
  tables: string[];
  risk: "safe" | "warning" | "danger";
  riskReason: string;
  operations: string[];
}

export interface ColumnDescription {
  name: string;
  description: string;
}

export interface TableDescription {
  name: string;
  description: string;
  columns: ColumnDescription[];
}

export interface DictionaryResult {
  tables: TableDescription[];
}

interface ProviderConfig {
  baseURL: string;
  model: string;
}

const PROVIDERS: Record<string, ProviderConfig> = {
  deepseek: {
    baseURL: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
  },
  openai: {
    baseURL: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
};

/** Auto-detect provider from API key prefix, defaults to deepseek */
function detectProvider(apiKey: string): ProviderConfig {
  if (apiKey.startsWith("sk-ant-")) {
    // Anthropic key — currently unsupported via OpenAI SDK
    // This would need the Anthropic SDK; for now, error with guidance
    throw new Error(
      "Anthropic API key detected. Schemalog currently uses OpenAI-compatible APIs.\n" +
      "Set SCHEMALOG_PROVIDER=anthropic and install @anthropic-ai/sdk for Claude support."
    );
  }
  if (apiKey.startsWith("sk-") && !apiKey.startsWith("sk-ant-")) {
    // Generic OpenAI-format key — could be DeepSeek, OpenAI, or compatible
    const envProvider = process.env.SCHEMALOG_PROVIDER || "deepseek";
    const config = PROVIDERS[envProvider];
    if (!config) {
      throw new Error(
        `Unknown provider "${envProvider}". Supported: ${Object.keys(PROVIDERS).join(", ")}.\n` +
        `Set SCHEMALOG_PROVIDER env var, or use the "provider" field in .schemalog.json.`
      );
    }
    return config;
  }
  // Unknown key format — default to DeepSeek
  return PROVIDERS.deepseek;
}

/**
 * Analyze a single migration SQL using AI.
 * Supports DeepSeek, OpenAI, and any OpenAI-compatible API.
 */
export async function analyzeMigration(
  sql: string,
  description: string,
  apiKey: string,
  providerOverride?: string
): Promise<MigrationAnalysis> {
  const provider = providerOverride
    ? PROVIDERS[providerOverride] || detectProvider(apiKey)
    : detectProvider(apiKey);

  if (!provider) {
    throw new Error("Could not determine AI provider. Set SCHEMALOG_PROVIDER env var.");
  }

  const client = new OpenAI({
    apiKey,
    baseURL: provider.baseURL,
  });

  const response = await client.chat.completions.create({
    model: provider.model,
    max_tokens: 800,
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: analyzeMigrationPrompt(sql, description) },
    ],
    response_format: { type: "json_object" },
  });

  const text = response.choices[0]?.message?.content || "";
  const json = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  try {
    return JSON.parse(json) as MigrationAnalysis;
  } catch {
    throw new Error(`Failed to parse AI response as JSON:\n${text}`);
  }
}

/**
 * Generate a data dictionary from table definitions using AI.
 * Takes parsed table SQL, returns human-readable table and column descriptions.
 */
export async function generateDictionary(
  tablesJson: string,
  apiKey: string,
  providerOverride?: string
): Promise<DictionaryResult> {
  const provider = providerOverride
    ? PROVIDERS[providerOverride] || detectProvider(apiKey)
    : detectProvider(apiKey);

  if (!provider) {
    throw new Error("Could not determine AI provider.");
  }

  const client = new OpenAI({
    apiKey,
    baseURL: provider.baseURL,
  });

  const response = await client.chat.completions.create({
    model: provider.model,
    max_tokens: 4096,
    temperature: 0,
    messages: [
      { role: "system", content: DICTIONARY_SYSTEM_PROMPT },
      { role: "user", content: dictionaryPrompt(tablesJson) },
    ],
    response_format: { type: "json_object" },
  });

  const text = response.choices[0]?.message?.content || "";
  const json = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  try {
    return JSON.parse(json) as DictionaryResult;
  } catch {
    throw new Error(`Failed to parse dictionary AI response:\n${text.slice(0, 500)}`);
  }
}
