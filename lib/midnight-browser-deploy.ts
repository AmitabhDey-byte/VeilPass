import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import type { ContractAddress, SigningKey } from "@midnight-ntwrk/compact-runtime";
import "./browser-polyfills";
import {
  createSingleMemberPolicy,
  bytesToHex,
  defaultPolicyExpiry,
  DEFAULT_POLICY_CAPACITY,
  hexToField,
  parsePassId,
  type VeilPassPrivateState,
} from "./veilpass-policy";
import type {
  ExportPrivateStatesOptions,
  ImportPrivateStatesOptions,
  PrivateStateExport,
  PrivateStateProvider,
  SigningKeyExport,
  MidnightProvider,
  MidnightProviders,
  WalletProvider,
} from "@midnight-ntwrk/midnight-js/types";

type FinalizedCall<T> = { private: { result: T } };

type FinalizedDeployment = {
  deployTxData: {
    public: {
      contractAddress: string;
      status: string;
      txId: string;
      txHash: string;
    };
  };
  callTx: {
    prove_access(): Promise<FinalizedCall<Uint8Array>>;
    rotate_policy(root: bigint, maxPasses: bigint, validUntil: bigint): Promise<FinalizedCall<[]>>;
    pause_policy(): Promise<FinalizedCall<[]>>;
    resume_policy(): Promise<FinalizedCall<[]>>;
    revoke_pass(passId: Uint8Array): Promise<FinalizedCall<[]>>;
    validate_pass(passId: Uint8Array): Promise<FinalizedCall<boolean>>;
  };
};

export type VeilPassDeployment = {
  contractAddress: string;
  transactionId: string;
  transactionHash: string;
  policyRoot: string;
  initializeDefaultAllowlist: () => Promise<void>;
  proveAccess: () => Promise<string>;
  registerAllowlist: (root: string, maxPasses?: number, validUntil?: number) => Promise<void>;
  rotateToFreshPolicy: (maxPasses?: number, validUntil?: number) => Promise<string>;
  pausePolicy: () => Promise<void>;
  resumePolicy: () => Promise<void>;
  revokePass: (passId: string) => Promise<void>;
  validatePass: (passId: string) => Promise<boolean>;
};

type MidnightNetwork = "preview" | "preprod";

/**
 * Compact identifies a circuit as `contract#circuit`. A literal `#` is a URL
 * fragment, so FetchZkConfigProvider would otherwise ask Vercel for
 * `/keys/veil-allowlist` instead of `/keys/prove_access.verifier`.
 */
const fetchBrowserZkAsset: typeof fetch = (input, init) => {
  const source = input instanceof Request ? input.url : input.toString();
  const url = new URL(source, window.location.origin);

  if (url.hash) {
    const filename = decodeURIComponent(url.hash.slice(1));
    const directory = url.pathname.slice(0, url.pathname.lastIndexOf("/"));
    url.pathname = `${directory}/${filename}`;
    url.hash = "";
  }

  return fetch(url.toString(), init);
};

/** Convert wallet, indexer, and proving failures into useful browser-safe text. */
export function describeMidnightDeploymentError(error: unknown, network: MidnightNetwork): string {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes("no_spendable_dust") || normalized.includes("dust") || normalized.includes("insufficient fee")) {
    return `No spendable DUST is available for this ${network} deployment. Fund or activate DUST in 1AM, wait for it to sync, then try again.`;
  }
  if (normalized.includes("prover") || normalized.includes("proving") || normalized.includes("proof server")) {
    return `1AM could not reach its configured ${network} proving service. Check the wallet's ${network} network settings and try again once the proving service is available.`;
  }
  if (normalized.includes("indexer") || normalized.includes("websocket")) {
    return `1AM's configured ${network} indexer is unavailable. Check the wallet's ${network} network settings, then reconnect and retry.`;
  }
  if (normalized.includes("rejected") || normalized.includes("denied")) {
    return `The ${network} deployment was rejected in 1AM. No contract was deployed.`;
  }
  return message || `${network} deployment failed before a contract was finalized.`;
}

/** @deprecated Use describeMidnightDeploymentError with the selected network. */
export const describePreviewDeploymentError = (error: unknown) => describeMidnightDeploymentError(error, "preview");

export function describeVeilPassProofError(error: unknown, network: MidnightNetwork = "preview"): string {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes("custom error: 170") || normalized.includes("invalid transaction: custom error")) {
    return "The contract rejected this proof because its allowlist root has not been initialized. Register the default 64-zero root in Host console, then try the proof again.";
  }
  if (normalized.includes("dust") || normalized.includes("insufficient fee")) {
    return `The proof transaction needs spendable DUST. Fund or activate DUST in 1AM ${network}, wait for sync, then retry.`;
  }
  return message || "The private proof was rejected before finalization.";
}

