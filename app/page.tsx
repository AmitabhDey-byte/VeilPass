"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import { PrivacyIntelligence } from "@/app/components/privacy-intelligence";
import type { PolicyBlueprint } from "@/lib/ai/types";

type Network = "preview" | "preprod";
type View = "Overview" | "Passport" | "Access passes" | "Privacy intelligence" | "Credentials" | "Activity" | "Network health" | "Host console";
type ChatMessage = { role: "user" | "assistant"; text: string };
type PassState = "Ready to prove" | "Verified" | "Issued" | "Pending";
type ActivityFilter = "All activity" | "Proofs" | "Passes";
type ActivityKind = "Eligibility proof" | "Access pass" | "Allowlist registration";
type ActivityState = "Verified" | "Issued" | "Expired" | "Pending";

const NETWORK_LABEL: Record<Network, string> = { preview: "Preview", preprod: "Preprod" };
const NETWORK_FAUCET: Record<Network, string> = {
  preview: "https://midnight-tmnight-preview.nethermind.dev/",
  preprod: "https://midnight-tmnight-preprod.nethermind.dev/",
};
const DEFAULT_MIDNIGHT_NETWORK_ID = process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK_ID || "preprod";
const MIDNIGHT_WALLET_HINT = process.env.NEXT_PUBLIC_MIDNIGHT_WALLET || "1AM";
const GENERIC_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_MIDNIGHT_CONTRACT_ADDRESS || "";
const DEFAULT_ALLOWLIST_ROOT = "0".repeat(64);

const navItems: Array<{ label: View; icon: string; group: "workspace" | "vault" }> = [
  { label: "Overview", icon: "◒", group: "workspace" },
  { label: "Passport", icon: "◌", group: "workspace" },
  { label: "Access passes", icon: "◇", group: "workspace" },
  { label: "Privacy intelligence", icon: "✦", group: "workspace" },
  { label: "Network health", icon: "⌁", group: "workspace" },
  { label: "Credentials", icon: "⌑", group: "vault" },
  { label: "Activity", icon: "↗", group: "vault" },
  { label: "Host console", icon: "◫", group: "vault" },
];

const PASS_DEFINITIONS: Array<{
  id: string; name: string; type: string; accent: "violet" | "cyan" | "green" | "amber";
  detail: string; commitment: string; members: number; requirements: string[];
}> = [
  { id: "founders", name: "Founders Circle", type: "Invitation only", accent: "violet", detail: "Early product access for the first 500 members.", commitment: "m00x…7f3a", members: 487, requirements: ["Founders invitation credential", "Allowlist commitment m00x…7f3a"] },
  { id: "research", name: "Research sandbox", type: "Credential required", accent: "cyan", detail: "Private experiments, shared learnings.", commitment: "m00x…91a2", members: 124, requirements: ["Builder credential", "Active research agreement"] },
  { id: "builder", name: "Midnight builder house", type: "Community pass", accent: "green", detail: "A quiet room for people building in public.", commitment: "m00x…b31c", members: 218, requirements: ["Eligibility score above 0.62", "Public builder profile"] },
  { id: "beta", name: "Private beta waitlist", type: "Application", accent: "amber", detail: "Your application is held as a commitment.", commitment: "m00x…d4f0", members: 64, requirements: ["Submitted application", "Background commitment"] },
];

const ACTIVITY_SEED: Array<{ commitment: string; time: string; type: ActivityKind; state: ActivityState }> = [
  { commitment: "m00x…7f3a", time: "Just now", type: "Eligibility proof", state: "Verified" },
  { commitment: "m00x…1b8e", time: "12 min ago", type: "Access pass", state: "Issued" },
  { commitment: "m00x…a491", time: "Yesterday", type: "Eligibility proof", state: "Verified" },
  { commitment: "m00x…c210", time: "2 days ago", type: "Access pass", state: "Expired" },
  { commitment: "m00x…91a2", time: "2 days ago", type: "Eligibility proof", state: "Verified" },
  { commitment: "m00x…b31c", time: "3 days ago", type: "Access pass", state: "Issued" },
];

const CREDENTIAL_LIBRARY = [
  { name: "Founders invitation", issuer: "VeilPass community", icon: "✦", description: "Original access token for the first cohort." },
  { name: "Builder credential", issuer: "Midnight Academy", icon: "⌘", description: "Proves completion of the builder track." },
  { name: "Eligibility score", issuer: "Private issuer", icon: "◌", description: "A numeric score that never leaves your wallet." },
  { name: "Research agreement", issuer: "VeilPass labs", icon: "◒", description: "Signed terms enabling private research access." },
];

function shortAddress(address: string) {
  return address.length > 18 ? `${address.slice(0, 9)}…${address.slice(-7)}` : address;
}

