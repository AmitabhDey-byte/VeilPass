import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../contracts/veil-allowlist.compact", import.meta.url), "utf8");
const required = ["witness", "ledger", "disclose(", "export circuit prove_access"];
const missing = required.filter((token) => !source.includes(token));

if (missing.length > 0) {
  throw new Error(`Compact source is missing: ${missing.join(", ")}`);
}

console.log("Compact source checks passed: witness, public ledger, disclose(), and proof circuit present.");
