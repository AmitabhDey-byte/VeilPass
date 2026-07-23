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
## Screenshots

<img width="1896" height="865" alt="Screenshot 2026-07-22 010331" src="https://github.com/user-attachments/assets/a47d0c50-1b9c-42f0-8280-529f28a1371a" />
<img width="1896" height="868" alt="Screenshot 2026-07-22 010251" src="https://github.com/user-attachments/assets/3a45b64f-2b1a-4a3e-98ac-cfa8438c8ef0" />
<img width="1897" height="863" alt="Screenshot 2026-07-22 010239" src="https://github.com/user-attachments/assets/6be8b276-f114-4b07-b00b-987ac7cac7a1" />
<img width="1896" height="867" alt="Screenshot 2026-07-22 010219" src="https://github.com/user-attachments/assets/846e6d04-345a-45d9-bc15-38f49a6dae48" />

## CI CD Pipeline

<img width="1916" height="862" alt="image" src="https://github.com/user-attachments/assets/0ee69a30-061b-46d7-9a39-4a1e372e5880" />
## Mobile Responsiveness

<img width="360" height="800" alt="WhatsApp Image 2026-07-22 at 1 19 29 AM" src="https://github.com/user-attachments/assets/5cfd3453-c603-43f0-8248-421c1100fe39" />
<img width="360" height="800" alt="WhatsApp Image 2026-07-22 at 1 19 29 AM (2)" src="https://github.com/user-attachments/assets/33915710-e2a7-497e-ace2-979540c8d276" />
<img width="360" height="800" alt="WhatsApp Image 2026-07-22 at 1 19 29 AM (1)" src="https://github.com/user-attachments/assets/0ce630d4-e722-4f82-ab39-a0b94c666150" />


## Demo Video Link

https://drive.google.com/file/d/1Ag_r7hJ1a4N1ZgL8JBBVugK-AmBTKjgt/view?usp=sharing

## Live Website Link:

https://veil-pass.vercel.app/

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

Open the local URL printed by the dev server. The console can be explored without a wallet, but the **Connect wallet** action uses the live Midnight DApp Connector API and Lace when the extension is available.

### Connect Lace on Preview or 1AM on Preprod

1. Install or enable Lace for Preview, or 1AM for Preprod.
2. Set `NEXT_PUBLIC_MIDNIGHT_NETWORK_ID` to `preview` or `preprod`, and set `NEXT_PUBLIC_MIDNIGHT_WALLET` to `lace` or `1am`.
3. Run VeilPass in that browser profile: `npm run dev` locally or open the Vercel deployment.
4. Click **Connect wallet** and approve the request in the selected wallet.
5. VeilPass reads the wallet connection status and address, then displays the network ID returned by the wallet.

The current **Generate proof** button demonstrates the product flow after a real wallet connection. The next integration step is to replace `finishProof` with the generated Compact contract API and deployed contract address.

### Veil assistant / Gemini (optional)

The assistant is available from the floating **Ask Veil** button and works in demo mode without external credentials. To enable Gemini responses, copy `.env.example` to `.env.local`, add a `GEMINI_API_KEY`, and restart the dev server. The key is read only by the server route at `/api/chat`; it is never sent to the browser.

## Deploy to Vercel

This repository now includes `vercel.json` for a standard Next.js deployment. Import the GitHub repository into Vercel, keep the Node.js version at 22, and add `GEMINI_API_KEY` under Project Settings → Environment Variables for Production, Preview, and Development. Vercel uses `next build` and the default `.next` output for this deployment path.

## Compact toolchain

The contract is designed for the Midnight Compact toolchain and follows the `compact compile <source> <managed-output>` flow.

### Windows / PowerShell warning

PowerShell resolves `compact` to the Windows file-compression utility at `C:\Windows\System32\compact.exe`. Its output starts with `Listing ...` and does **not** compile Compact contracts. Midnight's compiler is a Linux toolchain, so use Docker Desktop with Linux containers, WSL2 Ubuntu, or Linux/macOS. [Midnight's documentation](https://docs.midnight.network/getting-started/installation) recommends WSL for native Windows development.

From a WSL2 Ubuntu terminal, run:

```bash
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
export PATH="$HOME/.compact/bin:$PATH"
compact update 0.31.0
cd /mnt/d/Midnight-main
command -v compact
compact --version
compact compile contracts/veil-allowlist.compact managed/veil-allowlist
```

`command -v compact` must point into your WSL home directory, not `C:\Windows\System32\compact.exe`. A successful compile creates the contract bindings plus `compiler/`, `contract/`, `keys/`, and `zkir/` artifacts under `managed/veil-allowlist/`. Commit that compiler output after running the command; do not hand-edit generated circuit or key files.

### Windows without WSL2: Docker Desktop

If you do not want WSL2, run the Linux compiler inside Docker Desktop. Use Docker Desktop with **Linux containers** and the **Hyper-V backend**; `docker version` should show a Linux server. From PowerShell in the repository root:

```powershell
$repo = (Get-Location).Path
$cmd = 'apk add --no-cache bash curl ca-certificates; curl --proto ''=https'' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh; export PATH="$HOME/.compact/bin:$PATH"; compact update 0.31.0; compact compile contracts/veil-allowlist.compact managed/veil-allowlist'
docker run --rm --pull always -v "${repo}:/workspace" -w /workspace alpine:3.22 sh -lc $cmd
```

This Docker command produces the same `managed/veil-allowlist/` output without installing the compiler natively on Windows. The project wrapper also uses this fallback:

After Docker Desktop or the WSL toolchain is installed, the same compile can be launched from PowerShell with:

```powershell
npm run contracts:compile
```

## Test

```bash
npm test
```

## Deployment record

- Contract: `veil-allowlist.compact`
- Preview contract address: **to be replaced with the address returned by the Preview deployment command**
- Preprod contract address: **to be replaced with the address returned by the Preprod deployment command**
- Managed output: `managed/veil-allowlist/`

Do not submit a truncated or invented address. After deploying with a funded Lace or 1AM wallet, replace both bold values with the complete address printed by the deployment script and record the exact network beside each one.

## Idea status

Approved idea track: **Private Allowlist Access**.

Built with [Midnight developer documentation](https://docs.midnight.network/) and the Compact language.
