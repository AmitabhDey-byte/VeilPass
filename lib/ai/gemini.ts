import { redactSecrets } from "@/lib/ai/privacy";

type JsonSchema = {
  type: "OBJECT" | "ARRAY" | "STRING" | "NUMBER" | "INTEGER" | "BOOLEAN";
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: string[];
};

type GeminiOptions = {
  system: string;
  prompt: string;
  temperature?: number;
  schema?: JsonSchema;
};

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const REQUEST_TIMEOUT_MS = 12_000;

function apiKey(): string | undefined {
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
}

async function callGemini(options: GeminiOptions): Promise<string | null> {
  const key = apiKey();
  if (!key) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: options.system }] },
        contents: [{ role: "user", parts: [{ text: redactSecrets(options.prompt) }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.2,
          maxOutputTokens: 1_600,
          ...(options.schema ? { responseMimeType: "application/json", responseSchema: options.schema } : {}),
        },
      }),
    });

    if (!response.ok) return null;
    const payload = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateText(options: GeminiOptions): Promise<string | null> {
  return callGemini(options);
}

export async function generateStructured<T>(options: GeminiOptions): Promise<T | null> {
  const text = await callGemini(options);
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function hasGeminiKey(): boolean {
  return Boolean(apiKey());
}
