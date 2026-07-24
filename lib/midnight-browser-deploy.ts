import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import type { ContractAddress, SigningKey } from "@midnight-ntwrk/compact-runtime";
import type {
  ExportPrivateStatesOptions,
  ImportPrivateStatesOptions,
  PrivateStateExport,
  PrivateStateProvider,
  SigningKeyExport,
} from "@midnight-ntwrk/midnight-js/types";

type VeilPassPrivateState = {
  credentialCommitment: Uint8Array;
  isEligible: boolean;
};

export type VeilPassDeployment = {
  contractAddress: string;
  proveAccess: () => Promise<void>;
};

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
 * Deploys the compiled contract through a connected Midnight wallet. With 1AM
 * on Preview or Preprod, proving is delegated to the wallet, so no local proof server or
 * Docker daemon is involved.
 */
export async function deployVeilPass(
  wallet: ConnectedAPI,
  requestedNetwork: string,
): Promise<VeilPassDeployment> {
  if (typeof window === "undefined") {
    throw new Error("Contract deployment must be started in a browser with a connected Midnight wallet.");
  }

  await wallet.hintUsage([
    "getConfiguration",
    "getShieldedAddresses",
    "balanceUnsealedTransaction",
    "submitTransaction",
    "getProvingProvider",
  ]);

  const configuration = await wallet.getConfiguration();
  if (configuration.networkId !== requestedNetwork) {
    throw new Error(`Wallet network is ${configuration.networkId}; switch it to ${requestedNetwork} and reconnect.`);
  }

  const [
    { CompiledContract },
    { deployContract },
    { setNetworkId },
    { FetchZkConfigProvider },
    { httpClientProofProvider },
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
    import("@midnight-ntwrk/midnight-js-http-client-proof-provider"),
    import("@midnight-ntwrk/midnight-js-indexer-public-data-provider"),
    import("@midnight-ntwrk/midnight-js/types"),
    import("@midnight-ntwrk/midnight-js/utils"),
    import("@midnight-ntwrk/ledger-v8"),
    import("../managed/veil-allowlist/contract/index.js"),
  ]);

  setNetworkId(requestedNetwork);
  const addresses = await wallet.getShieldedAddresses();
  const zkConfigProvider = new FetchZkConfigProvider<string>(window.location.origin);
  const proofProvider = configuration.proverServerUri
    ? httpClientProofProvider(configuration.proverServerUri, zkConfigProvider)
    : createProofProvider(await wallet.getProvingProvider(zkConfigProvider.asKeyMaterialProvider()));

  const privateState = new EphemeralPrivateStateProvider();
  const compiledContract = CompiledContract.make("veil-allowlist", generatedContract.Contract).pipe(
    CompiledContract.withWitnesses({
      private_credential_commitment: (context) => [
        context.privateState,
        context.privateState.credentialCommitment,
      ],
      private_is_eligible: (context) => [context.privateState, context.privateState.isEligible],
    }),
  );

  const walletProvider = {
    getCoinPublicKey: () => addresses.shieldedCoinPublicKey,
    getEncryptionPublicKey: () => addresses.shieldedEncryptionPublicKey,
    async balanceTx(transaction: InstanceType<typeof ledger.Transaction>) {
      const balanced = await wallet.balanceUnsealedTransaction(toHex(transaction.serialize()));
      return ledger.Transaction.deserialize("signature", "proof", "binding", fromHex(balanced.tx));
    },
  };

  const midnightProvider = {
    async submitTx(transaction: InstanceType<typeof ledger.Transaction>) {
      await wallet.submitTransaction(toHex(transaction.serialize()));
      const [transactionId] = transaction.identifiers();
      if (!transactionId) throw new Error("The wallet finalized a transaction without an identifier.");
      return transactionId;
    },
  };

  const deployed = await deployContract(
    {
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
    },
    {
      compiledContract,
      privateStateId: "veilpass-private-state",
      initialPrivateState: {
        credentialCommitment: new Uint8Array(32),
        isEligible: true,
      },
    },
  );

  return {
    contractAddress: deployed.deployTxData.public.contractAddress,
    proveAccess: async () => {
      await deployed.callTx.prove_access();
    },
  };
}