function randomHex(bytes: number) {
  if (typeof window === "undefined") return "0".repeat(bytes * 2);
  const buffer = new Uint8Array(bytes);
  window.crypto.getRandomValues(buffer);
  return Array.from(buffer, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function findMidnightWallet() {
  const injected = Object.entries(window.midnight ?? {}) as Array<[string, InitialAPI]>;
  return injected.find(([, wallet]) => /1am/i.test(wallet.name) || /1am/i.test(wallet.rdns));
}

function SectionHeading({ kicker, title, action }: { kicker: string; title: string; action?: ReactNode }) {
  return <div className="section-heading"><div><span className="section-kicker">{kicker}</span><h2>{title}</h2></div>{action}</div>;
}

function PageIntro({ eyebrow, title, children, action }: { eyebrow: string; title: ReactNode; children: ReactNode; action?: ReactNode }) {
  return <section className="view-hero"><div><span className="eyebrow"><i />{eyebrow}</span><h1>{title}</h1><p>{children}</p></div>{action}</section>;
}

function ActivityTable({ rows, highlight }: { rows: typeof ACTIVITY_SEED; highlight?: string }) {
  return <div className="activity-panel"><div className="table-head"><span>Public commitment</span><span>Action</span><span>Time</span><span>Result</span></div>{rows.map((item) => <div className={`activity-row ${item.commitment === highlight ? "highlight" : ""}`} key={`${item.commitment}-${item.time}`}><span className="commitment"><i />{item.commitment}</span><span>{item.type}</span><span>{item.time}</span><span className={`table-status ${item.state.toLowerCase()}`}><i />{item.state}</span></div>)}</div>;
}

export default function Home() {
  const reducedMotion = useReducedMotion();
  const [activeNav, setActiveNav] = useState<View>("Overview");
  const [selectedNetwork, setSelectedNetwork] = useState<Network>(DEFAULT_MIDNIGHT_NETWORK_ID === "preview" ? "preview" : "preprod");
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletName, setWalletName] = useState("");
  const [walletNetwork, setWalletNetwork] = useState("");
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [walletApi, setWalletApi] = useState<ConnectedAPI | null>(null);
  const [contractAddresses, setContractAddresses] = useState<Record<Network, string>>(() => ({
    preview: process.env.NEXT_PUBLIC_MIDNIGHT_PREVIEW_CONTRACT_ADDRESS || (DEFAULT_MIDNIGHT_NETWORK_ID === "preview" ? GENERIC_CONTRACT_ADDRESS : ""),
    preprod: process.env.NEXT_PUBLIC_MIDNIGHT_PREPROD_CONTRACT_ADDRESS || (DEFAULT_MIDNIGHT_NETWORK_ID !== "preview" ? GENERIC_CONTRACT_ADDRESS : ""),
  }));
  const [deploymentTransactionIds, setDeploymentTransactionIds] = useState<Partial<Record<Network, string>>>({});
  const [deploymentBusy, setDeploymentBusy] = useState(false);
  const [proofBusy, setProofBusy] = useState(false);
  const [allowlistRegistrationBusy, setAllowlistRegistrationBusy] = useState(false);
  const [allowlistRoot, setAllowlistRoot] = useState("");
  const [allowlistName, setAllowlistName] = useState("Founders Circle · Cohort 04");
  const [passStates, setPassStates] = useState<Record<string, PassState>>({ founders: "Ready to prove", research: "Ready to prove", builder: "Ready to prove", beta: "Pending" });
  const [passBusyId, setPassBusyId] = useState<string | null>(null);
  const [activePass, setActivePass] = useState<typeof PASS_DEFINITIONS[number] | null>(null);
  const [userCredentials, setUserCredentials] = useState<typeof CREDENTIAL_LIBRARY>([CREDENTIAL_LIBRARY[0]]);
  const [showCredentialImport, setShowCredentialImport] = useState(false);
  const deployedProofRef = useRef<(() => Promise<void>) | null>(null);
  const registerAllowlistRef = useRef<((root: string) => Promise<void>) | null>(null);
  const [verified, setVerified] = useState(false);
  const [showProof, setShowProof] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");
  const [activityLog, setActivityLog] = useState(ACTIVITY_SEED);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("All activity");
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatMode, setChatMode] = useState<"local" | "gemini">("local");
  const [chatSuggestions, setChatSuggestions] = useState(["What stays private?", "Guide my first proof"]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{ role: "assistant", text: "I’m Veil. I can explain the private proof journey, your wallet readiness, or the public/private boundary." }]);

  const contractAddress = contractAddresses[selectedNetwork] || "Deployment pending";
  const deploymentTransactionId = deploymentTransactionIds[selectedNetwork] || "";
  const deployed = contractAddress !== "Deployment pending";

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const filteredActivity = useMemo(() => {
    if (activityFilter === "All activity") return activityLog;
    if (activityFilter === "Proofs") return activityLog.filter((entry) => entry.type !== "Access pass");
    return activityLog.filter((entry) => entry.type === "Access pass");
  }, [activityFilter, activityLog]);

  const activityCounts = useMemo(() => ({
    proofs: activityLog.filter((entry) => entry.type === "Eligibility proof").length,
    passes: activityLog.filter((entry) => entry.type === "Access pass").length,
    registrations: activityLog.filter((entry) => entry.type === "Allowlist registration").length,
  }), [activityLog]);

  function pushNotice(message: string) { setNotice(message); }
  function recordActivity(entry: { commitment: string; type: ActivityKind; state: ActivityState; time?: string }) {
    setActivityLog((log) => [{ ...entry, time: entry.time ?? formatTime(new Date()) }, ...log].slice(0, 24));
  }

  async function connectWallet(networkId: Network = selectedNetwork, forceConnect = false): Promise<ConnectedAPI | null> {
    if (connected && !forceConnect) {
      setWalletApi(null); deployedProofRef.current = null; registerAllowlistRef.current = null;
      setWalletAddress(""); setWalletName(""); setWalletNetwork(""); setWalletError(""); setConnected(false);
      pushNotice("Wallet disconnected");
      return null;
    }
    setWalletBusy(true); setWalletError("");
    try {
      const wallet = findMidnightWallet();
      if (!wallet) throw new Error(`1AM wallet was not detected. Install or enable 1AM for ${NETWORK_LABEL[networkId]}.`);
      if (!wallet[1].apiVersion.startsWith("4.")) throw new Error(`1AM DApp Connector v4 is required; this wallet reports API ${wallet[1].apiVersion}.`);
      const api = await wallet[1].connect(networkId);
      const [unshielded, shielded, configuration] = await Promise.all([api.getUnshieldedAddress(), api.getShieldedAddresses(), api.getConfiguration()]);
      if (configuration.networkId !== networkId) throw new Error(`Wallet is on ${configuration.networkId}; switch it to ${networkId} before continuing.`);
      setWalletApi(api); setWalletAddress(unshielded.unshieldedAddress || shielded.shieldedAddress); setWalletName(wallet[1].name || MIDNIGHT_WALLET_HINT);
      setWalletNetwork(configuration.networkId); setConnected(true); pushNotice(`Connected to ${wallet[1].name || MIDNIGHT_WALLET_HINT} on ${NETWORK_LABEL[networkId]}.`);
      return api;
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : "Midnight wallet connection was rejected.");
      pushNotice("Wallet connection failed");
      return null;
    } finally { setWalletBusy(false); }
  }

  async function generateProof(pass?: typeof PASS_DEFINITIONS[number]) {
    if (pass) setActivePass(pass);
    const api = walletApi ?? await connectWallet();
    if (api) setShowProof(true);
  }

  async function finishProof() {
    if (!deployedProofRef.current) { pushNotice(`Deploy VeilPass in this ${NETWORK_LABEL[selectedNetwork]} browser session before submitting a live access proof.`); return; }
    setProofBusy(true); setWalletError("");
    try {
      await deployedProofRef.current(); setVerified(true); setShowProof(false);
      const pass = activePass ?? PASS_DEFINITIONS[0];
      setPassStates((states) => ({ ...states, [pass.id]: "Verified" }));
      recordActivity({ commitment: pass.commitment, type: "Eligibility proof", state: "Verified" });
      recordActivity({ commitment: pass.commitment, type: "Access pass", state: "Issued" });
      setActiveNav("Overview"); pushNotice(`${pass.name} verified on Midnight ${NETWORK_LABEL[selectedNetwork]}.`);
    } catch (error) {
      const { describeVeilPassProofError } = await import("@/lib/midnight-browser-deploy");
      setWalletError(describeVeilPassProofError(error, selectedNetwork)); pushNotice("Private proof was not submitted");
    } finally { setProofBusy(false); }
  }

  async function runPassFlow(pass: typeof PASS_DEFINITIONS[number]) {
    if (passBusyId) return;
    setPassBusyId(pass.id);
    try { setActivePass(pass); await generateProof(pass); } finally { setPassBusyId(null); }
  }

  async function deploySelectedNetwork() {
    if (deploymentBusy) return;
    const network = selectedNetwork;
    const api = walletApi && walletNetwork === network ? walletApi : await connectWallet(network, true);
    if (!api) return;
    setDeploymentBusy(true); setWalletError("");
    try {
      const { deployVeilPass } = await import("@/lib/midnight-browser-deploy");
      const deployment = await deployVeilPass(api, network);
      deployedProofRef.current = deployment.proveAccess;
      registerAllowlistRef.current = deployment.registerAllowlist;
      setContractAddresses((current) => ({ ...current, [network]: deployment.contractAddress }));
      setDeploymentTransactionIds((current) => ({ ...current, [network]: deployment.transactionId }));
      setAllowlistRoot(DEFAULT_ALLOWLIST_ROOT);
      pushNotice(`Contract finalized on ${NETWORK_LABEL[network]}. Initializing its allowlist…`);
      await deployment.initializeDefaultAllowlist();
      await navigator.clipboard?.writeText(deployment.contractAddress);
      recordActivity({ commitment: `${deployment.contractAddress.slice(0, 8)}…${deployment.contractAddress.slice(-4)}`, type: "Allowlist registration", state: "Verified" });
      pushNotice(`${NETWORK_LABEL[network]} contract and default allowlist finalized. Full address copied.`);
    } catch (error) {
      const { describeMidnightDeploymentError } = await import("@/lib/midnight-browser-deploy");
      setWalletError(describeMidnightDeploymentError(error, network)); pushNotice(`${NETWORK_LABEL[network]} deployment failed`);
    } finally { setDeploymentBusy(false); }
  }

  async function registerAllowlistRoot() {
    if (!/^[0-9a-fA-F]{64}$/.test(allowlistRoot)) { pushNotice("Allowlist root must be 64 hex characters (32 bytes)."); return; }
    const api = walletApi ?? await connectWallet();
    if (!api) return;
    if (!registerAllowlistRef.current) { pushNotice(`Deploy on ${NETWORK_LABEL[selectedNetwork]} in this browser session before publishing an allowlist root.`); return; }
    setAllowlistRegistrationBusy(true); setWalletError("");
    try {
      await registerAllowlistRef.current(allowlistRoot);
      recordActivity({ commitment: `0x${allowlistRoot.slice(0, 6)}…${allowlistRoot.slice(-4)}`, type: "Allowlist registration", state: "Verified" });
      pushNotice(`Allowlist root registered for ${allowlistName}.`);
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : "Allowlist registration failed."); pushNotice("Allowlist registration was rejected");
    } finally { setAllowlistRegistrationBusy(false); }
  }

  function switchNetwork(network: Network) {
    if (network === selectedNetwork) return;
    setSelectedNetwork(network); setWalletApi(null); deployedProofRef.current = null; registerAllowlistRef.current = null;
    setWalletAddress(""); setWalletName(""); setWalletNetwork(""); setWalletError(""); setConnected(false); setVerified(false);
    pushNotice(`Switched to ${NETWORK_LABEL[network]}. Reconnect 1AM to continue.`);
  }
  function openView(view: View) { setActiveNav(view); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function copyAddress() {
    if (!deployed) return;
    void navigator.clipboard?.writeText(contractAddress); setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }
  function importCredential(credential: typeof CREDENTIAL_LIBRARY[number]) {
    if (userCredentials.some((existing) => existing.name === credential.name)) { pushNotice(`${credential.name} is already in your vault.`); return; }
    setUserCredentials((current) => [...current, credential]); setShowCredentialImport(false); pushNotice(`${credential.name} added to your private vault.`);
  }
  function applyCompiledPolicy(policy: PolicyBlueprint) {
    setAllowlistName(policy.name);
    setAllowlistRoot(policy.suggestedRoot);
    setActiveNav("Host console");
    pushNotice("AI policy staged in the Host console. Review it before registering.");
  }
  async function sendChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const text = chatInput.trim(); if (!text || chatBusy) return;
    const next = [...chatMessages, { role: "user" as const, text }]; setChatMessages(next); setChatInput(""); setChatBusy(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next, context: { network: selectedNetwork, connected, deployed, credentialCount: userCredentials.length, activeView: activeNav, proofVerified: verified } }) });
      const payload = await response.json() as { text?: string; mode?: "local" | "gemini"; suggestions?: string[] };
      if (payload.mode) setChatMode(payload.mode);
      if (payload.suggestions) setChatSuggestions(payload.suggestions);
      setChatMessages((messages) => [...messages, { role: "assistant", text: payload.text || "I can help with your privacy journey." }]);
    } catch { setChatMessages((messages) => [...messages, { role: "assistant", text: "Veil is in calm local mode. Ask about proofs, credentials, or 1AM." }]); }
    finally { setChatBusy(false); }
  }

  const overview = <>
    <PageIntro eyebrow="Midnight private access" title={<>Prove you belong.<br /><em>Keep your name.</em></>}>A quiet way to enter private spaces. Your credential remains in your wallet; Midnight receives only a cryptographic answer.</PageIntro>
    <section className="stats-grid" aria-label="Network statistics"><Metric label="Personal data exposed" value="0" detail="bytes, by design" accent="cedar" /><Metric label="Proof journey" value={verified ? "Complete" : "Ready"} detail={verified ? "private proof accepted" : "wallet-side proving"} /><Metric label="Network" value={NETWORK_LABEL[selectedNetwork]} detail={connected ? "1AM connected" : "wallet not connected"} /><Metric label="Contract" value={deployed ? "Live" : "Awaiting"} detail={deployed ? "address available" : "deploy when ready"} /></section>
    <section className="dashboard-grid"><div><SectionHeading kicker="Your next step" title="A private pass, waiting quietly." action={<span className="chain-chip"><i />{NETWORK_LABEL[selectedNetwork]}</span>} /><div className={`proof-panel ${verified ? "is-verified" : ""}`}><div className="proof-panel-top"><div className="pass-icon">✦</div><div><strong>Founders Circle</strong><span>Private allowlist · invitation only</span></div><b className={`pass-status ${verified ? "verified" : ""}`}>{verified ? "Verified" : "Ready to prove"}</b></div><div className="proof-panel-body"><div><h3>{verified ? "The room is open." : "Enter the quiet circle without leaving a trail."}</h3><p>{verified ? "Your eligibility proof was accepted. The ledger knows the claim is true—not who made it." : "A zero-knowledge circuit checks your witness locally, then reveals only a valid or invalid result."}</p><button className="primary-button" type="button" onClick={verified ? () => setVerified(false) : () => generateProof()}>{verified ? "Reset view" : "Generate private proof"}<span>→</span></button></div><motion.div className="proof-visual" animate={reducedMotion ? undefined : { rotate: [0, 2, 0, -2, 0], y: [0, -5, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}><i className="orbit orbit-one" /><i className="orbit orbit-two" /><b>✦<small>ZK</small></b><span /><span /><span /></motion.div></div><div className="proof-panel-footer"><span>✓ Witness encrypted</span><span>✓ Circuit ready</span><span>✓ Selective disclosure</span></div></div><SectionHeading kicker="Public ledger" title="Recent commitments" action={<button className="text-button" type="button" onClick={() => openView("Activity")}>View all →</button>} /><ActivityTable rows={activityLog.slice(0, 4)} highlight={activePass?.commitment} /></div><PrivacyCard onOpen={() => setShowPrivacy(true)} onCopy={copyAddress} copied={copied} contractAddress={contractAddress} deployed={deployed} selectedNetwork={selectedNetwork} onDeploy={deploySelectedNetwork} deploymentBusy={deploymentBusy} /></section>
  </>;

  const passportView = <section className="view-page"><PageIntro eyebrow="Member passport" title={<>Your privacy journey,<br /><em>made legible.</em></>}>A member-facing guide to the only steps that matter. Your witness remains local throughout.</PageIntro><div className="journey-grid">{[["01", "Connect 1AM", connected ? "Connected to the right wallet." : "Bring your 1AM wallet to the selected network.", connected], ["02", "Choose a credential", `${userCredentials.length} private witness${userCredentials.length === 1 ? "" : "es"} in your vault.`, userCredentials.length > 0], ["03", "Run a private proof", "The circuit evaluates your claim without exposing its source.", verified], ["04", "Enter with confidence", "Only the validity result is visible to an observer.", verified]].map(([step, title, copy, complete]) => <motion.article className={`journey-card ${complete ? "complete" : ""}`} key={String(step)} initial={reducedMotion ? undefined : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Number(String(step)) * 0.05 }}><span>{step}</span><h2>{title}</h2><p>{copy}</p><b>{complete ? "Complete" : "Next"}</b></motion.article>)}</div><div className="wide-info-panel"><div className="info-icon">⌑</div><div><span className="section-kicker">Your boundary</span><h2>A proof is not a profile.</h2><p>Names, credential sources, scores, and membership evidence remain in your control. VeilPass discloses the smallest possible answer.</p></div><button className="secondary-button" type="button" onClick={() => setShowPrivacy(true)}>See privacy model →</button></div></section>;

  const passesView = <section className="view-page"><PageIntro eyebrow="Private rooms" title={<>Choose where to<br /><em>belong next.</em></>}>Each room asks for a different private claim. The public ledger never receives your identity or the source credential.</PageIntro><div className="pass-grid">{PASS_DEFINITIONS.map((pass) => <motion.article className={`pass-card ${pass.accent} ${passStates[pass.id].toLowerCase().replaceAll(" ", "-")}`} key={pass.id} whileHover={reducedMotion ? undefined : { y: -5 }}><div className="pass-card-top"><span>{pass.type}</span><b>{passStates[pass.id]}</b></div><h2>{pass.name}</h2><p>{pass.detail}</p><ul>{pass.requirements.map((item) => <li key={item}>✓ {item}</li>)}</ul><div className="pass-card-footer"><span>{pass.members} members</span><button className="text-button" type="button" disabled={passBusyId === pass.id} onClick={() => runPassFlow(pass)}>{passBusyId === pass.id ? "Preparing…" : "Request access →"}</button></div></motion.article>)}</div></section>;

  const credentialsView = <section className="view-page"><PageIntro eyebrow="Private witness vault" title={<>Only you hold<br /><em>the evidence.</em></>}>Credentials are represented locally in this prototype. They are never posted to a server or copied into the public ledger.</PageIntro><div className="vault-banner"><div>⌑</div><p><strong>Local-first by design</strong><span>Your witness lives with the wallet that owns it.</span></p><b><i />Shielded</b></div><div className="credential-list">{userCredentials.map((credential) => <article className="credential-card" key={credential.name}><div>{credential.icon}</div><section><h2>{credential.name} <b>Private</b></h2><p>Issued by <strong>{credential.issuer}</strong></p><span>{credential.description}</span></section><button className="text-button" type="button" onClick={() => { setActivePass(PASS_DEFINITIONS[0]); setShowProof(true); }}>Use →</button></article>)}</div><button className="secondary-button add-credential" type="button" onClick={() => setShowCredentialImport(true)}>Add a private witness +</button></section>;

  const activityView = <section className="view-page"><PageIntro eyebrow="Public ledger" title={<>A readable trail,<br /><em>without an identity trail.</em></>}>Observers can verify activity, not people. These records show commitments and results only.</PageIntro><div className="activity-summary"><Metric label="Proofs" value={String(activityCounts.proofs)} detail="validity checks" /><Metric label="Access passes" value={String(activityCounts.passes)} detail="private entries" /><Metric label="Root registrations" value={String(activityCounts.registrations)} detail="host operations" /><Metric label="Private data" value="0 bytes" detail="in public records" accent="cedar" /></div><div className="filter-bar">{(["All activity", "Proofs", "Passes"] as ActivityFilter[]).map((label) => <button key={label} className={activityFilter === label ? "active" : ""} onClick={() => setActivityFilter(label)} type="button">{label}</button>)}</div><SectionHeading kicker="Transaction history" title="Every public event" action={<span className="chain-chip"><i />Synced now</span>} /><ActivityTable rows={filteredActivity} highlight={activePass?.commitment} /></section>;

  const intelligenceView = <PrivacyIntelligence network={selectedNetwork} connected={connected} deployed={deployed} walletMatchesNetwork={connected && walletNetwork === selectedNetwork} proofVerified={verified} credentialLabels={userCredentials.map((credential) => credential.name)} passes={PASS_DEFINITIONS.map(({ id, name, requirements }) => ({ id, name, requirements }))} activity={activityLog.map(({ type, state, time }) => ({ type, state, time }))} onApplyPolicy={applyCompiledPolicy} />;

  const healthView = <section className="view-page"><PageIntro eyebrow="Network health" title={<>A calm check before<br /><em>you make a claim.</em></>}>VeilPass reads the selected wallet configuration at connection time. This page makes the requirements visible before any transaction begins.</PageIntro><div className="health-grid"><HealthCard title="Wallet" value={connected ? "Ready" : "Needs connection"} detail={connected ? `${walletName || MIDNIGHT_WALLET_HINT} · ${shortAddress(walletAddress)}` : `Connect 1AM on ${NETWORK_LABEL[selectedNetwork]}.`} ready={connected} action={!connected ? <button className="secondary-button" onClick={() => connectWallet()} type="button">Connect 1AM →</button> : undefined} /><HealthCard title="Selected network" value={NETWORK_LABEL[selectedNetwork]} detail="The wallet must match this network before a proof or deployment can start." ready={connected && walletNetwork === selectedNetwork} action={<a className="text-button" href={NETWORK_FAUCET[selectedNetwork]} target="_blank" rel="noreferrer">Get tNIGHT + DUST ↗</a>} /><HealthCard title="Proof service" value="Wallet managed" detail="1AM supplies the configured proving provider and indexer endpoints; Vercel does not host a proof server." ready={connected} /><HealthCard title="Contract session" value={deployed ? "Address available" : "Not deployed"} detail={deployed ? shortAddress(contractAddress) : `Deploy a real contract on ${NETWORK_LABEL[selectedNetwork]} when your wallet has DUST.`} ready={deployed} action={!deployed ? <button className="secondary-button" type="button" onClick={deploySelectedNetwork} disabled={deploymentBusy}>{deploymentBusy ? "Deploying…" : `Deploy to ${NETWORK_LABEL[selectedNetwork]} →`}</button> : undefined} /></div></section>;

  const hostView = <section className="view-page"><PageIntro eyebrow="Host console" title={<>Publish a private<br /><em>allowlist root.</em></>}>Hosts disclose a 32-byte commitment—not a member list. Each member later proves eligibility using a private witness.</PageIntro><div className="host-grid"><article className="host-card"><span className="section-kicker">Allowlist metadata</span><h2>Define the room</h2><label>Allowlist name<input value={allowlistName} onChange={(event) => setAllowlistName(event.target.value)} placeholder="Cohort name" /></label><label>32-byte commitment<textarea value={allowlistRoot} onChange={(event) => setAllowlistRoot(event.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 64))} placeholder="64 hex characters" rows={3} spellCheck={false} /><small>{allowlistRoot.length} / 64 hex characters</small></label><div><button className="secondary-button" type="button" onClick={() => setAllowlistRoot(randomHex(32))}>Generate root</button><button className="primary-button" type="button" onClick={registerAllowlistRoot} disabled={allowlistRegistrationBusy}>{allowlistRegistrationBusy ? "Registering…" : "Register root"} →</button></div></article><article className="host-card"><span className="section-kicker">The public / private split</span><h2>One public call. Many private proofs.</h2><ol><li><b>01</b><p><strong>Compute the commitment</strong>Hash accepted credentials into a 32-byte root.</p></li><li><b>02</b><p><strong>Register the root</strong><code>disclose()</code> publishes the root and nothing else.</p></li><li><b>03</b><p><strong>Let members prove privately</strong>Each witness is evaluated locally by the ZK circuit.</p></li></ol></article><article className="host-card deployment-card"><span className="section-kicker">Current network</span><h2>{NETWORK_LABEL[selectedNetwork]}</h2><strong>{deployed ? shortAddress(contractAddress) : "No session contract"}</strong><p>{deployed ? "The displayed address is copyable from the Overview card. Browser-private state remains only in this session." : "Connect 1AM, fund DUST, then use the real deploy action."}</p><button className="primary-button" type="button" onClick={deploySelectedNetwork} disabled={deploymentBusy}>{deploymentBusy ? "Deploying…" : `Deploy to ${NETWORK_LABEL[selectedNetwork]}`} →</button></article></div></section>;

  const currentView = activeNav === "Overview" ? overview : activeNav === "Passport" ? passportView : activeNav === "Access passes" ? passesView : activeNav === "Privacy intelligence" ? intelligenceView : activeNav === "Credentials" ? credentialsView : activeNav === "Activity" ? activityView : activeNav === "Network health" ? healthView : hostView;
  const pageTransition = reducedMotion ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.28 } };

  return <div className="app-shell">
    <div className="fuji-horizon" aria-hidden="true"><i /><i /><i /></div>
    <motion.aside className="sidebar" initial={reducedMotion ? undefined : { opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}><div className="brand-lockup"><div className="brand-mark">⌂</div><div><strong>VeilPass</strong><span>Private allowlist</span></div></div><span className="workspace-label">Workspace</span><nav className="primary-nav">{navItems.filter((item) => item.group === "workspace").map((item) => <button className={activeNav === item.label ? "active" : ""} key={item.label} onClick={() => openView(item.label)} type="button"><i>{item.icon}</i>{item.label}{item.label === "Access passes" && <b>04</b>}</button>)}</nav><span className="workspace-label vault-label">Vault & operations</span><nav className="primary-nav">{navItems.filter((item) => item.group === "vault").map((item) => <button className={activeNav === item.label ? "active" : ""} key={item.label} onClick={() => openView(item.label)} type="button"><i>{item.icon}</i>{item.label}</button>)}</nav><div className="sidebar-bottom"><div className="network-card"><span><i />Network ready</span><strong>{NETWORK_LABEL[selectedNetwork]}</strong><a href={NETWORK_FAUCET[selectedNetwork]} target="_blank" rel="noreferrer">tNIGHT + DUST faucet ↗</a></div><button className="wallet-mini" type="button" onClick={() => connectWallet()}><span>{connected ? "●" : "○"}</span><div><strong>{connected ? walletName || MIDNIGHT_WALLET_HINT : "Connect 1AM"}</strong><small>{connected ? shortAddress(walletAddress) : "Wallet not connected"}</small></div></button></div></motion.aside>
    <main className="main-content"><header className="topbar"><div className="breadcrumb">Workspace <i>/</i><strong>{activeNav}</strong></div><div className="topbar-actions"><div className="network-toggle" role="group" aria-label="Midnight network"><button className={selectedNetwork === "preview" ? "active" : ""} onClick={() => switchNetwork("preview")} type="button">Preview</button><button className={selectedNetwork === "preprod" ? "active" : ""} onClick={() => switchNetwork("preprod")} type="button">Preprod</button></div><button className="assistant-button" type="button" onClick={() => setShowAssistant(true)} aria-label="Open assistant">✦</button><button className={`wallet-button ${connected ? "connected" : ""}`} onClick={() => connectWallet()} type="button"><i />{connected ? shortAddress(walletAddress) : "Connect wallet"}</button></div></header><div className="wallet-status-area"><AnimatePresence>{walletBusy && <StatusBanner key="wallet" title={`Connecting ${MIDNIGHT_WALLET_HINT}…`} detail="Approve the request in your wallet." />}{deploymentBusy && <StatusBanner key="deploy" title={`Deploying to ${NETWORK_LABEL[selectedNetwork]}…`} detail="1AM is building and submitting the real contract transaction." />}{allowlistRegistrationBusy && <StatusBanner key="root" title="Registering allowlist root…" detail="Publishing the selected commitment on chain." />}{walletError && <StatusBanner key="error" title="Wallet action needs attention" detail={walletError} error />}</AnimatePresence></div><div className="page-content"><AnimatePresence mode="wait"><motion.div key={activeNav} {...pageTransition}>{currentView}</motion.div></AnimatePresence></div><footer className="site-footer"><span>VeilPass · a Midnight privacy prototype</span><button type="button" onClick={() => setShowPrivacy(true)}>How privacy works →</button></footer></main>
    <AnimatePresence>{deploymentTransactionId && <motion.div className="deployment-receipt" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}><b>{NETWORK_LABEL[selectedNetwork]} finalized</b><span>Contract <code>{contractAddress}</code></span><span>Transaction <code>{deploymentTransactionId}</code></span></motion.div>}</AnimatePresence>
    <button className="assistant-launcher" type="button" onClick={() => setShowAssistant(true)}><span>✦</span><div><strong>Ask Veil</strong><small>Privacy guide</small></div></button>
    <AnimatePresence>{showAssistant && <motion.aside className="assistant-drawer" initial={reducedMotion ? undefined : { opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 28 }} transition={{ duration: 0.24 }}><header><div><i>✦</i><span><strong>Veil copilot</strong><small>{chatMode === "gemini" ? "Context-aware · Gemini" : "Privacy-safe local mode"}</small></span></div><button className="close-button" type="button" onClick={() => setShowAssistant(false)}>×</button></header><div className="assistant-messages">{chatMessages.map((message, index) => <motion.p className={message.role} key={`${message.role}-${index}`} initial={reducedMotion ? undefined : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>{message.text}</motion.p>)}{chatBusy && <p className="assistant typing">Reasoning over minimized state…</p>}</div><div className="assistant-suggestions">{chatSuggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => setChatInput(suggestion)}>{suggestion}</button>)}</div><form onSubmit={sendChat}><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask about your next safe action…" /><button type="submit" disabled={chatBusy}>→</button></form><small className="assistant-note">Only minimized UI state is sent. Never share a seed phrase or private witness.</small></motion.aside>}</AnimatePresence>
    <AnimatePresence>{notice && <motion.div className="toast" role="status" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }}>✓ {notice}</motion.div>}</AnimatePresence>
    <AnimatePresence>{showProof && <Modal onClose={() => setShowProof(false)}><span className="section-kicker">Private proof request</span><h2>Prove {activePass?.name || "your access"}.</h2><p>1AM evaluates a private witness locally. The chain receives only whether the claim is valid.</p><div className="modal-steps"><p><b>01</b> Load encrypted witness <i>ready</i></p><p><b>02</b> Run ZK circuit <i>wallet-side</i></p><p><b>03</b> Disclose validity only <i>minimal</i></p></div><button className="primary-button modal-cta" type="button" disabled={proofBusy} onClick={finishProof}>{proofBusy ? "Submitting proof…" : "Run private proof"} →</button><small>Nothing sensitive leaves this device.</small></Modal>}</AnimatePresence>
    <AnimatePresence>{showPrivacy && <Modal onClose={() => setShowPrivacy(false)} wide><span className="section-kicker">The VeilPass model</span><h2>A proof is not a profile.</h2><p>Midnight lets a contract verify a claim without learning the data that made the claim true.</p><div className="model-diagram"><div><b>⌑</b><strong>Private witness</strong><small>Credential + secret</small></div><i>→</i><div><b>✦</b><strong>ZK circuit</strong><small>Checks the claim</small></div><i>→</i><div><b>◒</b><strong>Public result</strong><small>Valid / invalid</small></div></div></Modal>}</AnimatePresence>
    <AnimatePresence>{showCredentialImport && <Modal onClose={() => setShowCredentialImport(false)} wide><span className="section-kicker">Add private witness</span><h2>Bring only what you need.</h2><p>Choose a local credential template. This prototype does not send the credential to VeilPass or a server.</p><div className="credential-grid">{CREDENTIAL_LIBRARY.map((credential) => { const used = userCredentials.some((item) => item.name === credential.name); return <button className={used ? "used" : ""} key={credential.name} disabled={used} onClick={() => importCredential(credential)} type="button"><b>{credential.icon}</b><strong>{credential.name}</strong><small>{credential.issuer}</small><span>{used ? "Already in vault" : credential.description}</span></button>; })}</div></Modal>}</AnimatePresence>
  </div>;
}

