import {
  CompactTypeBytes,
  CompactTypeMerkleTreeDigest,
  CompactTypeMerkleTreePath,
  maxField,
  StateBoundedMerkleTree,
} from "@midnight-ntwrk/compact-runtime";

export const VEILPASS_TREE_HEIGHT = 20;
export const DEFAULT_POLICY_CAPACITY = 500n;
export const DEFAULT_POLICY_LIFETIME_MS = 30 * 24 * 60 * 60 * 1_000;

export type VeilPassMembershipPath = {
  leaf: Uint8Array;
  path: Array<{ sibling: { field: bigint }; goes_left: boolean }>;
};

export type VeilPassPrivateState = {
  adminSecret: Uint8Array;
  credentialCommitment: Uint8Array;
  membershipPath: VeilPassMembershipPath;
  nullifierSecret: Uint8Array;
};

export type VeilPassPolicyBundle = {
  root: bigint;
  rootHex: string;
  privateState: VeilPassPrivateState;
};

const bytes32 = new CompactTypeBytes(32);
const membershipPath = new CompactTypeMerkleTreePath(VEILPASS_TREE_HEIGHT, bytes32);

export function randomBytes32(): Uint8Array {
  const value = new Uint8Array(32);
  globalThis.crypto.getRandomValues(value);
  return value;
}

export function bytesToHex(value: Uint8Array): string {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function fieldToHex(value: bigint): string {
  return value.toString(16).padStart(64, "0");
}

export function hexToField(value: string): bigint {
  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error("Allowlist root must be exactly 64 hexadecimal characters.");
  }
  const field = BigInt(`0x${value}`);
  if (field > maxField()) {
    throw new Error("Allowlist root is outside the Midnight field range.");
  }
  return field;
}

export function parsePassId(value: string): Uint8Array {
  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error("Pass ID must be exactly 64 hexadecimal characters.");
  }
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (pair) => Number.parseInt(pair, 16));
}

/**
 * Build a valid one-member policy for the browser prototype. The credential,
 * authentication secret, Merkle path, and nullifier secret remain private;
 * only the resulting field root is passed to the contract constructor.
 */
export function createSingleMemberPolicy(
  existing?: Partial<Pick<VeilPassPrivateState, "adminSecret" | "credentialCommitment" | "nullifierSecret">>,
): VeilPassPolicyBundle {
  const credentialCommitment = existing?.credentialCommitment ?? randomBytes32();
  const alignedLeaf = {
    value: bytes32.toValue(credentialCommitment),
    alignment: bytes32.alignment(),
  };
  const tree = new StateBoundedMerkleTree(VEILPASS_TREE_HEIGHT)
    .update(0n, alignedLeaf)
    .rehash();
  const rootValue = tree.root();

  if (!rootValue) throw new Error("Could not derive the allowlist Merkle root.");

  const root = CompactTypeMerkleTreeDigest.fromValue(structuredClone(rootValue.value)).field;
  const path = membershipPath.fromValue(
    structuredClone(tree.pathForLeaf(0n, alignedLeaf).value),
  );
  const privateState: VeilPassPrivateState = {
    adminSecret: existing?.adminSecret ?? randomBytes32(),
    credentialCommitment,
    membershipPath: path,
    nullifierSecret: existing?.nullifierSecret ?? randomBytes32(),
  };

  return { root, rootHex: fieldToHex(root), privateState };
}

export function defaultPolicyExpiry(now = Date.now()): bigint {
  return BigInt(now + DEFAULT_POLICY_LIFETIME_MS);
}
