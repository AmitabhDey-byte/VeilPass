# VeilPass

> Prove you belong. Keep your name.

## Product X profile

Follow VeilPass on X: [@ngdsemtfb](https://x.com/ngdsemtfb)

VeilPass is a privacy-first allowlist-access dApp built for Midnight. A member can prove eligibility for a private space without publishing their name, credential issuer, or the value behind the claim.

## Product proposal

**Private Allowlist Access** — VeilPass is a governed access layer for invite-only communities, product betas, and events. A host commits a Merkle membership root, capacity, and expiry while members retain their credential, authentication path, and nullifier secret. A successful proof consumes a policy-scoped nullifier and issues a revocable receipt without publishing the member list.

### Governed contract capabilities

- Private Merkle membership proofs against a public policy root.
- Replay protection through epoch-scoped nullifiers.
- Domain-separated pass receipts that can be validated or revoked.
- Enforced issuance capacity and block-time expiry.
- Administrator-authenticated rotation, pause, resume, transfer, and revocation.
- Epoch rotation so a new policy does not reuse the previous nullifier domain.

## Repository contents

- `app/` — responsive VeilPass console with wallet flows, access views, a context-aware copilot, and a four-agent privacy intelligence workspace.
- `lib/ai/` — privacy-safe AI contracts, secret redaction, score normalization, and a structured Gemini client with timeouts and local fallback support.
- `contracts/veil-allowlist.compact` — governed Compact access contract with Merkle membership, nullifiers, receipts, capacity, expiry, pause/resume, and revocation.
- `managed/veil-allowlist/` — generated contract binding, circuits, proving/verifying keys, and ZKIR output. This is the single checked-in source of proof artifacts; the Vercel build copies the required browser assets into `public/` automatically.
- `public/keys/` and `public/zkir/` — browser-served proof assets for the connected wallet.
- `tests/contract-security.test.mjs` — executable assertions for administrative authentication, membership, replay prevention, policy limits, and revocation.
- `tests/policy-utilities.test.mjs` — deterministic Merkle policy and boundary-validation tests.
- `.github/workflows/` — separate application CI and reproducible Compact integrity workflows.

## Privacy model

### An observer can learn

- The public Merkle root, policy epoch, capacity, expiry, and active/paused state.
- Used nullifiers and issued/revoked pass IDs, which are domain-separated commitments rather than identities.
- The number of accepted proofs in the active policy.
- Public transaction metadata and timestamps.

### An observer cannot learn

- A member's name or wallet-to-identity mapping from the proof alone.
- Credential issuer or underlying eligibility value.
- The private witness that satisfied the circuit.

The administrator secret, member credential commitment, Merkle authentication path, and nullifier secret are private witnesses. `disclose()` is applied only at the explicit public-state boundary: policy configuration, consumed nullifiers, receipt IDs, and boolean validation results.

## Local development

```bash
npm ci
npm run dev
```

The interface is explorable without a wallet. The **Connect wallet** action uses the Midnight DApp Connector API with **1AM** on either Preview or Preprod. Use the in-app network toggle before connecting.

Copy `.env.example` to `.env.local` for local configuration:

```text
NEXT_PUBLIC_MIDNIGHT_NETWORK_ID=preprod
NEXT_PUBLIC_MIDNIGHT_WALLET=1am
NEXT_PUBLIC_MIDNIGHT_CONTRACT_ADDRESS=
NEXT_PUBLIC_MIDNIGHT_PREVIEW_CONTRACT_ADDRESS=
NEXT_PUBLIC_MIDNIGHT_PREPROD_CONTRACT_ADDRESS=
GEMINI_API_KEY=your_optional_server_side_key
GEMINI_MODEL=gemini-2.5-flash
```

`GEMINI_API_KEY` is optional and is used only by server-side AI routes; it is never exposed in browser code.

## Privacy intelligence pipelines

Open **Privacy intelligence** in the app to use four specialized pipelines:

1. **Threat scan** — scores wallet, network, contract, credential, and proof readiness and returns evidence-backed findings.
2. **Policy compiler** — converts a plain-language access goal into public signals, private signals, risk notes, retention guidance, and a deterministic 32-byte commitment that can be staged in the Host console.
3. **Disclosure planner** — compares pass requirements with local credential labels and recommends the smallest safe public proof surface.
4. **Ledger analyst** — summarizes aggregate event patterns without sending commitments, wallet addresses, or private witnesses.

The Veil copilot also receives minimized UI context so its next-step guidance reflects the selected network and current proof journey.

### AI safety boundary

- AI routes receive booleans, counts, event types, policy prose, requirements, and credential labels—not raw credentials or witnesses.
- Potential seed phrases, API keys, tokens, and long private values are redacted before model inference.
- Gemini calls use structured JSON schemas, a 12-second timeout, bounded outputs, and conservative normalization.
- Every pipeline has a deterministic local implementation. The workspace therefore remains functional when `GEMINI_API_KEY` is absent or the provider is unavailable.
- Generated policies are drafts. Staging a policy fills the Host console, but the user must review and explicitly register it through 1AM.

The default model is `gemini-2.5-flash`. Set `GEMINI_MODEL` only when your deployment needs a different compatible model. API keys remain server-side and must be configured through hosting secrets.

## Compact toolchain and generated output

The contract compiles as:

```powershell
npm run contracts:compile
```

Important: PowerShell's `C:\Windows\System32\compact.exe` is file compression, not Midnight Compact. Its output starts with `Listing ...`. A successful Midnight compile builds seven provable circuits and creates the checked-in `managed/veil-allowlist/compiler`, `contract`, `keys`, and `zkir` directories.

No Docker is required to run this site, deploy it on Vercel, or deploy through 1AM using the already-generated artifacts. After modifying the Compact source, run the wrapper above; it also syncs keys and ZKIR into `public/` for browser proving. If the wrapper cannot find a Midnight compiler, use a supported Linux environment only to recompile the changed contract source.

To re-sync browser assets without recompiling:

```powershell
npm run contracts:sync-browser-assets
```

## Test and CI

```bash
npm run check:compact-source
npm run check:contract-artifacts
npm run lint
npm test
npm run verify
```

`npm test` runs contract security assertions, deterministic policy tests, and rendered application smoke tests. `npm run verify` is the local merge gate: lint, source and artifact integrity, production build, and the full test suite. Application CI runs on every push and pull request; Contract Integrity additionally recompiles with Compact 0.31.1 and rejects stale generated bindings.

## Deploy on Vercel

This app uses Vinext plus Nitro. `vercel.json` explicitly chooses Vercel's **Other** framework preset, runs `npm run build`, and Nitro emits Vercel Build Output API files in `.vercel/output`. This fixes the previous “`.output` was not found” failure caused by forcing a Next.js deployment.

1. Import the repository in Vercel and use Node.js 22.
2. Add the production environment variables shown in `.env.example`: `NEXT_PUBLIC_MIDNIGHT_NETWORK_ID=preprod` and `NEXT_PUBLIC_MIDNIGHT_WALLET=1am`.
3. Leave `NEXT_PUBLIC_MIDNIGHT_CONTRACT_ADDRESS` empty for the first deployment.
4. Deploy the site.

For a Vercel Preview deployment using 1AM, set `NEXT_PUBLIC_MIDNIGHT_NETWORK_ID=preview` and `NEXT_PUBLIC_MIDNIGHT_WALLET=1am` in that environment. The in-app toggle can then move between Preview and Preprod without rebuilding; reconnect 1AM after every switch.

## Deploy the Compact contract without Docker

1AM on Preview or Preprod is a Docker-free deployment path.

1. Run `npm run contracts:sync-browser-assets` once after compiling.
2. Deploy the frontend on Vercel with 1AM variables. Choose **Preview** or **Preprod** in the floating in-app network toggle.
3. Open the live site in the browser profile containing **1AM**, and switch 1AM to the same network.
4. Fund that wallet with the matching tNIGHT and DUST: [Preview faucet](https://midnight-tmnight-preview.nethermind.dev/) or [Preprod faucet](https://midnight-tmnight-preprod.nethermind.dev/).
5. In VeilPass, select **Connect wallet**, approve the request for the selected network, then select **Deploy with connected wallet** in the Live contract card.
6. Keep the tab open while 1AM proves, balances, and submits the transaction. The app displays and copies the full contract address when finalization succeeds.
7. Use **Host console** to rotate, pause, or resume the governed policy. The constructor already installs the initial valid Merkle policy atomically.
8. Select **Generate proof** and then **Run private proof** to submit `prove_access`; the result is a pass ID that can be validated or revoked in Host console.
9. Paste the full address below and into Vercel as `NEXT_PUBLIC_MIDNIGHT_CONTRACT_ADDRESS`, then redeploy the frontend.

The browser deployer uses the selected 1AM wallet's configured proof service where supplied, or 1AM's delegated proving provider. No local proof service or Docker is required for this flow.

### Optional headless route

`npm run contracts:deploy -- --network preprod` is an advanced terminal workflow. It requires an existing proof endpoint in `MIDNIGHT_PROOF_SERVER`, uses a separate local headless wallet, and is not required for the 1AM deployment above. Its local seed file is gitignored and must never be committed.

## Deployment record

> **Migration required:** the recorded deployments below predate the governed Merkle/nullifier/receipt contract. They are retained as historical submission evidence and are not compatible with the current client. Follow the [governed redeployment checklist](docs/deployment-migration.md) before setting a production contract address.

- Contract: `veil-allowlist.compact`
- Preview contract address: `27d31144f351eea606aa7cf1abbb198c87711169c68a919449886e3783e599f1`
- Preview deployment transaction ID: `00a230e8cec48a7cba1139e2f81efe134341874367628a9b1e067a5d6db5ed808f`
- Legacy Preprod contract address: `1b35e2fcea7b313f7ff1ff7c0af6df34a3f5dedd26a390c7534863727f022309`
- Legacy Preprod deployment transaction ID: `0064d5d9d1378733d20fa79c58f08bdfeb5281e2cab27f574750321210716f744c`
- Legacy Preprod deployment time: July 27, 2026 at 10:36 UTC
- Managed output: `managed/veil-allowlist/`

Vercel hosts the frontend; it does not create a Midnight contract by itself. Do not replace either address with a shortened or invented value. Only insert the complete address shown after a successful wallet deployment.
## three test passing screenshots
<img width="1600" height="800" alt="Screenshot 2026-07-28 112026" src="https://github.com/user-attachments/assets/23c95d81-a83d-4bcc-9f15-36c7bae0f870" />
<img width="1600" height="800" alt="Screenshot 2026-07-28 111914" src="https://github.com/user-attachments/assets/e9d3123c-4085-4cb2-82c5-d806951fbb2e" />
<img width="900" height="400" alt="Screenshot 2026-07-28 111741" src="https://github.com/user-attachments/assets/d0dea3dc-beb0-4445-b4ba-b149e3005d0a" />



## Submission links

- Live demo: https://veil-pass.vercel.app/
- Demo video: https://drive.google.com/file/d/1Ag_r7hJ1a4N1ZgL8JBBVugK-AmBTKjgt/view?usp=sharing

Approved idea track: **Private Allowlist Access**.

Built with [Midnight developer documentation](https://docs.midnight.network/) and Compact.
