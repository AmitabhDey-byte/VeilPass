import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../contracts/veil-allowlist.compact", import.meta.url), "utf8");

const requiredFragments = [
  "pragma language_version 0.23",
  "witness private_admin_secret",
  "witness private_credential_commitment",
  "witness private_membership_path",
  "witness private_nullifier_secret",
  "export ledger admin_key",
  "export ledger allowlist_root",
  "export ledger policy_state",
  "export ledger policy_epoch",
  "export ledger max_passes",
  "export ledger valid_until",
  "export ledger used_nullifiers",
  "export ledger issued_passes",
  "export ledger revoked_passes",
  "merkleTreePathRoot<20, Bytes<32>>",
  "kernel.blockTimeLessThan(valid_until)",
  "verified_passes.lessThan(max_passes)",
  "used_nullifiers.member",
  "used_nullifiers.insert",
  "export circuit rotate_policy",
  "export circuit pause_policy",
  "export circuit resume_policy",
  "export circuit transfer_admin",
  "export circuit prove_access",
  "export circuit revoke_pass",
  "export circuit validate_pass",
];

const forbiddenFragments = [
  "witness private_is_eligible",
  "register_allowlist_root",
  "pragma language_version >=",
];

const missing = requiredFragments.filter((fragment) => !source.includes(fragment));
const forbidden = forbiddenFragments.filter((fragment) => source.includes(fragment));

const exportedCircuitCount = [...source.matchAll(/export\s+(?:pure\s+)?circuit\s+\w+/g)].length;
const discloseCount = [...source.matchAll(/\bdisclose\s*\(/g)].length;

if (missing.length > 0) {
  throw new Error(`Compact source is missing security requirements:\n- ${missing.join("\n- ")}`);
}

if (forbidden.length > 0) {
  throw new Error(`Compact source contains obsolete or unsafe patterns:\n- ${forbidden.join("\n- ")}`);
}

if (exportedCircuitCount !== 10) {
  throw new Error(`Expected 10 exported circuits, found ${exportedCircuitCount}.`);
}

if (discloseCount < 10) {
  throw new Error(`Expected explicit public-boundary disclosures, found only ${discloseCount}.`);
}

console.log(`Compact source checks passed: ${exportedCircuitCount} exported circuits, Merkle membership, admin authentication, expiry, capacity, nullifiers, receipts, and revocation are present.`);
