# Governed contract deployment migration

The currently recorded Preprod deployment was finalized on **July 27, 2026 at 10:36 UTC**. It predates the governed contract redesign and must be treated as a legacy deployment.

## Why a new deployment is required

Compact contract code is fixed at deployment. The existing address cannot gain the new constructor state, ledger schema, circuits, or verifier keys through a frontend update. The governed build now requires constructor arguments for an administrator commitment, Merkle root, issuance capacity, and expiry.

The new ABI provides these provable circuits:

- `rotate_policy`
- `pause_policy`
- `resume_policy`
- `transfer_admin`
- `prove_access`
- `revoke_pass`
- `validate_pass`

The old address remains useful only as historical evidence of the earlier submission.

## Legacy Preprod record

- Contract: `1b35e2fcea7b313f7ff1ff7c0af6df34a3f5dedd26a390c7534863727f022309`
- Transaction: `0064d5d9d1378733d20fa79c58f08bdfeb5281e2cab27f574750321210716f744c`
- Finalized: July 27, 2026 at 10:36 UTC
- Compatibility: legacy increment-era build; not compatible with the governed client

## Redeployment checklist

1. Run `npm ci` and `npm run verify` from a clean checkout.
2. Confirm `npm run check:contract-artifacts` reports seven provable circuits, ten ledger fields, and all generated/browser artifacts.
3. Connect 1AM to Preprod with spendable DUST.
4. Deploy from the Live contract card. The constructor atomically installs a valid single-member Merkle policy with a 500-pass capacity and 30-day lifetime.
5. Record the full contract address, transaction ID, and UTC finalization time in the deployment record.
6. Run one access proof, copy the returned pass receipt, validate it, revoke it, and confirm validation then returns false.
7. Set `NEXT_PUBLIC_MIDNIGHT_PREPROD_CONTRACT_ADDRESS` to the new full address and redeploy the frontend.

## Evidence expected from the replacement deployment

- A finalized deployment transaction for the governed constructor.
- A successful `prove_access` transaction returning a 32-byte receipt.
- A successful `validate_pass` call before revocation.
- A successful `revoke_pass` transaction.
- A failed/false `validate_pass` result after revocation.
- Passing Application CI and Contract Integrity checks for the deployed commit.

Never overwrite the legacy values without retaining their date and status. Historical deployment metadata and the active governed deployment should be distinguishable during review.
