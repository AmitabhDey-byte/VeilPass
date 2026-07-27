import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import type { ContractAddress, SigningKey } from "@midnight-ntwrk/compact-runtime";
import "./browser-polyfills";
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

type VeilPassPrivateState = {
  credentialCommitment: Uint8Array;
  isEligible: boolean;
};

type FinalizedPreviewDeployment = {
  deployTxData: {
    public: {
      contractAddress: string;
      status: string;
      txId: string;
      txHash: string;
    };
  };
  callTx: {
    prove_access(): Promise<void>;
    register_allowlist_root(root: Uint8Array): Promise<void>;
  };
};

export type VeilPassDeployment = {
  contractAddress: string;
  transactionId: string;
  transactionHash: string;
  proveAccess: () => Promise<void>;
  registerAllowlist: (root: string) => Promise<void>;
};

const PREVIEW_NETWORK_ID = "preview";

/** Convert wallet, indexer, and proving failures into useful browser-safe text. */
export function describePreviewDeploymentError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes("no_spendable_dust") || normalized.includes("dust") || normalized.includes("insufficient fee")) {
    return "No spendable DUST is available for this Preview deployment. Fund or activate DUST in 1AM, wait for it to sync, then try again.";
  }
  if (normalized.includes("prover") || normalized.includes("proving") || normalized.includes("proof server")) {
    return "1AM could not reach its configured Preview proving service. Check the wallet's Preview network settings and try again once the proving service is available.";
  }
  if (normalized.includes("indexer") || normalized.includes("websocket")) {
    return "1AM's configured Preview indexer is unavailable. Check the wallet's Preview network settings, then reconnect and retry.";
  }
  if (normalized.includes("rejected") || normalized.includes("denied")) {
    return "The Preview deployment was rejected in 1AM. No contract was deployed.";
  }
  return message || "Preview deployment failed before a contract was finalized.";
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
 * Deploys the compiled contract through 1AM on Preview. Proving is delegated
 * to the wallet, so no local proof server or Docker daemon is involved.
 */
export async function deployVeilPass(
  wallet: ConnectedAPI,
  requestedNetwork: string,
): Promise<VeilPassDeployment> {
  if (typeof window === "undefined") {
    throw new Error("Contract deployment must be started in a browser with a connected Midnight wallet.");
  }

  if (requestedNetwork !== PREVIEW_NETWORK_ID) {
    throw new Error("Preview deployment is only available on the preview network.");
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
  const zkConfigProvider = new FetchZkConfigProvider<string>(window.location.origin);
  // Delegate proving to 1AM. This keeps the wallet's selected Preview proving
  // service in control and avoids exposing any proof endpoint in Vercel config.
  const proofProvider = createProofProvider(
    await wallet.getProvingProvider(zkConfigProvider.asKeyMaterialProvider()),
  );

  const privateState = new EphemeralPrivateStateProvider();
  const compiledContract = CompiledContract.make("veil-allowlist", generatedContract.Contract).pipe(
    CompiledContract.withWitnesses({
      private_credential_commitment: (context: { privateState: VeilPassPrivateState }) => [
        context.privateState,
        context.privateState.credentialCommitment,
      ],
      private_is_eligible: (context: { privateState: VeilPassPrivateState }) => [context.privateState, context.privateState.isEligible],
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

  const submitPreviewDeployment = deployContract as unknown as (
    deploymentProviders: MidnightProviders,
    deploymentOptions: unknown,
  ) => Promise<FinalizedPreviewDeployment>;
  const deployed = await submitPreviewDeployment(
    providers,
    {
      compiledContract,
      privateStateId: "veilpass-private-state",
      initialPrivateState: {
        credentialCommitment: new Uint8Array(32),
        isEligible: true,
      },
    },
  );

  const finalized = deployed.deployTxData.public;
  if (finalized.status !== "SucceedEntirely") {
    throw new Error("Preview deployment did not finalize. No contract address is being reported.");
  }

  return {
    contractAddress: deployed.deployTxData.public.contractAddress,
    transactionId: finalized.txId,
    transactionHash: finalized.txHash,
    proveAccess: async () => {
      await deployed.callTx.prove_access();
    },
    registerAllowlist: async (root: string) => {
      if (root.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(root)) {
        throw new Error("Allowlist root must be exactly 64 hex characters.");
      }
      const bytes = new Uint8Array(32);
      for (let i = 0; i < 32; i += 1) {
        bytes[i] = parseInt(root.slice(i * 2, i * 2 + 2), 16);
      }
      await deployed.callTx.register_allowlist_root(bytes);
    },
  };
}
