import { generateStructured } from "@/lib/ai/gemini";
import { redactSecrets, safeHexRoot, sanitizeStringList } from "@/lib/ai/privacy";
import type { AiEnvelope, PolicyBlueprint, RiskLevel } from "@/lib/ai/types";

const POLICY_SCHEMA = {
  type: "OBJECT" as const,
  properties: {
    name: { type: "STRING" as const },
    summary: { type: "STRING" as const },
    requirements: { type: "ARRAY" as const, items: { type: "STRING" as const } },
    publicSignals: { type: "ARRAY" as const, items: { type: "STRING" as const } },
    privateSignals: { type: "ARRAY" as const, items: { type: "STRING" as const } },
    retention: { type: "STRING" as const },
    riskLevel: { type: "STRING" as const, enum: ["low", "medium", "high"] },
    riskReasons: { type: "ARRAY" as const, items: { type: "STRING" as const } },
  },
  required: ["name", "summary", "requirements", "publicSignals", "privateSignals", "retention", "riskLevel", "riskReasons"],
};

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function localPolicy(goal: string): Omit<PolicyBlueprint, "suggestedRoot"> {
  const lower = goal.toLowerCase();
  const mentionsAge = /age|older|over \d+/.test(lower);
  const mentionsLocation = /country|location|resident|region/.test(lower);
  const mentionsIdentity = /name|email|identity|government|passport/.test(lower);
  const riskLevel: RiskLevel = mentionsIdentity ? "high" : mentionsLocation ? "medium" : "low";
  const requirements = [
    mentionsAge ? "Prove the required age threshold" : "Prove active membership eligibility",
    ...(mentionsLocation ? ["Prove permitted region without disclosing an address"] : []),
  ];

  return {
    name: goal.split(/[.!?]/)[0].trim().slice(0, 54) || "Private access policy",
    summary: "A selective-disclosure policy derived locally from the host's access goal.",
    requirements,
    publicSignals: ["Policy commitment", "Proof validity", "Nullifier to prevent replay"],
    privateSignals: ["Wallet identity", "Source credential", ...(mentionsAge ? ["Exact birth date"] : []), ...(mentionsLocation ? ["Exact address"] : [])],
    retention: "Keep only the public proof result and commitment; discard request metadata after verification.",
    riskLevel,
    riskReasons: mentionsIdentity
      ? ["The request names direct identity data; replace it with a derived eligibility claim."]
      : ["The policy can be expressed as a boolean claim with minimal public output."],
  };
}

function normalizePolicy(candidate: Partial<PolicyBlueprint>, fallback: Omit<PolicyBlueprint, "suggestedRoot">, root: string): PolicyBlueprint {
  const levels: RiskLevel[] = ["low", "medium", "high"];
  return {
    name: redactSecrets(candidate.name || fallback.name).slice(0, 64),
    summary: redactSecrets(candidate.summary || fallback.summary).slice(0, 280),
    requirements: sanitizeStringList(candidate.requirements).length ? sanitizeStringList(candidate.requirements) : fallback.requirements,
    publicSignals: sanitizeStringList(candidate.publicSignals).length ? sanitizeStringList(candidate.publicSignals) : fallback.publicSignals,
    privateSignals: sanitizeStringList(candidate.privateSignals).length ? sanitizeStringList(candidate.privateSignals) : fallback.privateSignals,
    retention: redactSecrets(candidate.retention || fallback.retention).slice(0, 280),
    riskLevel: levels.includes(candidate.riskLevel as RiskLevel) ? candidate.riskLevel as RiskLevel : fallback.riskLevel,
    riskReasons: sanitizeStringList(candidate.riskReasons).length ? sanitizeStringList(candidate.riskReasons) : fallback.riskReasons,
    suggestedRoot: safeHexRoot(candidate.suggestedRoot, root),
  };
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => ({})) as { goal?: string; network?: string };
  const goal = redactSecrets(body.goal?.trim() || "").slice(0, 1_500);
  if (goal.length < 12) return Response.json({ error: "Describe the access policy in at least 12 characters." }, { status: 400 });

  const root = await sha256(`${body.network || "preprod"}:${goal.toLowerCase()}`);
  const fallback = localPolicy(goal);
  const generated = await generateStructured<Partial<PolicyBlueprint>>({
    system: "You are a privacy policy compiler. Convert an access goal into the minimum zero-knowledge claims required. Never request raw identity data. Prefer boolean predicates and classify privacy risk conservatively.",
    prompt: `Network: ${body.network || "preprod"}\nHost goal: ${goal}\nReturn a concise policy blueprint. Do not include a commitment root.`,
    schema: POLICY_SCHEMA,
    temperature: 0.15,
  });
  const data = normalizePolicy(generated || {}, fallback, root);
  const response: AiEnvelope<PolicyBlueprint> = { data, mode: generated ? "gemini" : "local", generatedAt: new Date().toISOString() };
  return Response.json(response);
}
