import { generateStructured } from "@/lib/ai/gemini";
import { clampScore, redactSecrets } from "@/lib/ai/privacy";
import type { AiEnvelope, RiskLevel, ThreatFinding, ThreatReport } from "@/lib/ai/types";

type ScanState = {
  network: "preview" | "preprod";
  connected: boolean;
  walletMatchesNetwork: boolean;
  deployed: boolean;
  proofVerified: boolean;
  credentialCount: number;
  activityCount: number;
};

const THREAT_SCHEMA = {
  type: "OBJECT" as const,
  properties: {
    score: { type: "NUMBER" as const },
    posture: { type: "STRING" as const, enum: ["healthy", "watch", "critical"] },
    summary: { type: "STRING" as const },
    findings: {
      type: "ARRAY" as const,
      items: {
        type: "OBJECT" as const,
        properties: {
          severity: { type: "STRING" as const, enum: ["low", "medium", "high"] },
          title: { type: "STRING" as const },
          evidence: { type: "STRING" as const },
          recommendation: { type: "STRING" as const },
        },
        required: ["severity", "title", "evidence", "recommendation"],
      },
    },
  },
  required: ["score", "posture", "summary", "findings"],
};

function parseState(value: unknown): ScanState {
  const state = (value && typeof value === "object" ? value : {}) as Partial<ScanState>;
  return {
    network: state.network === "preview" ? "preview" : "preprod",
    connected: Boolean(state.connected),
    walletMatchesNetwork: Boolean(state.walletMatchesNetwork),
    deployed: Boolean(state.deployed),
    proofVerified: Boolean(state.proofVerified),
    credentialCount: Math.max(0, Math.min(50, Number(state.credentialCount) || 0)),
    activityCount: Math.max(0, Math.min(1_000, Number(state.activityCount) || 0)),
  };
}

function localReport(state: ScanState): ThreatReport {
  const findings: ThreatFinding[] = [];
  if (!state.connected) findings.push({ id: "wallet", severity: "medium", title: "Wallet readiness unknown", evidence: "No connected 1AM session is available.", recommendation: `Connect 1AM on ${state.network} and verify the domain before approving.` });
  if (state.connected && !state.walletMatchesNetwork) findings.push({ id: "network", severity: "high", title: "Network mismatch", evidence: "The selected app network differs from the wallet network.", recommendation: "Switch 1AM to the selected network before any transaction." });
  if (!state.deployed) findings.push({ id: "contract", severity: "medium", title: "Contract session unavailable", evidence: "No live contract address is configured for this network.", recommendation: "Deploy or verify a trusted full contract address before proving." });
  if (!state.credentialCount) findings.push({ id: "credential", severity: "low", title: "No compatible witness", evidence: "The local vault contains no credential labels.", recommendation: "Import only the minimum credential required by the target pass." });
  if (state.deployed && state.connected && state.walletMatchesNetwork) findings.push({ id: "boundary", severity: "low", title: "Privacy boundary intact", evidence: "Wallet, network, and contract readiness checks agree.", recommendation: "Review the disclosure plan before submitting the proof." });
  const penalty = findings.reduce((sum, finding) => sum + (finding.severity === "high" ? 38 : finding.severity === "medium" ? 18 : finding.title === "Privacy boundary intact" ? 0 : 6), 0);
  const score = Math.max(8, 100 - penalty);
  return { score, posture: score >= 80 ? "healthy" : score >= 45 ? "watch" : "critical", summary: score >= 80 ? "The current proof path has a strong privacy posture." : "Resolve the highlighted readiness gaps before signing a proof transaction.", findings };
}

function normalizeFindings(value: unknown, fallback: ThreatFinding[]): ThreatFinding[] {
  if (!Array.isArray(value)) return fallback;
  const severities: RiskLevel[] = ["low", "medium", "high"];
  const findings = value.slice(0, 8).map((item, index) => {
    const finding = item && typeof item === "object" ? item as Partial<ThreatFinding> : {};
    return {
      id: `ai-${index}`,
      severity: severities.includes(finding.severity as RiskLevel) ? finding.severity as RiskLevel : "medium",
      title: redactSecrets(finding.title || "Review required").slice(0, 100),
      evidence: redactSecrets(finding.evidence || "The minimized state needs review.").slice(0, 240),
      recommendation: redactSecrets(finding.recommendation || "Review the action before continuing.").slice(0, 240),
    };
  });
  return findings.length ? findings : fallback;
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => ({})) as { state?: unknown };
  const state = parseState(body.state);
  const fallback = localReport(state);
  const generated = await generateStructured<Partial<ThreatReport>>({
    system: "You are a privacy threat-modeling agent for a Midnight zero-knowledge app. Analyze only the minimized booleans and counts supplied. Be conservative, evidence-based, and actionable. Do not invent vulnerabilities or request sensitive data.",
    prompt: JSON.stringify(state),
    schema: THREAT_SCHEMA,
    temperature: 0.1,
  });
  const postureValues: ThreatReport["posture"][] = ["healthy", "watch", "critical"];
  const data: ThreatReport = {
    score: clampScore(generated?.score, fallback.score),
    posture: postureValues.includes(generated?.posture as ThreatReport["posture"]) ? generated?.posture as ThreatReport["posture"] : fallback.posture,
    summary: redactSecrets(generated?.summary || fallback.summary).slice(0, 320),
    findings: normalizeFindings(generated?.findings, fallback.findings),
  };
  const response: AiEnvelope<ThreatReport> = { data, mode: generated ? "gemini" : "local", generatedAt: new Date().toISOString() };
  return Response.json(response);
}
