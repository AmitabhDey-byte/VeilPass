import { generateStructured } from "@/lib/ai/gemini";
import { clampScore, redactSecrets, sanitizeStringList } from "@/lib/ai/privacy";
import type { AiEnvelope, DisclosurePlan } from "@/lib/ai/types";

const DISCLOSURE_SCHEMA = {
  type: "OBJECT" as const,
  properties: {
    decision: { type: "STRING" as const, enum: ["recommended", "review", "avoid"] },
    score: { type: "NUMBER" as const },
    headline: { type: "STRING" as const },
    explanation: { type: "STRING" as const },
    disclose: { type: "ARRAY" as const, items: { type: "STRING" as const } },
    keepPrivate: { type: "ARRAY" as const, items: { type: "STRING" as const } },
    warnings: { type: "ARRAY" as const, items: { type: "STRING" as const } },
  },
  required: ["decision", "score", "headline", "explanation", "disclose", "keepPrivate", "warnings"],
};

function localPlan(requirements: string[], credentialLabels: string[]): DisclosurePlan {
  const risky = requirements.filter((item) => /name|email|address|birth|identity|document|passport/i.test(item));
  const score = Math.max(36, 94 - risky.length * 24 - Math.max(0, requirements.length - 3) * 5);
  return {
    decision: risky.length ? "review" : credentialLabels.length ? "recommended" : "avoid",
    score,
    headline: risky.length ? "Replace identity fields with derived claims" : "A minimal proof path is available",
    explanation: credentialLabels.length
      ? "The request can be satisfied by proving eligibility while keeping the source credential and wallet identity private."
      : "No compatible credential label is available in the local vault, so a proof should not start yet.",
    disclose: ["Proof validity", "Policy commitment", "One-time nullifier"],
    keepPrivate: ["Wallet identity", "Credential issuer", "Credential contents", ...risky.map((item) => `Raw value for: ${item}`)],
    warnings: credentialLabels.length ? risky.map((item) => `Minimize the requirement “${item}” before proving.`) : ["Add a compatible private witness before requesting access."],
  };
}

function normalize(candidate: Partial<DisclosurePlan>, fallback: DisclosurePlan): DisclosurePlan {
  const decisions: DisclosurePlan["decision"][] = ["recommended", "review", "avoid"];
  return {
    decision: decisions.includes(candidate.decision as DisclosurePlan["decision"]) ? candidate.decision as DisclosurePlan["decision"] : fallback.decision,
    score: clampScore(candidate.score, fallback.score),
    headline: redactSecrets(candidate.headline || fallback.headline).slice(0, 120),
    explanation: redactSecrets(candidate.explanation || fallback.explanation).slice(0, 360),
    disclose: sanitizeStringList(candidate.disclose).length ? sanitizeStringList(candidate.disclose) : fallback.disclose,
    keepPrivate: sanitizeStringList(candidate.keepPrivate).length ? sanitizeStringList(candidate.keepPrivate) : fallback.keepPrivate,
    warnings: sanitizeStringList(candidate.warnings).length ? sanitizeStringList(candidate.warnings) : fallback.warnings,
  };
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => ({})) as { passName?: string; requirements?: unknown; credentialLabels?: unknown };
  const passName = redactSecrets(body.passName || "Selected access pass").slice(0, 100);
  const requirements = sanitizeStringList(body.requirements, 10);
  const credentialLabels = sanitizeStringList(body.credentialLabels, 10);
  if (!requirements.length) return Response.json({ error: "At least one proof requirement is needed." }, { status: 400 });

  const fallback = localPlan(requirements, credentialLabels);
  const generated = await generateStructured<Partial<DisclosurePlan>>({
    system: "You are a zero-knowledge disclosure optimizer. Find the smallest safe set of public claims. Credential labels are metadata only; never ask for credential contents, identity, secrets, or witnesses. Penalize correlation and over-disclosure.",
    prompt: JSON.stringify({ passName, requirements, availableCredentialLabels: credentialLabels }),
    schema: DISCLOSURE_SCHEMA,
    temperature: 0.1,
  });
  const response: AiEnvelope<DisclosurePlan> = {
    data: normalize(generated || {}, fallback),
    mode: generated ? "gemini" : "local",
    generatedAt: new Date().toISOString(),
  };
  return Response.json(response);
}
