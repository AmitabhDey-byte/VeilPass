"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";

type View = "Overview" | "Access passes" | "Credentials" | "Activity" | "Host console";
type ChatMessage = { role: "user" | "assistant"; text: string };
type PassState = "Ready to prove" | "Verified" | "Issued" | "Pending";
type ActivityFilter = "All activity" | "Proofs" | "Passes";
type ActivityKind = "Eligibility proof" | "Access pass" | "Allowlist registration";
type ActivityState = "Verified" | "Issued" | "Expired" | "Pending";

const navItems: Array<[View, string]> = [
  ["Overview", "◈"],
  ["Access passes", "⌁"],
  ["Credentials", "▣"],
  ["Activity", "↗"],
  ["Host console", "◉"],
];

const PASS_DEFINITIONS: Array<{
  id: string;
  name: string;
  type: string;
  accent: "violet" | "cyan" | "green" | "amber";
  detail: string;
  commitment: string;
  members: number;
  requirements: string[];
}> = [
  {
    id: "founders",
    name: "Founders Circle",
    type: "Invitation only",
    accent: "violet",
    detail: "Early product access for the first 500 members.",
    commitment: "m00x…7f3a",
    members: 487,
    requirements: ["Founders invitation credential", "Allowlist commitment m00x…7f3a"],
  },
  {
    id: "research",
    name: "Research sandbox",
    type: "Credential required",
    accent: "cyan",
    detail: "Private experiments, shared learnings.",
    commitment: "m00x…91a2",
    members: 124,
    requirements: ["Builder credential", "Active research agreement"],
  },
  {
    id: "builder",
    name: "Midnight builder house",
    type: "Community pass",
    accent: "green",
    detail: "A quiet room for people building in public.",
    commitment: "m00x…b31c",
    members: 218,
    requirements: ["Eligibility score above 0.62", "Public builder profile"],
  },
  {
    id: "beta",
    name: "Private beta waitlist",
    type: "Application",
    accent: "amber",
    detail: "Your application is held as a commitment.",
    commitment: "m00x…d4f0",
    members: 64,
    requirements: ["Submitted application", "Background commitment"],
  },
];

const ACTIVITY_SEED: Array<{ commitment: string; time: string; type: ActivityKind; state: ActivityState }> = [
  { commitment: "m00x…7f3a", time: "Just now", type: "Eligibility proof", state: "Verified" },
  { commitment: "m00x…1b8e", time: "12 min ago", type: "Access pass", state: "Issued" },
  { commitment: "m00x…a491", time: "Yesterday", type: "Eligibility proof", state: "Verified" },
  { commitment: "m00x…c210", time: "2 days ago", type: "Access pass", state: "Expired" },
  { commitment: "m00x…91a2", time: "2 days ago", type: "Eligibility proof", state: "Verified" },
  { commitment: "m00x…b31c", time: "3 days ago", type: "Access pass", state: "Issued" },
  { commitment: "m00x…d4f0", time: "4 days ago", type: "Allowlist registration", state: "Pending" },
  { commitment: "m00x…3e88", time: "5 days ago", type: "Allowlist registration", state: "Verified" },
];

const CREDENTIAL_LIBRARY: Array<{ name: string; issuer: string; icon: string; description: string }> = [
  { name: "Founders invitation", issuer: "VeilPass community", icon: "✦", description: "Original access token for the first cohort." },
  { name: "Builder credential", issuer: "Midnight Academy", icon: "⌘", description: "Proves completion of the builder track." },
  { name: "Eligibility score", issuer: "Private issuer", icon: "◌", description: "A numeric score that never leaves your wallet." },
  { name: "Research agreement", issuer: "VeilPass labs", icon: "◈", description: "Signed terms enabling private research access." },
];

const DEFAULT_MIDNIGHT_NETWORK_ID = process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK_ID || "preprod";
const MIDNIGHT_WALLET_HINT = process.env.NEXT_PUBLIC_MIDNIGHT_WALLET || "1am";
const MIDNIGHT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_MIDNIGHT_CONTRACT_ADDRESS || "Deployment pending";
const NETWORK_LABEL: Record<"preview" | "preprod", string> = { preview: "PREVIEW", preprod: "PREPROD" };

function shortAddress(address: string) {
  if (!address) return "";
  if (address.length <= 18) return address;
  return `${address.slice(0, 9)}…${address.slice(-7)}`;
}

