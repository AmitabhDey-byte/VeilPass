"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { AiEnvelope, DisclosurePlan, LedgerReport, PolicyBlueprint, ThreatReport } from "@/lib/ai/types";

type Network = "preview" | "preprod";
type Pipeline = "posture" | "policy" | "disclosure" | "ledger";
type PassSummary = { id: string; name: string; requirements: string[] };
type ActivitySummary = { type: string; state: string; time: string };

type Props = {
  network: Network;
  connected: boolean;
  deployed: boolean;
  walletMatchesNetwork: boolean;
  proofVerified: boolean;
  credentialLabels: string[];
  passes: PassSummary[];
  activity: ActivitySummary[];
  onApplyPolicy: (policy: PolicyBlueprint) => void;
};

const PIPELINES: Array<{ id: Pipeline; icon: string; title: string; detail: string }> = [
  { id: "posture", icon: "⌁", title: "Threat scan", detail: "Explainable readiness and privacy risk" },
  { id: "policy", icon: "✦", title: "Policy compiler", detail: "Natural language to ZK policy" },
  { id: "disclosure", icon: "◇", title: "Disclosure planner", detail: "Find the minimum public claim" },
  { id: "ledger", icon: "↗", title: "Ledger analyst", detail: "Aggregate public activity safely" },
];

async function post<T>(url: string, body: unknown): Promise<AiEnvelope<T>> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json() as AiEnvelope<T> & { error?: string };
  if (!response.ok) throw new Error(payload.error || "The intelligence pipeline could not complete.");
  return payload;
}

