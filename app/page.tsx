"use client";

import { FormEvent, useState } from "react";

type View = "Overview" | "Access passes" | "Credentials" | "Activity";
type ChatMessage = { role: "user" | "assistant"; text: string };

const navItems: Array<[View, string]> = [
  ["Overview", "◈"],
  ["Access passes", "⌁"],
  ["Credentials", "▣"],
  ["Activity", "↗"],
];

const activity = [
  { commitment: "m00x…7f3a", time: "Just now", type: "Eligibility proof", state: "Verified" },
  { commitment: "m00x…1b8e", time: "12 min ago", type: "Access pass", state: "Issued" },
  { commitment: "m00x…a491", time: "Yesterday", type: "Eligibility proof", state: "Verified" },
  { commitment: "m00x…c210", time: "2 days ago", type: "Access pass", state: "Expired" },
] as const;

const passes = [
  { name: "Founders Circle", type: "Invitation only", state: "Verified", accent: "violet", detail: "Early product access for the first 500 members." },
  { name: "Research sandbox", type: "Credential required", state: "Ready to prove", accent: "cyan", detail: "Private experiments, shared learnings." },
  { name: "Midnight builder house", type: "Community pass", state: "Issued", accent: "green", detail: "A quiet room for people building in public." },
  { name: "Private beta waitlist", type: "Application", state: "Pending", accent: "amber", detail: "Your application is held as a commitment." },
] as const;

const credentials = [
  { name: "Founders invitation", issuer: "VeilPass community", status: "Available", updated: "Updated 12 min ago", icon: "✦" },
  { name: "Builder credential", issuer: "Midnight Academy", status: "Available", updated: "Updated yesterday", icon: "⌘" },
  { name: "Eligibility score", issuer: "Private issuer", status: "Shielded", updated: "Never disclosed", icon: "◌" },
] as const;

function localAnswer(message: string) {
  const prompt = message.toLowerCase();
  if (prompt.includes("credential")) return "Your credentials stay in the private witness layer. VeilPass uses them to build a proof, but does not publish the name, issuer, or underlying value.";
  if (prompt.includes("proof") || prompt.includes("work")) return "Connect a wallet, choose a pass, then run a private proof. The circuit checks eligibility and publishes only a valid or invalid result.";
  if (prompt.includes("midnight") || prompt.includes("compact")) return "Midnight is the privacy network underneath VeilPass. The Compact contract keeps witnesses private while making selected ledger state auditable.";
  if (prompt.includes("pass") || prompt.includes("access")) return "Open Access passes to see every room available to this wallet. Founders Circle is currently verified in this demo.";
  return "I can explain credentials, private proofs, access passes, or how VeilPass uses Midnight. What should we explore?";
}

function SectionHeading({ kicker, title, action }: { kicker: string; title: string; action?: React.ReactNode }) {
  return <div className="section-heading"><div><span className="section-kicker">{kicker}</span><h2>{title}</h2></div>{action}</div>;
}

function ActivityTable({ compact = false }: { compact?: boolean }) {
  const rows = compact ? activity.slice(0, 4) : activity;
  return <div className="activity-panel"><div className="table-head"><span>PUBLIC COMMITMENT</span><span>TYPE</span><span>TIME</span><span>STATUS</span></div>{rows.map((item) => <div className="activity-row" key={item.commitment}><span className="commitment"><span className="commitment-dot" />{item.commitment}</span><span>{item.type}</span><span>{item.time}</span><span className={`table-status ${item.state.toLowerCase()}`}><i />{item.state}</span></div>)}</div>;
}

