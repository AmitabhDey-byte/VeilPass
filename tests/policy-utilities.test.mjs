import assert from "node:assert/strict";
import test from "node:test";

import {
  bytesToHex,
  createSingleMemberPolicy,
  fieldToHex,
  hexToField,
  parsePassId,
  VEILPASS_TREE_HEIGHT,
} from "../lib/veilpass-policy.ts";

const fixedSecrets = {
  credentialCommitment: new Uint8Array(32).fill(7),
  adminSecret: new Uint8Array(32).fill(1),
  nullifierSecret: new Uint8Array(32).fill(2),
};

test("single-member policy produces a deterministic valid Merkle witness", () => {
  const policy = createSingleMemberPolicy(fixedSecrets);

  assert.equal(policy.rootHex, "1306d5bbd999830606299f6acbe9172550a40132be0c92d1629c3d77d59d7231");
  assert.equal(policy.privateState.membershipPath.path.length, VEILPASS_TREE_HEIGHT);
  assert.deepEqual(policy.privateState.membershipPath.leaf, fixedSecrets.credentialCommitment);
  assert.equal(fieldToHex(policy.root), policy.rootHex);
  assert.equal(hexToField(policy.rootHex), policy.root);
});

test("policy keeps all witness secrets in private state", () => {
  const policy = createSingleMemberPolicy(fixedSecrets);

  assert.deepEqual(policy.privateState.adminSecret, fixedSecrets.adminSecret);
  assert.deepEqual(policy.privateState.credentialCommitment, fixedSecrets.credentialCommitment);
  assert.deepEqual(policy.privateState.nullifierSecret, fixedSecrets.nullifierSecret);
  assert.equal(Object.hasOwn(policy, "adminSecret"), false);
});

test("field and pass parsers reject malformed or out-of-range values", () => {
  assert.throws(() => hexToField("abc"), /64 hexadecimal/);
  assert.throws(() => hexToField("f".repeat(64)), /field range/);
  assert.throws(() => parsePassId("00"), /64 hexadecimal/);

  const passHex = "ab".repeat(32);
  assert.equal(bytesToHex(parsePassId(passHex)), passHex);
});
