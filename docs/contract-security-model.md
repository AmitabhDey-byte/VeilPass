# VeilPass contract security model

This document defines the invariants that the Compact contract and its clients must preserve. It is intentionally written before the implementation so reviewers can compare the code with an explicit security target.

## Protected assets

- The host's policy-administration capability.
- The member's credential commitment, Merkle authentication path, and nullifier secret.
- The integrity of issued access-pass receipts.
- The uniqueness of access consumption within a policy epoch.
- The public accuracy of policy status, capacity, expiry, issuance count, and revocation state.

## Trust boundaries

Witness functions execute off chain and are controlled by the caller. The contract therefore treats every witness value as untrusted until a circuit proves a relationship between that value and public ledger state.

The wallet and proof provider may transport private inputs, but they do not decide whether access is valid. The Compact circuit enforces the decision.

## Contract invariants

1. A policy is configured during contract construction with a committed administrator secret.
2. Administrative mutations require knowledge of the secret whose domain-separated hash equals the stored administrator key.
3. Access is possible only while the policy is active, below capacity, and before its public expiry time.
4. A credential commitment is accepted only when its private Merkle path reconstructs the active public allowlist root.
5. Every proof derives a policy-scoped nullifier from a private random secret. A consumed nullifier cannot be reused.
6. Successful proofs create a deterministic public pass receipt without revealing the credential, path, or nullifier secret.
7. A host may revoke an issued receipt, but cannot erase issuance or nullifier history.
8. Policy rotation advances the epoch and resets the per-policy issuance counter while retaining historical replay protection and receipts.
9. Pausing blocks new proofs. It does not rewrite prior receipts.
10. Raw secrets and private witnesses are never written to public ledger fields or returned by exported circuits.

## Public state

Observers can learn the administrator commitment, current allowlist root, policy lifecycle state, epoch, capacity, expiry, issuance count, consumed nullifiers, issued receipt identifiers, and revoked receipt identifiers.

## Private state

The administrator secret, credential commitment, Merkle authentication path, and member nullifier secret remain private inputs. The public receipt and nullifier are domain-separated hashes and cannot be used to recover their preimages.

## Non-goals

- VeilPass does not issue identity credentials.
- VeilPass does not prove the truth of arbitrary off-chain claims without a committed issuer or allowlist root.
- VeilPass does not conceal aggregate usage counts or policy configuration.
- A compromised administrator secret cannot be recovered by the contract; authority rotation must happen before compromise.

## Verification strategy

- Compile the contract with Compact toolchain 0.31.1 for the current ledger-8 deployment target.
- Run static source-invariant tests that reject missing authorization, replay protection, expiry, capacity, or Merkle verification.
- Verify generated bindings expose every expected circuit and ledger field.
- Recompile in CI and fail when checked-in generated artifacts or browser proof assets are stale.