/**
 * Deployment needs a private-state provider to retain the generated contract
 * maintenance key. The deployment flow only needs that key for this browser
 * session, so it deliberately never writes it to Vercel or localStorage.
 */
class EphemeralPrivateStateProvider
  implements PrivateStateProvider<string, VeilPassPrivateState>
{
  private readonly states = new Map<string, VeilPassPrivateState>();
  private readonly signingKeys = new Map<ContractAddress, SigningKey>();

  setContractAddress(address: ContractAddress): void {
    void address;
  }

  async set(privateStateId: string, state: VeilPassPrivateState): Promise<void> {
    this.states.set(privateStateId, state);
  }

  async get(privateStateId: string): Promise<VeilPassPrivateState | null> {
    return this.states.get(privateStateId) ?? null;
  }

  async remove(privateStateId: string): Promise<void> {
    this.states.delete(privateStateId);
  }

  async clear(): Promise<void> {
    this.states.clear();
  }

  async setSigningKey(address: ContractAddress, signingKey: SigningKey): Promise<void> {
    this.signingKeys.set(address, signingKey);
  }

  async getSigningKey(address: ContractAddress): Promise<SigningKey | null> {
    return this.signingKeys.get(address) ?? null;
  }

  async removeSigningKey(address: ContractAddress): Promise<void> {
    this.signingKeys.delete(address);
  }

  async clearSigningKeys(): Promise<void> {
    this.signingKeys.clear();
  }

  async exportPrivateStates(options?: ExportPrivateStatesOptions): Promise<PrivateStateExport> {
    void options;
    throw new Error("Export is unavailable for the temporary deployment state.");
  }

  async importPrivateStates(
    exportData: PrivateStateExport,
    options?: ImportPrivateStatesOptions,
  ): Promise<{ imported: number; skipped: number; overwritten: number }> {
    void exportData;
    void options;
    throw new Error("Import is unavailable for the temporary deployment state.");
  }

  async exportSigningKeys(): Promise<SigningKeyExport> {
    throw new Error("Export is unavailable for the temporary deployment signing key.");
  }

  async importSigningKeys(
    exportData: SigningKeyExport,
    options?: ImportPrivateStatesOptions,
  ): Promise<{ imported: number; skipped: number; overwritten: number }> {
    void exportData;
    void options;
    throw new Error("Import is unavailable for the temporary deployment signing key.");
  }
}

/**
 * Deploys the compiled contract through 1AM on the selected supported network. Proving is delegated
 * to the wallet, so no local proof server or Docker daemon is involved.
 */
