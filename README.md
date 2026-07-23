# VeilPass

> Prove you belong. Keep your name.

VeilPass is a privacy-first allowlist-access dApp built for Midnight. A member can prove eligibility for a private space without publishing their name, credential issuer, or the value behind the claim.

## Product proposal

**Private Allowlist Access** — VeilPass is a reusable access layer for invite-only communities, product betas, and events. A host registers an allowlist commitment, while members keep their credential and secret private. The Compact circuit verifies the witness and reveals only a valid or invalid result. Organizers get an auditable access count without turning the allowlist into a public identity directory.

## Repository contents

- `app/` — responsive VeilPass console with multi-page navigation, wallet connect, access views, credentials, activity, privacy model, and Gemini-ready assistant.
- `contracts/veil-allowlist.compact` — Compact contract with public ledger state, private witnesses, and deliberate `disclose()` use.
- `managed/veil-allowlist/` — generated contract binding, circuits, proving/verifying keys, and ZKIR output.
- `public/keys/` and `public/zkir/` — browser-served proof assets for the connected wallet.
- `tests/rendered-html.test.mjs` — three render and artifact smoke tests.
- `.github/workflows/ci.yml` — build and test workflow on each push and pull request.

## Privacy model

### An observer can learn

- The public allowlist commitment (a hash, not a credential).
- Whether a submitted proof is valid.
- The number of accepted proofs.
- Public transaction metadata and timestamps.

### An observer cannot learn

- A member's name or wallet-to-identity mapping from the proof alone.
- Credential issuer or underlying eligibility value.
- The private witness that satisfied the circuit.

`disclose()` is used only to register the public allowlist root. The member credential commitment and eligibility boolean are private witnesses and are never disclosed.

## Local development

```bash
npm ci
npm run dev
```

The interface is explorable without a wallet. The **Connect wallet** action uses the Midnight DApp Connector API: use Lace on Preview or 1AM on Preprod.

Copy `.env.example` to `.env.local` for local configuration:

```text
NEXT_PUBLIC_MIDNIGHT_NETWORK_ID=preprod
NEXT_PUBLIC_MIDNIGHT_WALLET=1am
NEXT_PUBLIC_MIDNIGHT_CONTRACT_ADDRESS=
GEMINI_API_KEY=your_optional_server_side_key
```

`GEMINI_API_KEY` is optional and is used only by the server chat route; it is never exposed in browser code.

## Compact toolchain and generated output

The contract compiles as:

```powershell
npm run contracts:compile
```

Important: PowerShell's `C:\Windows\System32\compact.exe` is file compression, not Midnight Compact. Its output starts with `Listing ...`. A successful Midnight compile says `Compiling 2 circuits` and creates the checked-in `managed/veil-allowlist/compiler`, `contract`, `keys`, and `zkir` directories.

No Docker is required to run this site, deploy it on Vercel, or deploy through 1AM using the already-generated artifacts. After modifying the Compact source, run the wrapper above; it also syncs keys and ZKIR into `public/` for browser proving. If the wrapper cannot find a Midnight compiler, use a supported Linux environment only to recompile the changed contract source.

To re-sync browser assets without recompiling:

```powershell
npm run contracts:sync-browser-assets
```

## Test and CI

```bash
npm run check:compact-source
npm run lint
npm test
```

`npm test` runs the production build followed by three smoke tests. The GitHub Actions workflow runs the same build and test checks on every push and pull request.

## Deploy on Vercel

This app uses Vinext plus Nitro. `vercel.json` explicitly chooses Vercel's **Other** framework preset, runs `npm run build`, and Nitro emits Vercel Build Output API files in `.vercel/output`. This fixes the previous “`.output` was not found” failure caused by forcing a Next.js deployment.

1. Import the repository in Vercel and use Node.js 22.
2. Add the Preprod environment variables shown in `.env.example`: `NEXT_PUBLIC_MIDNIGHT_NETWORK_ID=preprod` and `NEXT_PUBLIC_MIDNIGHT_WALLET=1am`.
3. Leave `NEXT_PUBLIC_MIDNIGHT_CONTRACT_ADDRESS` empty for the first deployment.
4. Deploy the site.

For a Vercel Preview deployment using Lace, set `NEXT_PUBLIC_MIDNIGHT_NETWORK_ID=preview` and `NEXT_PUBLIC_MIDNIGHT_WALLET=lace` in that environment.

## Deploy the Compact contract without Docker

Preprod + 1AM is the recommended no-Docker path.

1. Run `npm run contracts:sync-browser-assets` once after compiling.
2. Deploy the frontend on Vercel with the Preprod / 1AM variables above.
3. Open the live site in the browser profile containing **1AM**, and switch 1AM to **Preprod**.
4. Fund that wallet with Preprod tNIGHT and DUST using the network faucet shown in 1AM, or the [Preprod tNIGHT faucet](https://midnight-tmnight-preprod.nethermind.dev/).
5. In VeilPass, select **Connect wallet**, approve the request, then select **Deploy with connected wallet** in the Live contract card.
6. Keep the tab open while 1AM proves, balances, and submits the transaction. The app displays and copies the full contract address when finalization succeeds.
7. Select **Generate proof** and then **Run private proof** to submit VeilPass's live `prove_access` circuit from the same wallet session.
8. Paste the full address below and into Vercel as `NEXT_PUBLIC_MIDNIGHT_CONTRACT_ADDRESS`, then redeploy the frontend.

The browser deployer uses the selected wallet's configured proof service where supplied, or the wallet's delegated proving provider. On Preview, Lace may require a configured local proof service; use Preprod + 1AM for the required Docker-free deployment.

### Optional headless route

`npm run contracts:deploy -- --network preprod` is an advanced terminal workflow. It requires an existing proof endpoint in `MIDNIGHT_PROOF_SERVER`, uses a separate local headless wallet, and is not required for the 1AM deployment above. Its local seed file is gitignored and must never be committed.

## Deployment record

- Contract: `veil-allowlist.compact`
- Preview contract address: pending deployment
- Preprod contract address: pending deployment
- Managed output: `managed/veil-allowlist/`

Vercel hosts the frontend; it does not create a Midnight contract by itself. Do not replace either address with a shortened or invented value. Only insert the complete address shown after a successful wallet deployment.

## Submission links

- Live demo: https://veil-pass.vercel.app/
- Demo video: https://drive.google.com/file/d/1Ag_r7hJ1a4N1ZgL8JBBVugK-AmBTKjgt/view?usp=sharing

Approved idea track: **Private Allowlist Access**.

Built with [Midnight developer documentation](https://docs.midnight.network/) and Compact.
