import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const managedRoot = path.join(repoRoot, "managed", "veil-allowlist");
const publicRoot = path.join(repoRoot, "public");

const provableCircuits = [
  "pause_policy",
  "prove_access",
  "resume_policy",
  "revoke_pass",
  "rotate_policy",
  "transfer_admin",
  "validate_pass",
];

const requiredLedgerFields = [
  "admin_key",
  "allowlist_root",
  "policy_state",
  "policy_epoch",
  "max_passes",
  "valid_until",
  "verified_passes",
  "used_nullifiers",
  "issued_passes",
  "revoked_passes",
];

const requiredFiles = [
  path.join(managedRoot, "compiler", "contract-info.json"),
  path.join(managedRoot, "contract", "index.js"),
  path.join(managedRoot, "contract", "index.d.ts"),
  ...provableCircuits.flatMap((circuit) => [
    path.join(managedRoot, "keys", `${circuit}.prover`),
    path.join(managedRoot, "keys", `${circuit}.verifier`),
    path.join(managedRoot, "zkir", `${circuit}.zkir`),
    path.join(managedRoot, "zkir", `${circuit}.bzkir`),
    path.join(publicRoot, "keys", `${circuit}.prover`),
    path.join(publicRoot, "keys", `${circuit}.verifier`),
    path.join(publicRoot, "zkir", `${circuit}.bzkir`),
  ]),
];

for (const file of requiredFiles) {
  await access(file);
  const metadata = await stat(file);
  if (metadata.size === 0) throw new Error(`Contract artifact is empty: ${path.relative(repoRoot, file)}`);
}

const bindings = await readFile(path.join(managedRoot, "contract", "index.d.ts"), "utf8");
const missingCircuits = provableCircuits.filter((circuit) => !bindings.includes(`${circuit}(`));
const missingFields = requiredLedgerFields.filter((field) => !bindings.includes(`readonly ${field}`));

if (missingCircuits.length || missingFields.length) {
  throw new Error([
    missingCircuits.length ? `Generated bindings are missing circuits: ${missingCircuits.join(", ")}` : "",
    missingFields.length ? `Generated bindings are missing ledger fields: ${missingFields.join(", ")}` : "",
  ].filter(Boolean).join("\n"));
}

console.log(`Verified ${provableCircuits.length} provable circuits, ${requiredLedgerFields.length} ledger fields, and ${requiredFiles.length} generated/browser artifacts.`);
