import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../contracts/veil-allowlist.compact", import.meta.url), "utf8");
const required = [
  "pragma language_version",
  "witness private_credential_commitment",
  "witness private_is_eligible",
  "export ledger allowlist_root",
  "export ledger verified_passes",
  "disclose(",
  "export circuit register_allowlist_root",
  "export circuit prove_access",
];
const missing = required.filter((token) => !source.includes(token));

if (missing.length > 0) {
  throw new Error(`Compact source is missing: ${missing.join(", ")}`);
}

console.log("Compact source checks passed: version pragma, private witnesses, public ledgers, disclose(), and exported circuits present.");
