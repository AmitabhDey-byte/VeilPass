import { generateStructured } from "@/lib/ai/gemini";
import { redactSecrets, sanitizeStringList } from "@/lib/ai/privacy";
import type { AiEnvelope, LedgerInsight, LedgerReport } from "@/lib/ai/types";

type EventSummary = { type: string; state: string; time: string };

const LEDGER_SCHEMA = {
  type: "OBJECT" as const,
  properties: {
    headline: { type: "STRING" as const },
    narrative: { type: "STRING" as const },
    insights: {
      type: "ARRAY" as const,
      items: {
        type: "OBJECT" as const,
        properties: {
          label: { type: "STRING" as const },
          value: { type: "STRING" as const },
          detail: { type: "STRING" as const },
          tone: { type: "STRING" as const, enum: ["neutral", "positive", "warning"] },
        },
        required: ["label", "value", "detail", "tone"],
      },
    },
    recommendations: { type: "ARRAY" as const, items: { type: "STRING" as const } },
  },
  required: ["headline", "narrative", "insights", "recommendations"],
};

function parseEvents(value: unknown): EventSummary[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).map((item) => {
    const event = item && typeof item === "object" ? item as Partial<EventSummary> : {};
    return {
      type: redactSecrets(String(event.type || "Unknown")).slice(0, 60),
      state: redactSecrets(String(event.state || "Unknown")).slice(0, 40),
      time: redactSecrets(String(event.time || "Unknown")).slice(0, 40),
    };
  });
}

function localReport(events: EventSummary[]): LedgerReport {
  const proofs = events.filter((event) => event.type === "Eligibility proof").length;
  const passes = events.filter((event) => event.type === "Access pass").length;
  const roots = events.filter((event) => event.type === "Allowlist registration").length;
  const pending = events.filter((event) => event.state === "Pending").length;
  const proofToPass = proofs ? Math.round((passes / proofs) * 100) : 0;
  return {
    headline: pending ? "A small queue needs attention" : "Proof activity is flowing normally",
    narrative: `${events.length} public events were summarized without wallet addresses or private witnesses. ${proofs} proof checks produced ${passes} access-pass events.`,
    insights: [
      { label: "Proof → pass", value: `${proofToPass}%`, detail: "Ratio of access passes to proof checks in this local window.", tone: proofToPass >= 70 ? "positive" : "neutral" },
      { label: "Pending", value: String(pending), detail: "Events that may need a retry or operator review.", tone: pending ? "warning" : "positive" },
      { label: "Root changes", value: String(roots), detail: "Public allowlist commitment updates in this window.", tone: "neutral" },
    ],
    recommendations: pending ? ["Review pending events before starting another proof."] : ["No urgent ledger action is required.", "Continue monitoring root changes for unexpected churn."],
  };
}

function normalizeInsights(value: unknown, fallback: LedgerInsight[]): LedgerInsight[] {
  if (!Array.isArray(value)) return fallback;
  const tones: LedgerInsight["tone"][] = ["neutral", "positive", "warning"];
  const insights = value.slice(0, 5).map((item) => {
    const insight = item && typeof item === "object" ? item as Partial<LedgerInsight> : {};
    return {
      label: redactSecrets(insight.label || "Signal").slice(0, 60),
      value: redactSecrets(insight.value || "—").slice(0, 40),
      detail: redactSecrets(insight.detail || "No detail available.").slice(0, 200),
      tone: tones.includes(insight.tone as LedgerInsight["tone"]) ? insight.tone as LedgerInsight["tone"] : "neutral",
    };
  });
  return insights.length ? insights : fallback;
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => ({})) as { events?: unknown; network?: string };
  const events = parseEvents(body.events);
  const fallback = localReport(events);
  const generated = await generateStructured<Partial<LedgerReport>>({
    system: "You are a privacy-preserving ledger analyst. Explain aggregate patterns only. Never infer people, identities, wallets, intent, or credential contents from commitments. Clearly label observations as trends, not facts about users.",
    prompt: JSON.stringify({ network: body.network === "preview" ? "preview" : "preprod", anonymizedEvents: events }),
    schema: LEDGER_SCHEMA,
    temperature: 0.2,
  });
  const data: LedgerReport = {
    headline: redactSecrets(generated?.headline || fallback.headline).slice(0, 140),
    narrative: redactSecrets(generated?.narrative || fallback.narrative).slice(0, 420),
    insights: normalizeInsights(generated?.insights, fallback.insights),
    recommendations: sanitizeStringList(generated?.recommendations).length ? sanitizeStringList(generated?.recommendations) : fallback.recommendations,
  };
  const response: AiEnvelope<LedgerReport> = { data, mode: generated ? "gemini" : "local", generatedAt: new Date().toISOString() };
  return Response.json(response);
}
