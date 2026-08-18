# VeilPass — Fuji Calm product design system

## Product and jobs

VeilPass is a Midnight private allowlist-access dApp. A member proves they belong to a group without revealing their identity, credential, or underlying eligibility data. A host publishes only an allowlist commitment; the browser-side 1AM wallet requests proof, approval, and transaction signing. The core jobs are: connect the correct wallet/network, understand the public/private boundary, complete a proof with confidence, inspect a receipt, and register an allowlist root safely.

## Existing information architecture to preserve

- Overview: proof launch, network/wallet readiness, contract snapshot, activity.
- Access passes: discover a pass and begin a private proof.
- Credentials: understand and manage locally held witnesses.
- Activity: public commitments and results without identity data.
- Host console: initialize/register an allowlist root.
- Persistent: wallet connection, Preview/Preprod selector, proof/deployment status, Veil assistant.

## Target visual direction: Fuji morning

Create the emotional effect of looking at Mount Fuji across a still lake: spacious, quiet, clean, trustworthy, and softly illuminated. Avoid dark cyberpunk, neon, and decorative Japanese stereotypes. Use calm layers, paper-like surfaces, and restrained visual metaphor; a subtle mountain or horizon contour is acceptable as an abstract background detail, never as a kitschy illustration.

## Target tokens

- Canvas: `#F5F7F4` snow mist; elevated surface `#FFFFFF`; quiet surface `#ECF1EF`.
- Ink: `#19313A` deep blue-slate; supporting text `#62747B`; muted `#88979A`.
- Fuji indigo: `#315C72`; lake blue: `#A9D0DC`; cedar: `#4E8072`; sakura trace: `#E8C8C4`; warm paper line: `#D8E0DC`.
- Success: `#28745E`; warning: `#AA713B`; error: `#B34E55`.
- Type: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`; no decorative or serif additions. Display type has modest tracking and a clear 42–56px desktop scale; body 14–16px; labels 11–12px.
- Spacing: 4, 8, 12, 16, 24, 32, 48, 64px.
- Shape: 12px small card radius, 18px feature-card radius, pill only for status/filter controls. Fine 1px borders in `#D8E0DC`; sparse shadows `0 12px 32px rgba(32, 58, 67, .08)`.
- Layout: desktop sidebar can become an airy rail or compact top navigation; mobile must have clear touch targets and a non-obstructive network/status control.
- Motion: short 160–220ms opacity/translate transitions; no flashing, bouncing, or large ambient animation. Respect reduced motion.

## UX and safety requirements

- Never imply a proof/deployment succeeded until the wallet transaction actually finalizes.
- Keep full contract address and transaction ID copyable; abbreviate only in dense UI.
- Clearly distinguish Preview (live deployment supported) from Preprod (connection/status only unless real deployment support is added).
- Make wallet readiness visible: correct network, 1AM availability, DUST/proving/indexer errors.
- Explain public versus private data in simple, precise language. Do not ask for seed phrases, API keys, or raw credentials.
- Preserve the existing real browser-wallet architecture; Vercel hosts the frontend only.