export async function deployVeilPass(
  wallet: ConnectedAPI,
  requestedNetwork: string,
): Promise<VeilPassDeployment> {
  if (typeof window === "undefined") {
    throw new Error("Contract deployment must be started in a browser with a connected Midnight wallet.");
  }

  if (requestedNetwork !== "preview" && requestedNetwork !== "preprod") {
    throw new Error("Deployment is supported only on the preview or preprod network.");
  }

  await wallet.hintUsage([
    "getConfiguration",
    "getShieldedAddresses",
    "getDustBalance",
    "balanceUnsealedTransaction",
    "submitTransaction",
    "getProvingProvider",
  ]);

  const configuration = await wallet.getConfiguration();
  if (configuration.networkId !== requestedNetwork) {
    throw new Error(`Wallet network is ${configuration.networkId}; switch it to ${requestedNetwork} and reconnect.`);
  }

  const dust = await wallet.getDustBalance();
  if (dust.balance <= BigInt(0)) {
    throw new Error("NO_SPENDABLE_DUST");
  }

  const [
    { CompiledContract },
    { deployContract },
    { setNetworkId },
    { FetchZkConfigProvider },
    { indexerPublicDataProvider },
    { createProofProvider },
    { fromHex, toHex },
    ledger,
    generatedContract,
  ] = await Promise.all([
    import("@midnight-ntwrk/compact-js"),
    import("@midnight-ntwrk/midnight-js/contracts"),
    import("@midnight-ntwrk/midnight-js/network-id"),
    import("@midnight-ntwrk/midnight-js-fetch-zk-config-provider"),
    import("@midnight-ntwrk/midnight-js-indexer-public-data-provider"),
    import("@midnight-ntwrk/midnight-js/types"),
    import("@midnight-ntwrk/midnight-js/utils"),
    import("@midnight-ntwrk/ledger-v8"),
    import("../managed/veil-allowlist/contract/index.js"),
  ]);

  setNetworkId(requestedNetwork);
  const addresses = await wallet.getShieldedAddresses();
  const zkConfigProvider = new FetchZkConfigProvider<string>(
    window.location.origin,
    fetchBrowserZkAsset,
  );
  // Delegate proving to 1AM. This keeps the wallet's selected network proving
  // service in control and avoids exposing any proof endpoint in Vercel config.
  const proofProvider = createProofProvider(
    await wallet.getProvingProvider(zkConfigProvider.asKeyMaterialProvider()),
  );

  const privateState = new EphemeralPrivateStateProvider();
  const policy = createSingleMemberPolicy();
  const compiledContract = CompiledContract.make("veil-allowlist", generatedContract.Contract).pipe(
    CompiledContract.withWitnesses({
      private_admin_secret: (context: { privateState: VeilPassPrivateState }) => [
        context.privateState,
        context.privateState.adminSecret,
      ],
      private_credential_commitment: (context: { privateState: VeilPassPrivateState }) => [
        context.privateState,
        context.privateState.credentialCommitment,
      ],
      private_membership_path: (context: { privateState: VeilPassPrivateState }) => [
        context.privateState,
        context.privateState.membershipPath,
      ],
      private_nullifier_secret: (context: { privateState: VeilPassPrivateState }) => [
        context.privateState,
        context.privateState.nullifierSecret,
      ],
    }),
  );

  const walletProvider: WalletProvider = {
    getCoinPublicKey: () => addresses.shieldedCoinPublicKey as unknown as ReturnType<WalletProvider["getCoinPublicKey"]>,
    getEncryptionPublicKey: () => addresses.shieldedEncryptionPublicKey as unknown as ReturnType<WalletProvider["getEncryptionPublicKey"]>,
    async balanceTx(transaction) {
      const balanced = await wallet.balanceUnsealedTransaction(toHex(transaction.serialize()));
      return ledger.Transaction.deserialize("signature", "proof", "binding", fromHex(balanced.tx)) as unknown as Awaited<ReturnType<WalletProvider["balanceTx"]>>;
    },
  };

  const midnightProvider: MidnightProvider = {
    async submitTx(transaction) {
      await wallet.submitTransaction(toHex(transaction.serialize()));
      const [transactionId] = transaction.identifiers();
      if (!transactionId) throw new Error("The wallet finalized a transaction without an identifier.");
      return transactionId;
    },
  };

  const providers = {
      privateStateProvider: privateState,
      publicDataProvider: indexerPublicDataProvider(
        configuration.indexerUri,
        configuration.indexerWsUri,
        window.WebSocket,
      ),
      zkConfigProvider,
      proofProvider,
      walletProvider,
      midnightProvider,
    } as unknown as MidnightProviders;

  const submitDeployment = deployContract as unknown as (
    deploymentProviders: MidnightProviders,
    deploymentOptions: unknown,
  ) => Promise<FinalizedDeployment>;
  const deployed = await submitDeployment(
    providers,
    {
      compiledContract,
      args: [
        policy.privateState.adminSecret,
        policy.root,
        DEFAULT_POLICY_CAPACITY,
        defaultPolicyExpiry(),
      ],
      privateStateId: "veilpass-private-state",
      initialPrivateState: policy.privateState,
    },
  );

  const finalized = deployed.deployTxData.public;
  if (finalized.status !== "SucceedEntirely") {
    throw new Error(`${requestedNetwork} deployment did not finalize. No contract address is being reported.`);
  }

  return {
    contractAddress: deployed.deployTxData.public.contractAddress,
    transactionId: finalized.txId,
    transactionHash: finalized.txHash,
    policyRoot: policy.rootHex,
    // The constructor now atomically installs the initial governed policy.
    initializeDefaultAllowlist: async () => undefined,
    proveAccess: async () => {
      const finalizedProof = await deployed.callTx.prove_access();
      return bytesToHex(finalizedProof.private.result);
    },
    registerAllowlist: async (
      root: string,
      maxPasses = Number(DEFAULT_POLICY_CAPACITY),
      validUntil = Number(defaultPolicyExpiry()),
    ) => {
      await deployed.callTx.rotate_policy(
        hexToField(root),
        BigInt(maxPasses),
        BigInt(validUntil),
      );
    },
    rotateToFreshPolicy: async (
      maxPasses = Number(DEFAULT_POLICY_CAPACITY),
      validUntil = Number(defaultPolicyExpiry()),
    ) => {
      const currentState = await privateState.get("veilpass-private-state");
      if (!currentState) throw new Error("The browser-private policy state is unavailable.");
      const nextPolicy = createSingleMemberPolicy({ adminSecret: currentState.adminSecret });
      await deployed.callTx.rotate_policy(nextPolicy.root, BigInt(maxPasses), BigInt(validUntil));
      await privateState.set("veilpass-private-state", nextPolicy.privateState);
      return nextPolicy.rootHex;
    },
    pausePolicy: async () => {
      await deployed.callTx.pause_policy();
    },
    resumePolicy: async () => {
      await deployed.callTx.resume_policy();
    },
    revokePass: async (passId: string) => {
      await deployed.callTx.revoke_pass(parsePassId(passId));
    },
    validatePass: async (passId: string) => {
      const validation = await deployed.callTx.validate_pass(parsePassId(passId));
      return validation.private.result;
    },
  };
}