function ResultMeta({ mode, generatedAt }: { mode: "gemini" | "local"; generatedAt: string }) {
  return <div className="ai-result-meta"><span className={mode}><i />{mode === "gemini" ? "Gemini reasoning" : "Local deterministic analysis"}</span><time>{new Date(generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>;
}

function EmptyResult({ icon, title, detail }: { icon: string; title: string; detail: string }) {
  return <div className="ai-empty"><b>{icon}</b><h3>{title}</h3><p>{detail}</p></div>;
}

export function PrivacyIntelligence(props: Props) {
  const [active, setActive] = useState<Pipeline>("posture");
  const [busy, setBusy] = useState<Pipeline | null>(null);
  const [error, setError] = useState("");
  const [policyGoal, setPolicyGoal] = useState("Let verified builders enter a private research room without revealing their name, exact score, or credential issuer.");
  const [selectedPassId, setSelectedPassId] = useState(props.passes[0]?.id || "");
  const [threat, setThreat] = useState<AiEnvelope<ThreatReport> | null>(null);
  const [policy, setPolicy] = useState<AiEnvelope<PolicyBlueprint> | null>(null);
  const [disclosure, setDisclosure] = useState<AiEnvelope<DisclosurePlan> | null>(null);
  const [ledger, setLedger] = useState<AiEnvelope<LedgerReport> | null>(null);
  const selectedPass = props.passes.find((item) => item.id === selectedPassId) || props.passes[0];

  async function run<T>(pipeline: Pipeline, task: () => Promise<AiEnvelope<T>>, save: (value: AiEnvelope<T>) => void) {
    setBusy(pipeline); setError("");
    try { save(await task()); } catch (reason) { setError(reason instanceof Error ? reason.message : "Pipeline failed safely."); }
    finally { setBusy(null); }
  }

  const scanThreats = () => run("posture", () => post<ThreatReport>("/api/ai/threat-scan", { state: { network: props.network, connected: props.connected, walletMatchesNetwork: props.walletMatchesNetwork, deployed: props.deployed, proofVerified: props.proofVerified, credentialCount: props.credentialLabels.length, activityCount: props.activity.length } }), setThreat);
  const compilePolicy = () => run("policy", () => post<PolicyBlueprint>("/api/ai/policy", { goal: policyGoal, network: props.network }), setPolicy);
  const planDisclosure = () => selectedPass && run("disclosure", () => post<DisclosurePlan>("/api/ai/disclosure", { passName: selectedPass.name, requirements: selectedPass.requirements, credentialLabels: props.credentialLabels }), setDisclosure);
  const analyzeLedger = () => run("ledger", () => post<LedgerReport>("/api/ai/ledger-insights", { events: props.activity, network: props.network }), setLedger);

  return <section className="view-page ai-workspace">
    <div className="ai-hero"><div><span className="eyebrow"><i />Privacy intelligence</span><h1>Reason over signals.<br /><em>Never over secrets.</em></h1><p>Four specialized pipelines turn minimized app state into explainable actions. Raw witnesses, wallet addresses, and credential contents never enter these requests.</p></div><div className="ai-orb" aria-hidden="true"><i /><i /><strong>AI<small>× ZK</small></strong></div></div>
    <div className="ai-boundary"><span>Data boundary</span><b>✓ Booleans & counts</b><b>✓ Credential labels only</b><b>✓ Redaction before inference</b><b>× No private witnesses</b></div>
    <div className="ai-layout">
      <nav className="pipeline-nav" aria-label="AI pipelines">{PIPELINES.map((pipeline, index) => <button className={active === pipeline.id ? "active" : ""} key={pipeline.id} onClick={() => { setActive(pipeline.id); setError(""); }} type="button"><span>{pipeline.icon}</span><div><small>0{index + 1}</small><strong>{pipeline.title}</strong><p>{pipeline.detail}</p></div><i>→</i></button>)}</nav>
      <div className="pipeline-stage">
        {error && <div className="ai-error">{error}</div>}
        <AnimatePresence mode="wait">
          {active === "posture" && <motion.div className="pipeline-panel" key="posture" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><header><div><span>Agent 01</span><h2>Privacy threat scan</h2><p>Checks proof readiness and privacy boundaries using only minimized runtime state.</p></div><button className="primary-button" onClick={scanThreats} disabled={busy === "posture"} type="button">{busy === "posture" ? "Scanning…" : "Run scan"} →</button></header>{threat ? <div className="ai-result"><ResultMeta mode={threat.mode} generatedAt={threat.generatedAt} /><div className={`posture-score ${threat.data.posture}`}><strong>{threat.data.score}</strong><span><b>{threat.data.posture} posture</b><p>{threat.data.summary}</p></span></div><div className="finding-list">{threat.data.findings.map((finding) => <article key={finding.id}><i className={finding.severity} /><div><strong>{finding.title}</strong><p>{finding.evidence}</p><small>{finding.recommendation}</small></div><b>{finding.severity}</b></article>)}</div></div> : <EmptyResult icon="⌁" title="Your privacy perimeter is ready to inspect" detail="Run a scan before connecting, deploying, or submitting a proof." />}</motion.div>}
          {active === "policy" && <motion.div className="pipeline-panel" key="policy" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><header><div><span>Agent 02</span><h2>Natural-language policy compiler</h2><p>Describe who should enter. The pipeline converts the goal into minimal public and private claims.</p></div></header><label className="ai-prompt">Access goal<textarea rows={4} value={policyGoal} onChange={(event) => setPolicyGoal(event.target.value)} /><small>{policyGoal.length} / 1,500 characters · secrets are redacted server-side</small></label><button className="primary-button" onClick={compilePolicy} disabled={busy === "policy" || policyGoal.trim().length < 12} type="button">{busy === "policy" ? "Compiling policy…" : "Compile ZK policy"} →</button>{policy && <div className="ai-result policy-result"><ResultMeta mode={policy.mode} generatedAt={policy.generatedAt} /><div className="result-heading"><div><small>Generated blueprint</small><h3>{policy.data.name}</h3><p>{policy.data.summary}</p></div><b className={`risk-${policy.data.riskLevel}`}>{policy.data.riskLevel} risk</b></div><div className="signal-columns"><section><span>Public signals</span>{policy.data.publicSignals.map((item) => <p key={item}>○ {item}</p>)}</section><section><span>Keep private</span>{policy.data.privateSignals.map((item) => <p key={item}>✓ {item}</p>)}</section></div><div className="commitment-preview"><span>Suggested commitment</span><code>{policy.data.suggestedRoot}</code></div><button className="secondary-button" type="button" onClick={() => props.onApplyPolicy(policy.data)}>Use in Host console →</button></div>}</motion.div>}
          {active === "disclosure" && <motion.div className="pipeline-panel" key="disclosure" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><header><div><span>Agent 03</span><h2>Selective disclosure planner</h2><p>Matches pass requirements to credential labels and recommends the smallest public proof surface.</p></div></header><label className="ai-select">Access pass<select value={selectedPassId} onChange={(event) => setSelectedPassId(event.target.value)}>{props.passes.map((pass) => <option key={pass.id} value={pass.id}>{pass.name}</option>)}</select></label><div className="input-summary"><span>Available locally</span><b>{props.credentialLabels.length} credential label{props.credentialLabels.length === 1 ? "" : "s"}</b><span>Required claims</span><b>{selectedPass?.requirements.length || 0}</b></div><button className="primary-button" onClick={planDisclosure} disabled={busy === "disclosure" || !selectedPass} type="button">{busy === "disclosure" ? "Optimizing…" : "Plan minimum disclosure"} →</button>{disclosure && <div className="ai-result"><ResultMeta mode={disclosure.mode} generatedAt={disclosure.generatedAt} /><div className="disclosure-score"><strong>{disclosure.data.score}<small>/100</small></strong><div><b>{disclosure.data.headline}</b><p>{disclosure.data.explanation}</p></div></div><div className="signal-columns"><section><span>Disclose</span>{disclosure.data.disclose.map((item) => <p key={item}>○ {item}</p>)}</section><section><span>Keep private</span>{disclosure.data.keepPrivate.map((item) => <p key={item}>✓ {item}</p>)}</section></div>{disclosure.data.warnings.length > 0 && <div className="warning-list">{disclosure.data.warnings.map((item) => <p key={item}>! {item}</p>)}</div>}</div>}</motion.div>}
          {active === "ledger" && <motion.div className="pipeline-panel" key="ledger" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><header><div><span>Agent 04</span><h2>Privacy-preserving ledger analyst</h2><p>Explains aggregate public events without inferring wallets, identities, or private intent.</p></div><button className="primary-button" onClick={analyzeLedger} disabled={busy === "ledger"} type="button">{busy === "ledger" ? "Analyzing…" : "Analyze activity"} →</button></header>{ledger ? <div className="ai-result"><ResultMeta mode={ledger.mode} generatedAt={ledger.generatedAt} /><div className="result-heading"><div><small>Aggregate narrative</small><h3>{ledger.data.headline}</h3><p>{ledger.data.narrative}</p></div></div><div className="insight-grid">{ledger.data.insights.map((insight) => <article className={insight.tone} key={insight.label}><span>{insight.label}</span><strong>{insight.value}</strong><p>{insight.detail}</p></article>)}</div><div className="recommendation-list"><span>Recommended next actions</span>{ledger.data.recommendations.map((item) => <p key={item}>→ {item}</p>)}</div></div> : <EmptyResult icon="↗" title={`${props.activity.length} anonymized events ready`} detail="Analyze the visible activity window without sending commitments or wallet addresses." />}</motion.div>}
        </AnimatePresence>
      </div>
    </div>
  </section>;
}
