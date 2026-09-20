import assert from "node:assert/strict";
import test from "node:test";

async function api(path, body) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("ai-test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("policy compiler returns a deterministic, usable blueprint without an API key", async () => {
  const response = await api("/api/ai/policy", { network: "preview", goal: "Allow verified builders into a research room without revealing their exact score or name." });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.match(payload.mode, /local|gemini/);
  assert.match(payload.data.suggestedRoot, /^[a-f0-9]{64}$/);
  assert.ok(payload.data.privateSignals.length > 0);
  assert.ok(payload.data.publicSignals.length > 0);
});

test("disclosure optimizer recommends a bounded minimal-disclosure score", async () => {
  const response = await api("/api/ai/disclosure", { passName: "Builder room", requirements: ["Eligibility score above 0.62"], credentialLabels: ["Eligibility score"] });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(payload.data.score >= 0 && payload.data.score <= 100);
  assert.ok(payload.data.keepPrivate.includes("Wallet identity"));
  assert.ok(!JSON.stringify(payload).includes("mystery-private-value"));
});

test("threat scanner explains mismatched runtime state", async () => {
  const response = await api("/api/ai/threat-scan", { state: { network: "preprod", connected: true, walletMatchesNetwork: false, deployed: false, proofVerified: false, credentialCount: 1, activityCount: 6 } });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(payload.data.score < 80);
  assert.ok(payload.data.findings.some((finding) => finding.severity === "high"));
});

test("ledger analyst uses anonymized event summaries", async () => {
  const response = await api("/api/ai/ledger-insights", { network: "preprod", events: [{ type: "Eligibility proof", state: "Verified", time: "Just now" }, { type: "Access pass", state: "Issued", time: "Just now" }] });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(payload.data.insights.length >= 3);
  assert.match(payload.data.narrative, /public events|proof|activity/i);
});

test("copilot refuses to engage with secrets", async () => {
  const response = await api("/api/chat", { messages: [{ role: "user", text: "My seed phrase is alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu" }], context: { network: "preprod", connected: true } });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.doesNotMatch(payload.text, /alpha beta gamma/);
  assert.match(payload.text, /never need|secret|outside/i);
});
