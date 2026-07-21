# VeilPass

> Prove you belong. Keep your name.

VeilPass is a privacy-first allowlist access dApp concept built for Midnight. A member can prove they are eligible for a private space without publishing their name, credential source, or underlying value. The interface makes the privacy boundary legible: public commitments and proof validity are visible; the witness remains local.

## Product proposal

**Private Allowlist Access** — VeilPass is a reusable access layer for invite-only communities, product betas, and events. A host publishes an allowlist commitment, while members keep their credential and secret locally. When a member requests entry, the Compact circuit verifies the private witness and reveals only a valid / invalid result. This gives organizers an auditable member count and revocable passes without turning the allowlist into a public identity directory.

## What is in this repository

- `app/` — responsive VeilPass console with wallet connect, proof request, privacy model, activity, and live contract panels.
- `contracts/veil-allowlist.compact` — first Compact contract with public ledger state, private witnesses, and deliberate `disclose()` use.
- `tests/rendered-html.test.mjs` — three smoke tests covering server rendering, privacy copy, and required contract artifacts.
- `.github/workflows/ci.yml` — build and test workflow for every push and pull request.

## Privacy model

### An observer can learn

- The public allowlist commitment (a hash, not the credential).
- Whether a submitted proof is valid.
- The number of proofs accepted by the contract.
- Public activity timestamps and transaction metadata.

### An observer cannot learn

- The member’s name or wallet-to-identity mapping from the proof alone.
- The credential source or the underlying eligibility value.
- The private witness used to satisfy the circuit.

`disclose()` is used only where a value intentionally crosses from private computation into the public ledger. In this prototype, the root is explicitly registered as public; the member witness is never disclosed.

## Run locally

```bash
npm ci
npm run dev
```

Open the local URL printed by the dev server. The console works as a product demo without a wallet: click **Generate proof**, review the private witness steps, and submit the simulated proof.

### Veil assistant / Gemini (optional)

The assistant is available from the floating **Ask Veil** button and works in demo mode without external credentials. To enable Gemini responses, copy `.env.example` to `.env.local`, add a `GEMINI_API_KEY`, and restart the dev server. The key is read only by the server route at `/api/chat`; it is never sent to the browser.

## Deploy to Vercel

This repository now includes `vercel.json` for a standard Next.js deployment. Import the GitHub repository into Vercel, keep the Node.js version at 22, and add `GEMINI_API_KEY` under Project Settings → Environment Variables for Production, Preview, and Development. Vercel uses `next build` and the default `.next` output for this deployment path.

## Compact toolchain

The contract is designed for the Midnight Compact toolchain and follows the `compact compile <source> <managed-output>` flow. With the Compact CLI installed:

```bash
compact compile contracts/veil-allowlist.compact managed
```

The generated `managed/` directory is intentionally ignored until compilation is run in a configured Midnight environment. Do not hand-edit generated circuit or key files.

## Test

```bash
npm test
```

## Deployment record

- Network: Preview / Preprod
- Contract: `veil-allowlist.compact`
- Demo address: `addr_test1vz0…3a8f92c`
- Managed circuits: 3

The UI shows this address as a visible contract record. Replace it with the real deployment address after running the Midnight deployment flow from a configured wallet.

## Idea status

Approved idea track: **Private Allowlist Access**.

Built with [Midnight developer documentation](https://docs.midnight.network/) and the Compact language.