function randomHex(bytes: number) {
  if (typeof window === "undefined") return "0".repeat(bytes * 2);
  const buffer = new Uint8Array(bytes);
  window.crypto.getRandomValues(buffer);
  return Array.from(buffer, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function findMidnightWallet() {
  const injected = Object.entries(window.midnight ?? {}) as Array<[string, InitialAPI]>;
  return injected.find(([, wallet]) => /1am/i.test(wallet.name) || /1am/i.test(wallet.rdns));
}

function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function localAnswer(message: string) {
  const prompt = message.toLowerCase();
  if (prompt.includes("credential")) return "Your credentials stay in the private witness layer. VeilPass uses them to build a proof, but does not publish the name, issuer, or underlying value.";
  if (prompt.includes("proof") || prompt.includes("work")) return "Connect a wallet, choose a pass, then run a private proof. The circuit checks eligibility and publishes only a valid or invalid result.";
  if (prompt.includes("midnight") || prompt.includes("compact")) return "Midnight is the privacy network underneath VeilPass. The Compact contract keeps witnesses private while making selected ledger state auditable.";
  if (prompt.includes("host") || prompt.includes("register") || prompt.includes("allowlist")) return "Switch to the Host console tab to publish a new allowlist root. The registration is the only public action — the credential checks stay private.";
  if (prompt.includes("1am") || prompt.includes("lace") || prompt.includes("wallet")) return "VeilPass prefers the 1AM wallet on Preview or Preprod. Pick a network with the floating toggle, then connect — you will need tNIGHT and DUST from the matching faucet.";
  if (prompt.includes("pass") || prompt.includes("access")) return "Open Access passes to see every room available to this wallet. Founders Circle is currently verified in this demo.";
  if (prompt.includes("preview") || prompt.includes("preprod") || prompt.includes("network") || prompt.includes("faucet")) return "Use the floating Network toggle to switch between Preview and Preprod. The wallet must be on the same network and funded with tNIGHT plus DUST from the matching faucet.";
  return "I can explain credentials, private proofs, access passes, host console, or how VeilPass uses Midnight. What should we explore?";
}

function SectionHeading({ kicker, title, action }: { kicker: string; title: string; action?: React.ReactNode }) {
  return <div className="section-heading"><div><span className="section-kicker">{kicker}</span><h2>{title}</h2></div>{action}</div>;
}

function ActivityTable({ rows, highlight }: { rows: typeof ACTIVITY_SEED; highlight?: string }) {
  return <div className="activity-panel"><div className="table-head"><span>PUBLIC COMMITMENT</span><span>TYPE</span><span>TIME</span><span>STATUS</span></div>{rows.map((item) => <div className={`activity-row ${item.commitment === highlight ? "highlight" : ""}`} key={`${item.commitment}-${item.time}`}><span className="commitment"><span className="commitment-dot" />{item.commitment}</span><span>{item.type}</span><span>{item.time}</span><span className={`table-status ${item.state.toLowerCase()}`}><i />{item.state}</span></div>)}</div>;
}

export default function Home() {
  const [activeNav, setActiveNav] = useState<View>("Overview");
  const [selectedNetwork, setSelectedNetwork] = useState<"preview" | "preprod">(DEFAULT_MIDNIGHT_NETWORK_ID === "preview" ? "preview" : "preprod");
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletName, setWalletName] = useState("");
  const [walletNetwork, setWalletNetwork] = useState("");
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [walletApi, setWalletApi] = useState<ConnectedAPI | null>(null);
  const [contractAddress, setContractAddress] = useState(MIDNIGHT_CONTRACT_ADDRESS);
  const [deploymentTransactionId, setDeploymentTransactionId] = useState("");
  const [deploymentBusy, setDeploymentBusy] = useState(false);
  const [proofBusy, setProofBusy] = useState(false);
  const [allowlistRegistrationBusy, setAllowlistRegistrationBusy] = useState(false);
  const [allowlistRoot, setAllowlistRoot] = useState("");
  const [allowlistName, setAllowlistName] = useState("Founders Circle · Cohort 04");
  const [passStates, setPassStates] = useState<Record<string, PassState>>(() => ({
    founders: "Ready to prove",
    research: "Ready to prove",
    builder: "Ready to prove",
    beta: "Pending",
  }));
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
  const [chatMode, setChatMode] = useState<"demo" | "gemini">("demo");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "Hey — I’m Veil. Ask me how private proofs, credentials, or access passes work." },
  ]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const filteredActivity = useMemo(() => {
    if (activityFilter === "All activity") return activityLog;
    if (activityFilter === "Proofs") return activityLog.filter((entry) => entry.type === "Eligibility proof" || entry.type === "Allowlist registration");
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

  async function connectWallet(networkId: "preview" | "preprod" | React.MouseEvent<HTMLButtonElement> = selectedNetwork, forceConnect = false): Promise<ConnectedAPI | null> {
    const requestedNetwork = typeof networkId === "string" ? networkId : selectedNetwork;
    if (connected && !forceConnect) {
      setWalletApi(null);
      deployedProofRef.current = null;
      registerAllowlistRef.current = null;
      setWalletAddress("");
      setWalletName("");
      setWalletNetwork("");
      setWalletError("");
      setConnected(false);
      pushNotice("Wallet disconnected");
      return null;
    }

    setWalletBusy(true);
    setWalletError("");
    try {
      const wallet = findMidnightWallet();
      if (!wallet) throw new Error(`1AM wallet was not detected. Install or enable 1AM for ${requestedNetwork}.`);
      if (!wallet[1].apiVersion.startsWith("4.")) {
        throw new Error(`1AM DApp Connector v4 is required; this wallet reports API ${wallet[1].apiVersion}.`);
      }

      const api = await wallet[1].connect(requestedNetwork);
      const [unshielded, shielded, configuration] = await Promise.all([
        api.getUnshieldedAddress(),
        api.getShieldedAddresses(),
        api.getConfiguration(),
      ]);

      if (configuration.networkId !== requestedNetwork) {
        throw new Error(`Wallet is on ${configuration.networkId}; switch it to ${requestedNetwork} before continuing.`);
      }

      const address = unshielded.unshieldedAddress || shielded.shieldedAddress;
      setWalletApi(api);
      setWalletAddress(address);
      setWalletName(wallet[1].name || MIDNIGHT_WALLET_HINT);
      setWalletNetwork(configuration.networkId);
      setConnected(true);
      pushNotice(`Connected to ${wallet[1].name || MIDNIGHT_WALLET_HINT}`);
      return api;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Midnight wallet connection was rejected.";
      setWalletError(message);
      pushNotice("Wallet connection failed");
      return null;
    } finally {
      setWalletBusy(false);
    }
  }
  async function generateProof(pass?: typeof PASS_DEFINITIONS[number]) {
    if (pass) setActivePass(pass);
    const api = walletApi ?? await connectWallet();
    if (api) setShowProof(true);
  }
  async function finishProof() {
    if (!deployedProofRef.current) {
      pushNotice("Deploy VeilPass with this wallet before submitting a live access proof.");
      return;
    }

    setProofBusy(true);
    setWalletError("");
    try {
      await deployedProofRef.current();
      setVerified(true);
      setShowProof(false);
      if (activePass) {
        setPassStates((states) => ({ ...states, [activePass.id]: "Verified" }));
        recordActivity({ commitment: activePass.commitment, type: "Eligibility proof", state: "Verified" });
        recordActivity({ commitment: activePass.commitment, type: "Access pass", state: "Issued" });
      } else {
        recordActivity({ commitment: "m00x…7f3a", type: "Eligibility proof", state: "Verified" });
      }
      setActiveNav("Overview");
      pushNotice(activePass ? `${activePass.name} verified on Midnight.` : "Private access proof finalized on Midnight.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Private access proof failed.";
      setWalletError(message);
      pushNotice("Private proof was not submitted");
    } finally {
      setProofBusy(false);
    }
  }
  async function runPassFlow(pass: typeof PASS_DEFINITIONS[number]) {
    if (passBusyId) return;
    setPassBusyId(pass.id);
    setWalletError("");
    try {
      if (passStates[pass.id] === "Verified") {
        setActivePass(pass);
        setShowProof(true);
        return;
      }
      const api = walletApi ?? await connectWallet();
      if (!api) return;
      setActivePass(pass);
      setShowProof(true);
    } finally {
      setPassBusyId(null);
    }
  }
  async function deployPreviewContract() {
    if (deploymentBusy) return;
    setSelectedNetwork("preview");
    setContractAddress("Deployment pending");
    setDeploymentTransactionId("");
    const api = walletApi && walletNetwork === "preview"
      ? walletApi
      : await connectWallet("preview", true);
    if (!api || deploymentBusy) return;

    setDeploymentBusy(true);
    setWalletError("");
    try {
      const { deployVeilPass } = await import("@/lib/midnight-browser-deploy");
      const deployment = await deployVeilPass(api, "preview");
      deployedProofRef.current = deployment.proveAccess;
      if (deployment.registerAllowlist) registerAllowlistRef.current = deployment.registerAllowlist;
      setContractAddress(deployment.contractAddress);
      setDeploymentTransactionId(deployment.transactionId);
      await navigator.clipboard?.writeText(deployment.contractAddress);
      recordActivity({ commitment: deployment.contractAddress.slice(0, 8) + "…" + deployment.contractAddress.slice(-4), type: "Allowlist registration", state: "Verified" });
      pushNotice("Preview contract finalized. Full address copied to clipboard.");
    } catch (error) {
      const { describePreviewDeploymentError } = await import("@/lib/midnight-browser-deploy");
      setWalletError(describePreviewDeploymentError(error));
      pushNotice("Preview deployment failed");
    } finally {
      setDeploymentBusy(false);
    }
  }
  const deployContractFromWallet = deployPreviewContract;
  async function registerAllowlistRoot() {
    if (!allowlistRoot || allowlistRoot.length !== 64) {
      pushNotice("Allowlist root must be 64 hex characters (32 bytes).");
      return;
    }
    const api = walletApi ?? await connectWallet();
    if (!api) return;

    if (registerAllowlistRef.current) {
      setAllowlistRegistrationBusy(true);
      setWalletError("");
      try {
        await registerAllowlistRef.current(allowlistRoot);
        recordActivity({ commitment: `0x${allowlistRoot.slice(0, 6)}…${allowlistRoot.slice(-4)}`, type: "Allowlist registration", state: "Verified" });
        pushNotice(`Allowlist root registered for ${allowlistName}.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Allowlist registration failed.";
        setWalletError(message);
        pushNotice("Allowlist registration was rejected");
      } finally {
        setAllowlistRegistrationBusy(false);
      }
      return;
    }

    pushNotice("Deploy the Preview contract before publishing an allowlist root. Nothing was submitted.");
  }
  function generateSampleRoot() {
    setAllowlistRoot(randomHex(32));
  }
  function copyAddress() {
    if (!contractAddress || contractAddress === "Deployment pending") return;
    void navigator.clipboard?.writeText(contractAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  function switchNetwork(network: "preview" | "preprod") {
    if (network === selectedNetwork) return;
    setSelectedNetwork(network);
    setWalletApi(null);
    deployedProofRef.current = null;
    registerAllowlistRef.current = null;
    setWalletAddress("");
    setWalletName("");
    setWalletNetwork("");
    setWalletError("");
    setConnected(false);
    setContractAddress("Deployment pending");
    setDeploymentTransactionId("");
    setVerified(false);
    pushNotice(`Switched to ${network}. Reconnect 1AM to continue.`);
  }
  function openView(view: View) { setActiveNav(view); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function importCredential(credential: typeof CREDENTIAL_LIBRARY[number]) {
    if (userCredentials.some((existing) => existing.name === credential.name)) {
      pushNotice(`${credential.name} is already in your vault.`);
      return;
    }
    setUserCredentials((existing) => [...existing, credential]);
    setShowCredentialImport(false);
    pushNotice(`${credential.name} added to your private vault.`);
  }

  async function sendChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text || chatBusy) return;
    const nextMessages = [...chatMessages, { role: "user" as const, text }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatBusy(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: nextMessages, network: selectedNetwork }) });
      const payload = await response.json() as { text?: string; mode?: "demo" | "gemini" };
      if (payload.mode) setChatMode(payload.mode);
      setChatMessages((messages) => [...messages, { role: "assistant", text: payload.text || localAnswer(text) }]);
    } catch {
      setChatMessages((messages) => [...messages, { role: "assistant", text: localAnswer(text) }]);
    } finally { setChatBusy(false); }
  }

  const overview = <>
    <section className="intro-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> PRIVATE ALLOWLIST ACCESS</div><h1>Prove you belong.<br /><em>Keep your name.</em></h1><p className="intro-copy">VeilPass lets you enter private spaces with a zero-knowledge proof of eligibility. Your credential stays yours — only the answer crosses the chain.</p></div><div className="intro-side-note"><span className="side-note-line" /><div><strong>Built for the<br />quietly qualified.</strong><span>Selective disclosure on Midnight.</span></div></div></section>
    <section className="stats-grid" aria-label="Network statistics"><div className="stat-card"><span className="stat-label">Active members</span><strong>12,480</strong><span className="stat-trend">↗ 8.4% <small>this month</small></span></div><div className="stat-card"><span className="stat-label">Personal data exposed</span><strong>0 <small>bytes</small></strong><span className="stat-trend cyan">● protected by default</span></div><div className="stat-card"><span className="stat-label">Average proof time</span><strong>3.2 <small>sec</small></strong><span className="stat-trend neutral">on {NETWORK_LABEL[selectedNetwork].toLowerCase()}</span></div><div className={`stat-card ${contractAddress !== "Deployment pending" ? "accent-stat" : ""}`}><span className="stat-label">Contract status</span><strong><span className="status-light" />{contractAddress !== "Deployment pending" ? "Live" : "Pending"}</strong><span className="stat-trend neutral">{contractAddress !== "Deployment pending" ? "Deployed this session" : "Not yet deployed"}</span></div></section>
    <section className="dashboard-grid"><div className="main-column"><SectionHeading kicker="ACCESS CONSOLE" title="Your private pass" action={<span className="chain-chip"><span className="live-dot" /> {NETWORK_LABEL[selectedNetwork]}</span>} /><div className={`proof-panel ${verified ? "is-verified" : ""}`}><div className="proof-panel-top"><div className="pass-icon" aria-hidden="true">✦</div><div><div className="pass-title">Founders Circle <span className="tiny-lock">⌑</span></div><div className="pass-sub">Private allowlist · invitation only</div></div><span className={`pass-status ${verified ? "verified" : "ready"}`}>{verified ? "Verified" : "Ready to prove"}</span></div><div className="proof-panel-body"><div className="proof-copy"><h3>{verified ? "You are in." : "Unlock access without\nrevealing identity."}</h3><p>{verified ? "Your eligibility proof was accepted. The room is open for this wallet." : "Your credential is checked inside a zero-knowledge circuit. The allowlist sees a valid proof — never your name, score, or source."}</p><button className="primary-button" type="button" onClick={verified ? () => setVerified(false) : () => generateProof()}>{verified ? "Reset demo" : "Generate proof"}<span>↗</span></button></div><div className="proof-visual" aria-label="Zero knowledge proof visualization"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="proof-core"><span className="core-star">✦</span><small>ZK</small></div><span className="orbit-dot dot-one" /><span className="orbit-dot dot-two" /><span className="orbit-dot dot-three" /></div></div><div className="proof-panel-footer"><span><i className="footer-check">✓</i> Circuit ready</span><span><i className="footer-check">✓</i> Witness encrypted</span><span><i className="footer-check">✓</i> Selective disclosure</span></div></div><div className="section-heading activity-heading"><div><span className="section-kicker">PUBLIC LEDGER</span><h2>Recent activity</h2></div><button className="text-button" type="button" onClick={() => openView("Activity")}>View all <span>↗</span></button></div><ActivityTable rows={activityLog.slice(0, 4)} highlight={activePass?.commitment} /></div><PrivacyCard onOpen={() => setShowPrivacy(true)} onCopy={copyAddress} copied={copied} contractAddress={contractAddress} onDeploy={deployContractFromWallet} deploymentBusy={deploymentBusy} selectedNetwork={selectedNetwork} /></section>
  </>;

  const passesView = <section className="view-page"><div className="view-hero"><div><div className="eyebrow"><span className="eyebrow-dot" /> PRIVATE SPACES</div><h1>Access passes</h1><p>Rooms you can enter, without turning your identity into a public record.</p></div><button className="primary-button" type="button" onClick={() => generateProof()}>Prove a pass <span>↗</span></button></div><div className="pass-grid">{PASS_DEFINITIONS.map((pass) => { const state = passStates[pass.id]; const statusClass = state === "Verified" ? "verified" : state === "Pending" ? "pending" : "ready"; return <article className={`pass-card ${pass.accent} ${statusClass}`} key={pass.id}><div className="pass-card-top"><div className="pass-card-icon">{pass.accent === "violet" ? "✦" : pass.accent === "cyan" ? "⌁" : pass.accent === "green" ? "◈" : "◯"}</div><span className={`pass-status ${statusClass}`}>{state}</span></div><h3>{pass.name}</h3><span className="pass-card-type">{pass.type}</span><p>{pass.detail}</p><ul className="pass-requirements">{pass.requirements.map((requirement) => <li key={requirement}><span>✓</span>{requirement}</li>)}</ul><div className="pass-card-stats"><span><b>{pass.members}</b> members</span><span>Commitment <b>{pass.commitment}</b></span></div><div className="pass-card-footer"><button className="text-button" type="button" onClick={() => runPassFlow(pass)} disabled={passBusyId === pass.id}>{passBusyId === pass.id ? "Opening…" : state === "Verified" ? "Re-prove" : state === "Pending" ? "Submit application" : "Open"}<span>↗</span></button></div></article>; })}</div><div className="wide-info-panel"><div className="info-icon">⌑</div><div><span className="section-kicker">THE QUIET RULE</span><h2>Passes prove a claim, not a person.</h2><p>Every pass is tied to a commitment. The commitment can be public while the credential behind it stays private.</p></div><button className="secondary-button" type="button" onClick={() => setShowPrivacy(true)}>See privacy model <span>↗</span></button></div></section>;

  const credentialsView = <section className="view-page"><div className="view-hero"><div><div className="eyebrow"><span className="eyebrow-dot" /> PRIVATE WITNESS VAULT</div><h1>Credentials</h1><p>Your private proofs of eligibility, stored for you — never broadcast.</p></div><button className="secondary-button" type="button" onClick={() => setShowCredentialImport(true)}>+ Add credential</button></div><div className="vault-banner"><div className="vault-lock">⌑</div><div><strong>Private by default</strong><span>These credentials are available to your wallet only. VeilPass can use them to prove a claim without reading them publicly.</span></div><span className="vault-status"><i /> {userCredentials.length} stored</span></div><div className="credential-list">{userCredentials.map((credential) => <article className="credential-card" key={credential.name}><div className="credential-icon">{credential.icon}</div><div className="credential-main"><div className="credential-title"><h3>{credential.name}</h3><span className="mini-tag private-tag">Shielded</span></div><p>Issued by <strong>{credential.issuer}</strong></p><span className="credential-updated">{credential.description}</span></div><button className="icon-button card-more" type="button" aria-label={`Use ${credential.name}`} onClick={() => { setActivePass(PASS_DEFINITIONS[0]); setShowProof(true); }}>•••</button></article>)}</div><div className="credential-steps"><div><span>01</span><strong>Keep your witness local</strong><p>Private data lives with the wallet that owns it.</p></div><div><span>02</span><strong>Choose what to prove</strong><p>One credential can support many selective claims.</p></div><div><span>03</span><strong>Disclose the minimum</strong><p>The public result is all an observer receives.</p></div></div></section>;

  const activityView = <section className="view-page"><div className="view-hero"><div><div className="eyebrow"><span className="eyebrow-dot" /> PUBLIC LEDGER</div><h1>Activity</h1><p>A readable trail of commitments and proof results — with no identity trail attached.</p></div><div className="activity-filter">{(["All activity", "Proofs", "Passes"] as ActivityFilter[]).map((label) => <button key={label} className={activityFilter === label ? "filter-active" : ""} type="button" onClick={() => setActivityFilter(label)}>{label}</button>)}</div></div><div className="activity-summary"><div><span className="stat-label">Total proofs</span><strong>{activityCounts.proofs}</strong></div><div><span className="stat-label">Verified</span><strong className="green-number">{activityLog.filter((entry) => entry.state === "Verified").length}</strong></div><div><span className="stat-label">Public data points</span><strong>02 <small>per proof</small></strong></div><div><span className="stat-label">Private data points</span><strong className="cyan-number">04 <small>shielded</small></strong></div></div><SectionHeading kicker="TRANSACTION HISTORY" title={activityFilter === "All activity" ? "Every public event" : activityFilter === "Proofs" ? "Proofs and registrations" : "Passes issued"} action={<span className="chain-chip"><span className="live-dot" /> Synced {formatTime(new Date())}</span>} /><ActivityTable rows={filteredActivity} highlight={activePass?.commitment} />{filteredActivity.length === 0 && <div className="empty-state"><div className="empty-icon">◌</div><strong>No matching activity</strong><span>This filter has no entries yet. Submit a proof or issue a pass to populate it.</span></div>}<div className="wide-info-panel small-info"><div className="info-icon">◌</div><div><span className="section-kicker">OBSERVER VIEW</span><h2>Transparent enough to verify. Private enough to trust.</h2><p>Public activity proves the system is working. It does not reveal who is behind a commitment.</p></div></div></section>;

  const hostView = <section className="view-page"><div className="view-hero"><div><div className="eyebrow"><span className="eyebrow-dot" /> HOST CONSOLE</div><h1>Publish a private allowlist.</h1><p>Hosts register the public allowlist commitment. Only the commitment is published — credentials and members stay private.</p></div><span className="chain-chip"><span className="live-dot" /> {NETWORK_LABEL[selectedNetwork]}</span></div><div className="host-grid"><div className="host-card"><span className="section-kicker">ALLOWLIST METADATA</span><h3>Define the room</h3><label className="field-label"><span>Allowlist name</span><input className="text-input" value={allowlistName} onChange={(event) => setAllowlistName(event.target.value)} placeholder="Cohort name" /></label><label className="field-label"><span>32-byte commitment (hex)</span><textarea className="text-input hex-input" value={allowlistRoot} onChange={(event) => setAllowlistRoot(event.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 64))} placeholder="64 hex characters" rows={2} spellCheck={false} /><small className="field-help">{allowlistRoot.length} / 64 hex chars</small></label><div className="host-actions"><button className="secondary-button" type="button" onClick={generateSampleRoot}>Generate sample root</button><button className="primary-button" type="button" onClick={registerAllowlistRoot} disabled={allowlistRegistrationBusy}>{allowlistRegistrationBusy ? "Registering…" : "Register allowlist root"}<span>↗</span></button></div></div><div className="host-card"><span className="section-kicker">HOW IT WORKS</span><h3>One public call, many private proofs.</h3><ol className="host-steps"><li><span>01</span><div><strong>Compute a commitment</strong><p>Hash every accepted credential into a 32-byte Merkle root. Members are never listed.</p></div></li><li><span>02</span><div><strong>Register on chain</strong><p>Call <code>register_allowlist_root</code>. The Compact <code>disclose()</code> writes only the root.</p></div></li><li><span>03</span><div><strong>Members prove privately</strong><p>Each member runs <code>prove_access</code> with a private witness — no credential ever leaves the wallet.</p></div></li></ol></div><div className="host-card compact"><span className="section-kicker">CURRENT DEPLOYMENT</span><div className="host-deploy"><strong>{contractAddress}</strong><span>{contractAddress !== "Deployment pending" ? "Allowlist root writes are live on this contract." : "Deploy the contract before publishing a new allowlist."}</span>{contractAddress === "Deployment pending" && <button className="text-button" type="button" onClick={deployContractFromWallet} disabled={deploymentBusy}>{deploymentBusy ? "Deploying…" : "Deploy with connected wallet"}<span>↗</span></button>}</div></div></div></section>;

  return <div className="app-shell">
    <div className="network-toggle" role="group" aria-label="Midnight network">
      <span>Network</span>
      <button type="button" className={selectedNetwork === "preview" ? "active" : ""} aria-pressed={selectedNetwork === "preview"} onClick={() => switchNetwork("preview")}>Preview</button>
      <button type="button" className={selectedNetwork === "preprod" ? "active" : ""} aria-pressed={selectedNetwork === "preprod"} onClick={() => switchNetwork("preprod")}>Preprod</button>
      <button className="preview-deploy-button" type="button" onClick={deployPreviewContract} disabled={deploymentBusy}>{deploymentBusy ? "Deploying…" : "Deploy to Preview"}</button>
    </div>
    {deploymentTransactionId && <div className="deployment-receipt" role="status"><strong>Preview finalized</strong><span>Contract: {contractAddress}</span><span>Transaction ID: {deploymentTransactionId}</span></div>}
    {walletBusy && <div className="wallet-status-banner" role="status"><span className="live-dot" /><strong>Connecting {MIDNIGHT_WALLET_HINT}…</strong><span>Approve the request in your wallet</span></div>}
    {deploymentBusy && <div className="wallet-status-banner" role="status"><span className="live-dot" /><strong>Deploying VeilPass…</strong><span>1AM is creating and submitting the contract transaction</span></div>}
    {allowlistRegistrationBusy && <div className="wallet-status-banner" role="status"><span className="live-dot" /><strong>Registering allowlist…</strong><span>Submitting the new commitment on {NETWORK_LABEL[selectedNetwork]}</span></div>}
    {connected && !walletBusy && !deploymentBusy && !allowlistRegistrationBusy && <div className="wallet-status-banner" role="status"><span className="live-dot" /><strong>{walletName || MIDNIGHT_WALLET_HINT} connected</strong><span>{shortAddress(walletAddress) || "Address pending"}</span><small>{walletNetwork || NETWORK_LABEL[selectedNetwork]}</small></div>}
    {walletError && <div className="wallet-status-banner error" role="alert"><strong>Midnight wallet action unavailable</strong><span>{walletError}</span></div>}
    <aside className="sidebar"><div className="brand-lockup"><div className="brand-mark" aria-hidden="true"><span /></div><div><div className="brand-name">VeilPass</div><div className="brand-meta">MIDNIGHT · {NETWORK_LABEL[selectedNetwork]}</div></div></div><div className="workspace-label">Workspace</div><nav className="primary-nav" aria-label="Primary navigation">{navItems.map(([label, icon]) => <button className={`nav-item ${activeNav === label ? "active" : ""}`} key={label} onClick={() => openView(label)} type="button"><span className="nav-icon" aria-hidden="true">{icon}</span><span>{label}</span>{label === "Access passes" && <span className="nav-count">0{PASS_DEFINITIONS.length}</span>}</button>)}</nav><div className="sidebar-rule" /><div className="workspace-label">Learn</div><nav className="primary-nav" aria-label="Learn navigation"><button className="nav-item" type="button" onClick={() => setShowPrivacy(true)}><span className="nav-icon" aria-hidden="true">?</span><span>How privacy works</span></button><button className="nav-item" type="button" onClick={() => setShowAssistant(true)}><span className="nav-icon" aria-hidden="true">✦</span><span>Ask Veil assistant</span></button><a className="nav-item" href="https://docs.midnight.network/" target="_blank" rel="noreferrer"><span className="nav-icon" aria-hidden="true">↗</span><span>Midnight docs</span></a></nav><div className="sidebar-bottom"><div className="network-card"><div className="network-topline"><span className="live-dot" /> Network live</div><div className="network-name">{NETWORK_LABEL[selectedNetwork]}</div><div className="network-sub">Faucet: <a href={selectedNetwork === "preview" ? "https://midnight-tmnight-preview.nethermind.dev/" : "https://midnight-tmnight-preprod.nethermind.dev/"} target="_blank" rel="noreferrer">tNIGHT + DUST <span>↗</span></a></div></div><div className="user-row"><div className="avatar">VP</div><div className="user-copy"><strong>{connected ? walletName || MIDNIGHT_WALLET_HINT : "your wallet"}</strong><span>{connected ? shortAddress(walletAddress) || "Connected" : "Not connected"}</span></div><button className="more-button" type="button" aria-label="Open wallet menu" onClick={connectWallet}>{connected ? "Disconnect" : "Connect"}</button></div></div></aside>
    <main className="main-content"><header className="topbar"><div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{activeNav}</strong></div><div className="topbar-actions"><button className="icon-button" type="button" aria-label="Open assistant" onClick={() => setShowAssistant(true)}>✦<span className="notification-dot" /></button><button className={`wallet-button ${connected ? "connected" : ""}`} onClick={connectWallet} type="button"><span className="wallet-orb" />{connected ? shortAddress(walletAddress) || "Connected" : "Connect wallet"}</button></div></header><div className="page-content">{activeNav === "Overview" ? overview : activeNav === "Access passes" ? passesView : activeNav === "Credentials" ? credentialsView : activeNav === "Activity" ? activityView : hostView}</div><footer className="site-footer"><span>VEILPASS <i>·</i> A MIDNIGHT DEMO</span><span>Open-source prototype <b>↗</b></span></footer></main>

    <button className={`assistant-launcher ${showAssistant ? "hidden" : ""}`} type="button" onClick={() => setShowAssistant(true)}><span>✦</span><strong>Ask Veil</strong><small>Privacy guide</small></button>
    {showAssistant && <aside className="assistant-drawer" aria-label="Veil assistant"><div className="assistant-header"><div className="assistant-title"><div className="assistant-orb">✦</div><div><strong>Veil assistant</strong><span>{chatMode === "gemini" ? "Live via Gemini" : "Local demo mode (add GEMINI_API_KEY for live)"}</span></div></div><button className="modal-close" type="button" onClick={() => setShowAssistant(false)} aria-label="Close assistant">×</button></div><div className="assistant-messages">{chatMessages.map((message, index) => <div className={`chat-bubble ${message.role}`} key={`${message.role}-${index}`}><span>{message.text}</span></div>)}{chatBusy && <div className="chat-bubble assistant"><span className="typing">Thinking…</span></div>}</div><form className="assistant-form" onSubmit={sendChat}><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask about privacy, 1AM, or Midnight…" aria-label="Ask Veil a question" /><button type="submit" aria-label="Send message" disabled={chatBusy}>↗</button></form><div className="assistant-note">Do not share secrets or private credentials here.</div></aside>}

    {notice && <div className="toast" role="status">✓ {notice}</div>}
    {showProof && <div className="modal-backdrop" role="presentation" onClick={() => setShowProof(false)}><section className="proof-modal" role="dialog" aria-modal="true" aria-labelledby="proof-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setShowProof(false)} aria-label="Close proof dialog">×</button><div className="modal-icon">✦</div><span className="section-kicker">PRIVATE PROOF REQUEST</span><h2 id="proof-title">{activePass ? `Prove ${activePass.name}.` : "Ready to prove your access."}</h2><p>VeilPass will check your private credential locally, then submit a proof that only answers: <strong>“Is this wallet on the allowlist?”</strong></p><div className="modal-steps"><div className="modal-step active"><span>01</span><div><strong>Load private witness</strong><small>Encrypted in your wallet</small></div><i>✓</i></div><div className="modal-step"><span>02</span><div><strong>Run ZK circuit</strong><small>Wallet proving · ~3 sec</small></div><i>○</i></div><div className="modal-step"><span>03</span><div><strong>Disclose validity</strong><small>Only a yes / no reaches chain</small></div><i>○</i></div></div>{activePass && <div className="modal-pass"><span className="section-kicker">SELECTED PASS</span><strong>{activePass.name}</strong><small>{activePass.type} · {activePass.commitment}</small></div>}<button className="primary-button modal-cta" type="button" disabled={proofBusy} onClick={finishProof}>{proofBusy ? "Submitting proof…" : "Run private proof"} <span>↗</span></button><div className="modal-safe"><span>⌑</span> Nothing sensitive leaves this device</div></section></div>}
    {showPrivacy && <div className="modal-backdrop" role="presentation" onClick={() => setShowPrivacy(false)}><section className="privacy-modal" role="dialog" aria-modal="true" aria-labelledby="privacy-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setShowPrivacy(false)} aria-label="Close privacy model">×</button><span className="section-kicker">THE VEILPASS MODEL</span><h2 id="privacy-title">A proof is not a profile.</h2><p>Midnight lets the contract verify a claim without publishing the information that makes the claim true.</p><div className="model-diagram"><div><span className="diagram-icon private-icon">⌑</span><strong>Private witness</strong><small>Credential + secret</small></div><span className="diagram-arrow">→</span><div><span className="diagram-icon circuit-icon">✦</span><strong>ZK circuit</strong><small>Checks the claim</small></div><span className="diagram-arrow">→</span><div><span className="diagram-icon public-icon">◎</span><strong>Public result</strong><small>Valid / invalid</small></div></div><button className="secondary-button" type="button" onClick={() => setShowPrivacy(false)}>Back to console <span>↗</span></button></section></div>}
    {showCredentialImport && <div className="modal-backdrop" role="presentation" onClick={() => setShowCredentialImport(false)}><section className="privacy-modal" role="dialog" aria-modal="true" aria-labelledby="cred-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setShowCredentialImport(false)} aria-label="Close credential import">×</button><span className="section-kicker">ADD CREDENTIAL</span><h2 id="cred-title">Import a private witness.</h2><p>Select a credential template. VeilPass stores the import locally — the credential never leaves the browser.</p><div className="credential-grid">{CREDENTIAL_LIBRARY.map((credential) => { const already = userCredentials.some((existing) => existing.name === credential.name); return <button type="button" key={credential.name} className={`credential-pick ${already ? "is-used" : ""}`} onClick={() => !already && importCredential(credential)} disabled={already}><div className="credential-icon">{credential.icon}</div><strong>{credential.name}</strong><small>Issued by {credential.issuer}</small><p>{credential.description}</p>{already && <span className="mini-tag">In your vault</span>}</button>; })}</div><div className="modal-safe"><span>⌑</span> Nothing sensitive leaves this device</div></section></div>}
  </div>;
}

function PrivacyCard({ onOpen, onCopy, copied, contractAddress, onDeploy, deploymentBusy, selectedNetwork }: { onOpen: () => void; onCopy: () => void; copied: boolean; contractAddress: string; onDeploy: () => void; deploymentBusy: boolean; selectedNetwork: "preview" | "preprod" }) {
  const deployed = contractAddress !== "Deployment pending";
  return <aside className="right-column"><SectionHeading kicker="SELECTIVE DISCLOSURE" title="Privacy model" action={<button className="round-help" onClick={onOpen} type="button" aria-label="Learn about selective disclosure">?</button>} /><div className="privacy-panel"><div className="privacy-intro"><div className="privacy-orb">◌</div><p>Every proof has two layers. The network gets a yes or no. Your story stays with you.</p></div><div className="visibility-block public"><div className="visibility-title"><span className="visibility-mark">◎</span><strong>Publicly visible</strong><span className="visibility-count">02</span></div><div className="visibility-row"><span>Eligibility commitment</span><span className="mini-tag">hashed</span></div><div className="visibility-row"><span>Proof validity</span><span className="mini-tag">yes / no</span></div></div><div className="visibility-block private"><div className="visibility-title"><span className="visibility-mark">⌑</span><strong>Kept private</strong><span className="visibility-count">04</span></div><div className="visibility-row"><span>Your name</span><span className="mini-tag private-tag">hidden</span></div><div className="visibility-row"><span>Credential source</span><span className="mini-tag private-tag">hidden</span></div><div className="visibility-row"><span>Underlying value</span><span className="mini-tag private-tag">hidden</span></div></div><button className="learn-button" onClick={onOpen} type="button">Explore the privacy model <span>↗</span></button></div><div className="contract-card"><div className="contract-head"><span className="section-kicker">LIVE CONTRACT</span><span className="network-pill"><span className="live-dot" />{NETWORK_LABEL[selectedNetwork]}</span></div><div className="contract-name">veil-allowlist.compact</div><div className="contract-address" onClick={onCopy} role="button" tabIndex={0} title="Copy contract address">{copied ? "Copied to clipboard" : contractAddress}<span>{copied ? "✓" : "⧉"}</span></div><div className="contract-meta"><span>Managed circuits <strong>2</strong></span><span>Deployment <strong>{deployed ? "complete" : "pending"}</strong></span></div>{!deployed && <button className="text-button contract-deploy-button" type="button" disabled={deploymentBusy} onClick={onDeploy}>{deploymentBusy ? "Deploying…" : "Deploy with connected wallet"} <span>↗</span></button>}</div></aside>;
}
