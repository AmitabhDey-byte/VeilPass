import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../contracts/veil-allowlist.compact", import.meta.url), "utf8");

function circuit(name) {
  const start = source.indexOf(`export circuit ${name}`);
  assert.notEqual(start, -1, `missing ${name} circuit`);
  const next = source.indexOf("\nexport circuit ", start + 1);
  return source.slice(start, next === -1 ? undefined : next);
}

test("every administrative mutation authenticates the private administrator", () => {
  assert.match(source, /circuit assert_admin\(\): \[\][\s\S]*private_admin_secret\(\)[\s\S]*supplied_key == admin_key/);
  for (const name of ["rotate_policy", "pause_policy", "resume_policy", "transfer_admin", "revoke_pass"]) {
    const body = circuit(name);
    assert.match(body, /assert_admin\(\)/, `${name} must authenticate the administrator`);
  }
});

test("access proof enforces state, expiry, capacity, membership, and replay protection", () => {
  const body = circuit("prove_access");

  assert.match(body, /PolicyState\.ACTIVE/);
  assert.match(body, /kernel\.blockTimeLessThan\(valid_until\)/);
  assert.match(body, /verified_passes\.lessThan\(max_passes\)/);
  assert.match(body, /merkleTreePathRoot<20, Bytes<32>>\(membership_path\)/);
  assert.match(body, /!used_nullifiers\.member\(disclose\(nullifier\)\)/);
  assert.match(body, /used_nullifiers\.insert\(disclose\(nullifier\)\)/);
  assert.match(body, /issued_passes\.insert\(disclose\(pass_id\)\)/);
});

test("pass validation requires issuance and rejects revoked receipts", () => {
  const body = circuit("validate_pass");
  assert.match(body, /issued_passes\.member\(disclose\(pass_id\)\)/);
  assert.match(body, /revoked_passes\.member\(disclose\(pass_id\)\)/);
  assert.match(body, /issued && !revoked && active && unexpired/);
});

test("policy rotation advances the epoch and resets issuance capacity", () => {
  const body = circuit("rotate_policy");
  assert.match(body, /policy_epoch\.increment\(1\)/);
  assert.match(body, /verified_passes\.resetToDefault\(\)/);
  assert.match(body, /new_max_passes > 0/);
  assert.match(body, /new_valid_until > 0/);
});