export default function Home() {
  const [activeNav, setActiveNav] = useState<View>("Overview");
  const [connected, setConnected] = useState(false);
  const [verified, setVerified] = useState(false);
  const [showProof, setShowProof] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "Hey — I’m Veil. Ask me how private proofs, credentials, or access passes work." },
  ]);

  function connectWallet() { setConnected(true); setNotice("Wallet connected in demo mode"); window.setTimeout(() => setNotice(""), 2200); }
  function generateProof() { if (!connected) connectWallet(); setShowProof(true); }
  function finishProof() { setVerified(true); setShowProof(false); setActiveNav("Overview"); }
  function copyAddress() { setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
  function openView(view: View) { setActiveNav(view); window.scrollTo({ top: 0, behavior: "smooth" }); }

  async function sendChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text || chatBusy) return;
    const nextMessages = [...chatMessages, { role: "user" as const, text }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatBusy(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: nextMessages }) });
      const payload = await response.json() as { text?: string };
      setChatMessages((messages) => [...messages, { role: "assistant", text: payload.text || localAnswer(text) }]);
    } catch {
      setChatMessages((messages) => [...messages, { role: "assistant", text: localAnswer(text) }]);
    } finally { setChatBusy(false); }
  }

  const overview = <>
    <section className="intro-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> PRIVATE ALLOWLIST ACCESS</div><h1>Prove you belong.<br /><em>Keep your name.</em></h1><p className="intro-copy">VeilPass lets you enter private spaces with a zero-knowledge proof of eligibility. Your credential stays yours — only the answer crosses the chain.</p></div><div className="intro-side-note"><span className="side-note-line" /><div><strong>Built for the<br />quietly qualified.</strong><span>Selective disclosure on Midnight.</span></div></div></section>
    <section className="stats-grid" aria-label="Network statistics"><div className="stat-card"><span className="stat-label">Active members</span><strong>12,480</strong><span className="stat-trend">↗ 8.4% <small>this month</small></span></div><div className="stat-card"><span className="stat-label">Personal data exposed</span><strong>0 <small>bytes</small></strong><span className="stat-trend cyan">● protected by default</span></div><div className="stat-card"><span className="stat-label">Average proof time</span><strong>3.2 <small>sec</small></strong><span className="stat-trend neutral">on Preview network</span></div><div className="stat-card accent-stat"><span className="stat-label">Contract status</span><strong><span className="status-light" />Live</strong><span className="stat-trend neutral">Deployed 4d ago</span></div></section>
    <section className="dashboard-grid"><div className="main-column"><SectionHeading kicker="ACCESS CONSOLE" title="Your private pass" action={<span className="chain-chip"><span className="live-dot" /> Preview / Preprod</span>} /><div className={`proof-panel ${verified ? "is-verified" : ""}`}><div className="proof-panel-top"><div className="pass-icon" aria-hidden="true">✦</div><div><div className="pass-title">Founders Circle <span className="tiny-lock">⌑</span></div><div className="pass-sub">Private allowlist · invitation only</div></div><span className={`pass-status ${verified ? "verified" : "ready"}`}>{verified ? "Verified" : "Ready to prove"}</span></div><div className="proof-panel-body"><div className="proof-copy"><h3>{verified ? "You are in." : "Unlock access without\nrevealing identity."}</h3><p>{verified ? "Your eligibility proof was accepted. The room is open for this wallet." : "Your credential is checked inside a zero-knowledge circuit. The allowlist sees a valid proof — never your name, score, or source."}</p><button className="primary-button" type="button" onClick={verified ? () => setVerified(false) : generateProof}>{verified ? "Reset demo" : "Generate proof"}<span>↗</span></button></div><div className="proof-visual" aria-label="Zero knowledge proof visualization"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="proof-core"><span className="core-star">✦</span><small>ZK</small></div><span className="orbit-dot dot-one" /><span className="orbit-dot dot-two" /><span className="orbit-dot dot-three" /></div></div><div className="proof-panel-footer"><span><i className="footer-check">✓</i> Circuit ready</span><span><i className="footer-check">✓</i> Witness encrypted</span><span><i className="footer-check">✓</i> Selective disclosure</span></div></div><div className="section-heading activity-heading"><div><span className="section-kicker">PUBLIC LEDGER</span><h2>Recent activity</h2></div><button className="text-button" type="button" onClick={() => openView("Activity")}>View all <span>↗</span></button></div><ActivityTable compact /></div><PrivacyCard onOpen={() => setShowPrivacy(true)} onCopy={copyAddress} copied={copied} /></section>
  </>;

  const passesView = <section className="view-page"><div className="view-hero"><div><div className="eyebrow"><span className="eyebrow-dot" /> PRIVATE SPACES</div><h1>Access passes</h1><p>Rooms you can enter, without turning your identity into a public record.</p></div><button className="primary-button" type="button" onClick={generateProof}>Prove a pass <span>↗</span></button></div><div className="pass-grid">{passes.map((pass) => <article className={`pass-card ${pass.accent}`} key={pass.name}><div className="pass-card-top"><div className="pass-card-icon">✦</div><span className={`pass-status ${pass.state === "Verified" ? "verified" : "ready"}`}>{pass.state}</span></div><h3>{pass.name}</h3><span className="pass-card-type">{pass.type}</span><p>{pass.detail}</p><div className="pass-card-footer"><span>Commitment <b>m00x…7f3a</b></span><button className="text-button" type="button" onClick={generateProof}>Open <span>↗</span></button></div></article>)}</div><div className="wide-info-panel"><div className="info-icon">⌑</div><div><span className="section-kicker">THE QUIET RULE</span><h2>Passes prove a claim, not a person.</h2><p>Every pass is tied to a commitment. The commitment can be public while the credential behind it stays private.</p></div><button className="secondary-button" type="button" onClick={() => setShowPrivacy(true)}>See privacy model <span>↗</span></button></div></section>;

  const credentialsView = <section className="view-page"><div className="view-hero"><div><div className="eyebrow"><span className="eyebrow-dot" /> PRIVATE WITNESS VAULT</div><h1>Credentials</h1><p>Your private proofs of eligibility, stored for you — never broadcast.</p></div><button className="secondary-button" type="button" onClick={() => setNotice("Credential import is coming soon")}>+ Add credential</button></div><div className="vault-banner"><div className="vault-lock">⌑</div><div><strong>Private by default</strong><span>These credentials are available to your wallet only. VeilPass can use them to prove a claim without reading them publicly.</span></div><span className="vault-status"><i /> Encrypted</span></div><div className="credential-list">{credentials.map((credential) => <article className="credential-card" key={credential.name}><div className="credential-icon">{credential.icon}</div><div className="credential-main"><div className="credential-title"><h3>{credential.name}</h3><span className="mini-tag private-tag">{credential.status}</span></div><p>Issued by <strong>{credential.issuer}</strong></p><span className="credential-updated">{credential.updated}</span></div><button className="icon-button card-more" type="button" aria-label={`Open ${credential.name}`}>•••</button></article>)}</div><div className="credential-steps"><div><span>01</span><strong>Keep your witness local</strong><p>Private data lives with the wallet that owns it.</p></div><div><span>02</span><strong>Choose what to prove</strong><p>One credential can support many selective claims.</p></div><div><span>03</span><strong>Disclose the minimum</strong><p>The public result is all an observer receives.</p></div></div></section>;

  const activityView = <section className="view-page"><div className="view-hero"><div><div className="eyebrow"><span className="eyebrow-dot" /> PUBLIC LEDGER</div><h1>Activity</h1><p>A readable trail of commitments and proof results — with no identity trail attached.</p></div><div className="activity-filter"><button className="filter-active" type="button">All activity</button><button type="button">Proofs</button><button type="button">Passes</button></div></div><div className="activity-summary"><div><span className="stat-label">Total proofs</span><strong>1,284</strong></div><div><span className="stat-label">Verified</span><strong className="green-number">1,201</strong></div><div><span className="stat-label">Public data points</span><strong>02 <small>per proof</small></strong></div><div><span className="stat-label">Private data points</span><strong className="cyan-number">04 <small>shielded</small></strong></div></div><SectionHeading kicker="TRANSACTION HISTORY" title="Every public event" action={<span className="chain-chip"><span className="live-dot" /> Synced just now</span>} /><ActivityTable /><div className="wide-info-panel small-info"><div className="info-icon">◌</div><div><span className="section-kicker">OBSERVER VIEW</span><h2>Transparent enough to verify. Private enough to trust.</h2><p>Public activity proves the system is working. It does not reveal who is behind a commitment.</p></div></div></section>;

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand-lockup"><div className="brand-mark" aria-hidden="true"><span /></div><div><div className="brand-name">VeilPass</div><div className="brand-meta">MIDNIGHT / PREPROD</div></div></div><div className="workspace-label">Workspace</div><nav className="primary-nav" aria-label="Primary navigation">{navItems.map(([label, icon]) => <button className={`nav-item ${activeNav === label ? "active" : ""}`} key={label} onClick={() => openView(label)} type="button"><span className="nav-icon" aria-hidden="true">{icon}</span><span>{label}</span>{label === "Access passes" && <span className="nav-count">04</span>}</button>)}</nav><div className="sidebar-rule" /><div className="workspace-label">Learn</div><nav className="primary-nav" aria-label="Learn navigation"><button className="nav-item" type="button" onClick={() => setShowPrivacy(true)}><span className="nav-icon" aria-hidden="true">?</span><span>How privacy works</span></button><button className="nav-item" type="button" onClick={() => setShowAssistant(true)}><span className="nav-icon" aria-hidden="true">✦</span><span>Ask Veil assistant</span></button><a className="nav-item" href="https://docs.midnight.network/" target="_blank" rel="noreferrer"><span className="nav-icon" aria-hidden="true">↗</span><span>Midnight docs</span></a></nav><div className="sidebar-bottom"><div className="network-card"><div className="network-topline"><span className="live-dot" /> Network live</div><div className="network-name">Preview / Preprod</div><div className="network-sub">Block <span>1,284,902</span></div></div><div className="user-row"><div className="avatar">VP</div><div className="user-copy"><strong>your wallet</strong><span>{connected ? "Connected" : "Not connected"}</span></div><button className="more-button" type="button" aria-label="Open wallet menu">•••</button></div></div></aside>
    <main className="main-content"><header className="topbar"><div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{activeNav}</strong></div><div className="topbar-actions"><button className="icon-button" type="button" aria-label="Open assistant" onClick={() => setShowAssistant(true)}>✦<span className="notification-dot" /></button><button className={`wallet-button ${connected ? "connected" : ""}`} onClick={connectWallet} type="button"><span className="wallet-orb" />{connected ? "mn1…91c" : "Connect wallet"}</button></div></header><div className="page-content">{activeNav === "Overview" ? overview : activeNav === "Access passes" ? passesView : activeNav === "Credentials" ? credentialsView : activityView}</div><footer className="site-footer"><span>VEILPASS <i>·</i> A MIDNIGHT DEMO</span><span>Open-source prototype <b>↗</b></span></footer></main>

    <button className={`assistant-launcher ${showAssistant ? "hidden" : ""}`} type="button" onClick={() => setShowAssistant(true)}><span>✦</span><strong>Ask Veil</strong><small>Privacy guide</small></button>
    {showAssistant && <aside className="assistant-drawer" aria-label="Veil assistant"><div className="assistant-header"><div className="assistant-title"><div className="assistant-orb">✦</div><div><strong>Veil assistant</strong><span>Powered by Gemini when connected</span></div></div><button className="modal-close" type="button" onClick={() => setShowAssistant(false)} aria-label="Close assistant">×</button></div><div className="assistant-messages">{chatMessages.map((message, index) => <div className={`chat-bubble ${message.role}`} key={`${message.role}-${index}`}><span>{message.text}</span></div>)}{chatBusy && <div className="chat-bubble assistant"><span className="typing">Thinking…</span></div>}</div><form className="assistant-form" onSubmit={sendChat}><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask about privacy…" aria-label="Ask Veil a question" /><button type="submit" aria-label="Send message">↗</button></form><div className="assistant-note">Do not share secrets or private credentials here.</div></aside>}

    {notice && <div className="toast" role="status">✓ {notice}</div>}
    {showProof && <div className="modal-backdrop" role="presentation" onClick={() => setShowProof(false)}><section className="proof-modal" role="dialog" aria-modal="true" aria-labelledby="proof-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setShowProof(false)} aria-label="Close proof dialog">×</button><div className="modal-icon">✦</div><span className="section-kicker">PRIVATE PROOF REQUEST</span><h2 id="proof-title">Ready to prove your access.</h2><p>VeilPass will check your private credential locally, then submit a proof that only answers: <strong>“Is this wallet on the allowlist?”</strong></p><div className="modal-steps"><div className="modal-step active"><span>01</span><div><strong>Load private witness</strong><small>Encrypted in your wallet</small></div><i>✓</i></div><div className="modal-step"><span>02</span><div><strong>Run ZK circuit</strong><small>Proving server · ~3 sec</small></div><i>○</i></div><div className="modal-step"><span>03</span><div><strong>Disclose validity</strong><small>Only a yes / no reaches chain</small></div><i>○</i></div></div><button className="primary-button modal-cta" type="button" onClick={finishProof}>Run private proof <span>↗</span></button><div className="modal-safe"><span>⌑</span> Nothing sensitive leaves this device</div></section></div>}
    {showPrivacy && <div className="modal-backdrop" role="presentation" onClick={() => setShowPrivacy(false)}><section className="privacy-modal" role="dialog" aria-modal="true" aria-labelledby="privacy-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setShowPrivacy(false)} aria-label="Close privacy model">×</button><span className="section-kicker">THE VEILPASS MODEL</span><h2 id="privacy-title">A proof is not a profile.</h2><p>Midnight lets the contract verify a claim without publishing the information that makes the claim true.</p><div className="model-diagram"><div><span className="diagram-icon private-icon">⌑</span><strong>Private witness</strong><small>Credential + secret</small></div><span className="diagram-arrow">→</span><div><span className="diagram-icon circuit-icon">✦</span><strong>ZK circuit</strong><small>Checks the claim</small></div><span className="diagram-arrow">→</span><div><span className="diagram-icon public-icon">◎</span><strong>Public result</strong><small>Valid / invalid</small></div></div><button className="secondary-button" type="button" onClick={() => setShowPrivacy(false)}>Back to console <span>↗</span></button></section></div>}
  </div>;
}

function PrivacyCard({ onOpen, onCopy, copied }: { onOpen: () => void; onCopy: () => void; copied: boolean }) {
  return <aside className="right-column"><SectionHeading kicker="SELECTIVE DISCLOSURE" title="Privacy model" action={<button className="round-help" onClick={onOpen} type="button" aria-label="Learn about selective disclosure">?</button>} /><div className="privacy-panel"><div className="privacy-intro"><div className="privacy-orb">◌</div><p>Every proof has two layers. The network gets a yes or no. Your story stays with you.</p></div><div className="visibility-block public"><div className="visibility-title"><span className="visibility-mark">◎</span><strong>Publicly visible</strong><span className="visibility-count">02</span></div><div className="visibility-row"><span>Eligibility commitment</span><span className="mini-tag">hashed</span></div><div className="visibility-row"><span>Proof validity</span><span className="mini-tag">yes / no</span></div></div><div className="visibility-block private"><div className="visibility-title"><span className="visibility-mark">⌑</span><strong>Kept private</strong><span className="visibility-count">04</span></div><div className="visibility-row"><span>Your name</span><span className="mini-tag private-tag">hidden</span></div><div className="visibility-row"><span>Credential source</span><span className="mini-tag private-tag">hidden</span></div><div className="visibility-row"><span>Underlying value</span><span className="mini-tag private-tag">hidden</span></div></div><button className="learn-button" onClick={onOpen} type="button">Explore the privacy model <span>↗</span></button></div><div className="contract-card"><div className="contract-head"><span className="section-kicker">LIVE CONTRACT</span><span className="network-pill"><span className="live-dot" />Preview</span></div><div className="contract-name">veil-allowlist.compact</div><div className="contract-address" onClick={onCopy} role="button" tabIndex={0} title="Copy contract address">{copied ? "Copied to clipboard" : "addr_test1vz0…3a8f92c"}<span>{copied ? "✓" : "⧉"}</span></div><div className="contract-meta"><span>Managed circuits <strong>3</strong></span><span>Last deploy <strong>4d ago</strong></span></div></div></aside>;
}
