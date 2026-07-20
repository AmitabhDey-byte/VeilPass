"use client";

import { useState } from "react";

const navItems = [
  ["Overview", "◈"],
  ["Access passes", "⌁"],
  ["Credentials", "▣"],
  ["Activity", "↗"],
] as const;

const activity = [
  { commitment: "m00x…7f3a", time: "Just now", type: "Eligibility proof", state: "Verified" },
  { commitment: "m00x…1b8e", time: "12 min ago", type: "Access pass", state: "Issued" },
  { commitment: "m00x…a491", time: "Yesterday", type: "Eligibility proof", state: "Verified" },
  { commitment: "m00x…c210", time: "2 days ago", type: "Access pass", state: "Expired" },
] as const;

export default function Home() {
  const [activeNav, setActiveNav] = useState("Overview");
  const [connected, setConnected] = useState(false);
  const [verified, setVerified] = useState(false);
  const [showProof, setShowProof] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [copied, setCopied] = useState(false);

  function connectWallet() {
    setConnected(true);
  }

  function generateProof() {
    if (!connected) {
      connectWallet();
    }
    setShowProof(true);
  }

  function finishProof() {
    setVerified(true);
    setShowProof(false);
  }

  function copyAddress() {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span /></div>
          <div>
            <div className="brand-name">VeilPass</div>
            <div className="brand-meta">MIDNIGHT / PREPROD</div>
          </div>
        </div>

        <div className="workspace-label">Workspace</div>
        <nav className="primary-nav" aria-label="Primary navigation">
          {navItems.map(([label, icon]) => (
            <button
              className={`nav-item ${activeNav === label ? "active" : ""}`}
              key={label}
              onClick={() => setActiveNav(label)}
              type="button"
            >
              <span className="nav-icon" aria-hidden="true">{icon}</span>
              <span>{label}</span>
              {label === "Access passes" && <span className="nav-count">04</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-rule" />
        <div className="workspace-label">Learn</div>
        <nav className="primary-nav" aria-label="Learn navigation">
          <button className="nav-item" type="button" onClick={() => setShowPrivacy(true)}>
            <span className="nav-icon" aria-hidden="true">?</span>
            <span>How privacy works</span>
          </button>
          <a className="nav-item" href="https://docs.midnight.network/" target="_blank" rel="noreferrer">
            <span className="nav-icon" aria-hidden="true">↗</span>
            <span>Midnight docs</span>
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="network-card">
            <div className="network-topline"><span className="live-dot" /> Network live</div>
            <div className="network-name">Preview / Preprod</div>
            <div className="network-sub">Block <span>1,284,902</span></div>
          </div>
          <div className="user-row">
            <div className="avatar">VP</div>
            <div className="user-copy"><strong>your wallet</strong><span>{connected ? "Connected" : "Not connected"}</span></div>
            <button className="more-button" type="button" aria-label="Open wallet menu">•••</button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{activeNav}</strong></div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Open notifications">♢<span className="notification-dot" /></button>
            <button className={`wallet-button ${connected ? "connected" : ""}`} onClick={connectWallet} type="button">
              <span className="wallet-orb" />{connected ? "mn1…91c" : "Connect wallet"}
            </button>
          </div>
        </header>

        <div className="page-content">
          <section className="intro-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> PRIVATE ALLOWLIST ACCESS</div>
              <h1>Prove you belong.<br /><em>Keep your name.</em></h1>
              <p className="intro-copy">VeilPass lets you enter private spaces with a zero-knowledge proof of eligibility. Your credential stays yours — only the answer crosses the chain.</p>
            </div>
            <div className="intro-side-note"><span className="side-note-line" /><div><strong>Built for the<br />quietly qualified.</strong><span>Selective disclosure on Midnight.</span></div></div>
          </section>

          <section className="stats-grid" aria-label="Network statistics">
            <div className="stat-card"><span className="stat-label">Active members</span><strong>12,480</strong><span className="stat-trend">↗ 8.4% <small>this month</small></span></div>
            <div className="stat-card"><span className="stat-label">Personal data exposed</span><strong>0 <small>bytes</small></strong><span className="stat-trend cyan">● protected by default</span></div>
            <div className="stat-card"><span className="stat-label">Average proof time</span><strong>3.2 <small>sec</small></strong><span className="stat-trend neutral">on Preview network</span></div>
            <div className="stat-card accent-stat"><span className="stat-label">Contract status</span><strong><span className="status-light" />Live</strong><span className="stat-trend neutral">Deployed 4d ago</span></div>
          </section>

          <section className="dashboard-grid">
            <div className="main-column">
              <div className="section-heading"><div><span className="section-kicker">ACCESS CONSOLE</span><h2>Your private pass</h2></div><span className="chain-chip"><span className="live-dot" /> Preview / Preprod</span></div>
              <div className={`proof-panel ${verified ? "is-verified" : ""}`}>
                <div className="proof-panel-top"><div className="pass-icon" aria-hidden="true">✦</div><div><div className="pass-title">Founders Circle <span className="tiny-lock">⌑</span></div><div className="pass-sub">Private allowlist · invitation only</div></div><span className={`pass-status ${verified ? "verified" : "ready"}`}>{verified ? "Verified" : "Ready to prove"}</span></div>
                <div className="proof-panel-body">
                  <div className="proof-copy"><h3>{verified ? "You are in." : "Unlock access without\nrevealing identity."}</h3><p>{verified ? "Your eligibility proof was accepted. The room is open for this wallet." : "Your credential is checked inside a zero-knowledge circuit. The allowlist sees a valid proof — never your name, score, or source."}</p><button className="primary-button" type="button" onClick={verified ? () => setVerified(false) : generateProof}>{verified ? "Reset demo" : "Generate proof"}<span>↗</span></button></div>
                  <div className="proof-visual" aria-label="Zero knowledge proof visualization"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="proof-core"><span className="core-star">✦</span><small>ZK</small></div><span className="orbit-dot dot-one" /><span className="orbit-dot dot-two" /><span className="orbit-dot dot-three" /></div>
                </div>
                <div className="proof-panel-footer"><span><i className="footer-check">✓</i> Circuit ready</span><span><i className="footer-check">✓</i> Witness encrypted</span><span><i className="footer-check">✓</i> Selective disclosure</span></div>
              </div>

              <div className="section-heading activity-heading"><div><span className="section-kicker">PUBLIC LEDGER</span><h2>Recent activity</h2></div><button className="text-button" type="button" onClick={() => setActiveNav("Activity")}>View all <span>↗</span></button></div>
              <div className="activity-panel"><div className="table-head"><span>PUBLIC COMMITMENT</span><span>TYPE</span><span>TIME</span><span>STATUS</span></div>{activity.map((item, index) => <div className={`activity-row ${index === 0 && verified ? "highlight" : ""}`} key={item.commitment}><span className="commitment"><span className="commitment-dot" />{item.commitment}</span><span>{item.type}</span><span>{index === 0 && verified ? "Just now" : item.time}</span><span className={`table-status ${item.state.toLowerCase()}`}><i />{item.state}</span></div>)}</div>
            </div>

            <aside className="right-column">
              <div className="section-heading"><div><span className="section-kicker">SELECTIVE DISCLOSURE</span><h2>Privacy model</h2></div><button className="round-help" onClick={() => setShowPrivacy(true)} type="button" aria-label="Learn about selective disclosure">?</button></div>
              <div className="privacy-panel"><div className="privacy-intro"><div className="privacy-orb">◌</div><p>Every proof has two layers. The network gets a yes or no. Your story stays with you.</p></div><div className="visibility-block public"><div className="visibility-title"><span className="visibility-mark">◎</span><strong>Publicly visible</strong><span className="visibility-count">02</span></div><div className="visibility-row"><span>Eligibility commitment</span><span className="mini-tag">hashed</span></div><div className="visibility-row"><span>Proof validity</span><span className="mini-tag">yes / no</span></div></div><div className="visibility-block private"><div className="visibility-title"><span className="visibility-mark">⌑</span><strong>Kept private</strong><span className="visibility-count">04</span></div><div className="visibility-row"><span>Your name</span><span className="mini-tag private-tag">hidden</span></div><div className="visibility-row"><span>Credential source</span><span className="mini-tag private-tag">hidden</span></div><div className="visibility-row"><span>Underlying value</span><span className="mini-tag private-tag">hidden</span></div></div><button className="learn-button" onClick={() => setShowPrivacy(true)} type="button">Explore the privacy model <span>↗</span></button></div>

              <div className="contract-card"><div className="contract-head"><span className="section-kicker">LIVE CONTRACT</span><span className="network-pill"><span className="live-dot" />Preview</span></div><div className="contract-name">veil-allowlist.compact</div><div className="contract-address" onClick={copyAddress} role="button" tabIndex={0} title="Copy contract address">{copied ? "Copied to clipboard" : "addr_test1vz0…3a8f92c"}<span>{copied ? "✓" : "⧉"}</span></div><div className="contract-meta"><span>Managed circuits <strong>3</strong></span><span>Last deploy <strong>4d ago</strong></span></div></div>
            </aside>
          </section>
        </div>
        <footer className="site-footer"><span>VEILPASS <i>·</i> A MIDNIGHT DEMO</span><span>Open-source prototype <b>↗</b></span></footer>
      </main>

      {showProof && <div className="modal-backdrop" role="presentation" onClick={() => setShowProof(false)}><section className="proof-modal" role="dialog" aria-modal="true" aria-labelledby="proof-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setShowProof(false)} aria-label="Close proof dialog">×</button><div className="modal-icon">✦</div><span className="section-kicker">PRIVATE PROOF REQUEST</span><h2 id="proof-title">Ready to prove your access.</h2><p>VeilPass will check your private credential locally, then submit a proof that only answers: <strong>“Is this wallet on the allowlist?”</strong></p><div className="modal-steps"><div className="modal-step active"><span>01</span><div><strong>Load private witness</strong><small>Encrypted in your wallet</small></div><i>✓</i></div><div className="modal-step"><span>02</span><div><strong>Run ZK circuit</strong><small>Proving server · ~3 sec</small></div><i>○</i></div><div className="modal-step"><span>03</span><div><strong>Disclose validity</strong><small>Only a yes / no reaches chain</small></div><i>○</i></div></div><button className="primary-button modal-cta" type="button" onClick={finishProof}>Run private proof <span>↗</span></button><div className="modal-safe"><span>⌑</span> Nothing sensitive leaves this device</div></section></div>}

      {showPrivacy && <div className="modal-backdrop" role="presentation" onClick={() => setShowPrivacy(false)}><section className="privacy-modal" role="dialog" aria-modal="true" aria-labelledby="privacy-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setShowPrivacy(false)} aria-label="Close privacy model">×</button><span className="section-kicker">THE VEILPASS MODEL</span><h2 id="privacy-title">A proof is not a profile.</h2><p>Midnight lets the contract verify a claim without publishing the information that makes the claim true.</p><div className="model-diagram"><div><span className="diagram-icon private-icon">⌑</span><strong>Private witness</strong><small>Credential + secret</small></div><span className="diagram-arrow">→</span><div><span className="diagram-icon circuit-icon">✦</span><strong>ZK circuit</strong><small>Checks the claim</small></div><span className="diagram-arrow">→</span><div><span className="diagram-icon public-icon">◎</span><strong>Public result</strong><small>Valid / invalid</small></div></div><button className="secondary-button" type="button" onClick={() => setShowPrivacy(false)}>Back to console <span>↗</span></button></section></div>}
    </div>
  );
}