function Metric({ label, value, detail, accent }: { label: string; value: string; detail: string; accent?: "cedar" }) {
  return <article className={`stat-card ${accent ? "accent" : ""}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function HealthCard({ title, value, detail, ready, action }: { title: string; value: string; detail: string; ready: boolean; action?: ReactNode }) {
  return <article className={`health-card ${ready ? "ready" : ""}`}><span>{title}</span><i>{ready ? "●" : "○"}</i><h2>{value}</h2><p>{detail}</p>{action}</article>;
}

function StatusBanner({ title, detail, error }: { title: string; detail: string; error?: boolean }) {
  return <motion.div className={`wallet-status-banner ${error ? "error" : ""}`} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><i /> <strong>{title}</strong><span>{detail}</span></motion.div>;
}

function Modal({ children, onClose, wide }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
  return <motion.div className="modal-backdrop" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.section className={`privacy-modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.98 }} onClick={(event) => event.stopPropagation()}><button className="close-button" type="button" onClick={onClose}>×</button>{children}</motion.section></motion.div>;
}

function PrivacyCard({ onOpen, onCopy, copied, contractAddress, deployed, selectedNetwork, onDeploy, deploymentBusy }: { onOpen: () => void; onCopy: () => void; copied: boolean; contractAddress: string; deployed: boolean; selectedNetwork: Network; onDeploy: () => void; deploymentBusy: boolean }) {
  return <aside className="right-column"><SectionHeading kicker="Selective disclosure" title="Privacy model" action={<button className="round-help" onClick={onOpen} type="button">?</button>} /><div className="privacy-panel"><p>There are two layers to every proof. The network gets a narrow answer. Your story stays with you.</p><div><strong>Publicly visible</strong><span>Eligibility commitment <b>hashed</b></span><span>Proof validity <b>yes / no</b></span></div><div><strong>Kept private</strong><span>Your name <b>hidden</b></span><span>Credential source <b>hidden</b></span><span>Underlying value <b>hidden</b></span></div><button className="text-button" type="button" onClick={onOpen}>Explore the privacy model →</button></div><div className="contract-card"><header><span>Current deployment</span><b>{NETWORK_LABEL[selectedNetwork]}</b></header><strong>veil-allowlist.compact</strong><button className="contract-address" type="button" onClick={onCopy} disabled={!deployed}>{copied ? "Copied to clipboard" : deployed ? shortAddress(contractAddress) : "Deployment pending"}<span>{copied ? "✓" : "⧉"}</span></button><small>Managed circuits <b>2</b><b>{deployed ? "address available" : "no session address"}</b></small>{!deployed && <button className="primary-button deploy-inline" type="button" disabled={deploymentBusy} onClick={onDeploy}>{deploymentBusy ? "Deploying…" : `Deploy to ${NETWORK_LABEL[selectedNetwork]}`} →</button>}</div></aside>;
}
