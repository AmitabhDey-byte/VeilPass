export type AiMode = "gemini" | "local";

export type RiskLevel = "low" | "medium" | "high";

export type PrivacyContext = {
  network: "preview" | "preprod";
  connected: boolean;
  deployed: boolean;
  credentialNames: string[];
  activeView: string;
  proofVerified: boolean;
};

export type PolicyBlueprint = {
  name: string;
  summary: string;
  requirements: string[];
  publicSignals: string[];
  privateSignals: string[];
  retention: string;
  riskLevel: RiskLevel;
  riskReasons: string[];
  suggestedRoot: string;
};

export type DisclosurePlan = {
  decision: "recommended" | "review" | "avoid";
  score: number;
  headline: string;
  explanation: string;
  disclose: string[];
  keepPrivate: string[];
  warnings: string[];
};

export type ThreatFinding = {
  id: string;
  severity: RiskLevel;
  title: string;
  evidence: string;
  recommendation: string;
};

export type ThreatReport = {
  score: number;
  posture: "healthy" | "watch" | "critical";
  summary: string;
  findings: ThreatFinding[];
};

export type LedgerInsight = {
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "positive" | "warning";
};

export type LedgerReport = {
  headline: string;
  narrative: string;
  insights: LedgerInsight[];
  recommendations: string[];
};

export type AiEnvelope<T> = {
  data: T;
  mode: AiMode;
  generatedAt: string;
};
