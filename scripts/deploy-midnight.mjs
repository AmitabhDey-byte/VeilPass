import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Buffer } from 'node:buffer';

import * as Rx from 'rxjs';
import { WebSocket } from 'ws';

import * as ledger from '@midnight-ntwrk/ledger-v8';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { deployContract } from '@midnight-ntwrk/midnight-js/contracts';
import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js/network-id';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { toHex } from '@midnight-ntwrk/midnight-js/utils';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { HDWallet, Roles, generateRandomSeed } from '@midnight-ntwrk/wallet-sdk-hd';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import {
  createKeystore,
  InMemoryTransactionHistoryStorage,
  PublicKey,
  UnshieldedWallet,
} from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';

globalThis.WebSocket = WebSocket;

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..');
const generatedContractPath = path.join(repoRoot, 'managed', 'veil-allowlist', 'contract', 'index.js');
const zkConfigPath = path.join(repoRoot, 'managed', 'veil-allowlist');
const localStatePath = path.join(repoRoot, '.midnight-deployments.local.json');

const networks = {
  preview: {
    indexer: 'https://indexer.preview.midnight.network/api/v3/graphql',
    indexerWS: 'wss://indexer.preview.midnight.network/api/v3/graphql/ws',
    node: 'https://rpc.preview.midnight.network',
    faucet: 'https://midnight-tmnight-preview.nethermind.dev/',
  },
  preprod: {
    indexer: 'https://indexer.preprod.midnight.network/api/v3/graphql',
    indexerWS: 'wss://indexer.preprod.midnight.network/api/v3/graphql/ws',
    node: 'https://rpc.preprod.midnight.network',
    faucet: 'https://midnight-tmnight-preprod.nethermind.dev/',
  },
};

function getArgument(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  const inline = process.argv.find((argument) => argument.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : fallback;
}

const network = getArgument('--network', process.env.MIDNIGHT_NETWORK || 'preprod');
const force = process.argv.includes('--force');

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: npm run contracts:deploy -- --network preprod|preview [--force]');
  console.log('MIDNIGHT_SEED may be set to restore a previously generated wallet.');
  process.exit(0);
}

const networkConfig = networks[network];

if (!networkConfig) {
  throw new Error('Unknown network. Use --network preview or --network preprod.');
}

if (!fs.existsSync(generatedContractPath) || !fs.existsSync(zkConfigPath)) {
  throw new Error('Managed contract output is missing. Run npm run contracts:compile first.');
}

setNetworkId(network);

const generatedContract = await import(pathToFileURL(generatedContractPath).href);
const compiledContract = CompiledContract.make('veil-allowlist', generatedContract.Contract).pipe(
  CompiledContract.withWitnesses({
    private_credential_commitment: (context) => [context.privateState, context.privateState.credentialCommitment],
    private_is_eligible: (context) => [context.privateState, context.privateState.isEligible],
  }),
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);

function readLocalState() {
  if (!fs.existsSync(localStatePath)) return { deployments: {} };
  return JSON.parse(fs.readFileSync(localStatePath, 'utf8'));
}

function saveLocalState(state) {
  fs.writeFileSync(localStatePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function getSeed(state) {
  const fromEnvironment = process.env.MIDNIGHT_SEED?.trim();
  const fromLocalState = state.deployments?.[network]?.seed;
  const seed = fromEnvironment || fromLocalState || toHex(Buffer.from(generateRandomSeed()));

  if (!/^[0-9a-fA-F]{64}$/.test(seed)) {
    throw new Error('MIDNIGHT_SEED must be exactly 64 hexadecimal characters.');
  }

  return seed.toLowerCase();
}

function buildNetworkConfig() {
  return {
    ...networkConfig,
    indexer: process.env.MIDNIGHT_INDEXER || networkConfig.indexer,
    indexerWS: process.env.MIDNIGHT_INDEXER_WS || networkConfig.indexerWS,
    node: process.env.MIDNIGHT_NODE || networkConfig.node,
    proofServer: process.env.MIDNIGHT_PROOF_SERVER || 'http://127.0.0.1:6300',
  };
}

function deriveKeys(seed) {
  const hdWallet = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
  if (hdWallet.type !== 'seedOk') throw new Error('Could not initialize the HD wallet from the seed.');

  const result = hdWallet.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);

  if (result.type !== 'keysDerived') throw new Error('Could not derive Midnight wallet keys.');
  hdWallet.hdWallet.clear();
  return result.keys;
}

async function waitForSynced(wallet) {
  return Rx.firstValueFrom(wallet.state().pipe(Rx.filter((state) => state.isSynced)));
}

function getUnshieldedBalance(state) {
  return state.unshielded.balances[ledger.unshieldedToken().raw] ?? 0n;
}

function buildWalletConfig(config) {
  const indexerClientConnection = {
    indexerHttpUrl: config.indexer,
    indexerWsUrl: config.indexerWS,
  };

  return {
    networkId: getNetworkId(),
    indexerClientConnection,
    provingServerUrl: new URL(config.proofServer),
    relayURL: new URL(config.node.replace(/^http/, 'ws')),
    txHistoryStorage: new InMemoryTransactionHistoryStorage(),
    costParameters: {
      additionalFeeOverhead: 300_000_000_000_000n,
      feeBlocksMargin: 5,
    },
  };
}

async function createWallet(config, seed) {
  const keys = deriveKeys(seed);
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], getNetworkId());
  const walletConfig = buildWalletConfig(config);

  const wallet = await WalletFacade.init({
    configuration: walletConfig,
    shielded: (configuration) => ShieldedWallet(configuration).startWithSecretKeys(shieldedSecretKeys),
    unshielded: (configuration) =>
      // The unshielded wallet only needs the indexer connection and local history storage.
      // Keeping this separate prevents private keys from entering browser or Vercel code.
      UnshieldedWallet(configuration).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
    dust: (configuration) =>
      DustWallet(configuration).startWithSecretKey(
        dustSecretKey,
        ledger.LedgerParameters.initialParameters().dust,
      ),
  });

  await wallet.start(shieldedSecretKeys, dustSecretKey);
  return { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore };
}

function signTransactionIntents(transaction, signFn, proofMarker) {
  if (!transaction.intents || transaction.intents.size === 0) return;

  for (const segment of transaction.intents.keys()) {
    const intent = transaction.intents.get(segment);
    if (!intent) continue;

    const cloned = ledger.Intent.deserialize(
      'signature',
      proofMarker,
      'pre-binding',
      intent.serialize(),
    );
    const signature = signFn(cloned.signatureData(segment));

    if (cloned.fallibleUnshieldedOffer) {
      const signatures = cloned.fallibleUnshieldedOffer.inputs.map(
        (_input, index) => cloned.fallibleUnshieldedOffer.signatures.at(index) ?? signature,
      );
      cloned.fallibleUnshieldedOffer = cloned.fallibleUnshieldedOffer.addSignatures(signatures);
    }

    if (cloned.guaranteedUnshieldedOffer) {
      const signatures = cloned.guaranteedUnshieldedOffer.inputs.map(
        (_input, index) => cloned.guaranteedUnshieldedOffer.signatures.at(index) ?? signature,
      );
      cloned.guaranteedUnshieldedOffer = cloned.guaranteedUnshieldedOffer.addSignatures(signatures);
    }

    transaction.intents.set(segment, cloned);
  }
}

async function createProviders(walletContext, config) {
  const syncedState = await waitForSynced(walletContext.wallet);
  const coinPublicKey = syncedState.shielded.coinPublicKey.toHexString();
  const encryptionPublicKey = syncedState.shielded.encryptionPublicKey.toHexString();

  const walletProvider = {
    getCoinPublicKey: () => coinPublicKey,
    getEncryptionPublicKey: () => encryptionPublicKey,
    async balanceTx(transaction, ttl) {
      const recipe = await walletContext.wallet.balanceUnboundTransaction(
        transaction,
        {
          shieldedSecretKeys: walletContext.shieldedSecretKeys,
          dustSecretKey: walletContext.dustSecretKey,
        },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );

      const signFn = (payload) => walletContext.unshieldedKeystore.signData(payload);
      signTransactionIntents(recipe.baseTransaction, signFn, 'proof');
      if (recipe.balancingTransaction) {
        signTransactionIntents(recipe.balancingTransaction, signFn, 'pre-proof');
      }

      return walletContext.wallet.finalizeRecipe(recipe);
    },
    submitTx: (transaction) => walletContext.wallet.submitTransaction(transaction),
  };

  const storagePassword = `${Buffer.from(coinPublicKey, 'hex').toString('base64')}!`;
  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'veilpass-private-state',
      accountId: coinPublicKey,
      privateStoragePasswordProvider: () => storagePassword,
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };
}

async function waitForFunds(wallet, address, faucet) {
  let state = await waitForSynced(wallet);
  const existingBalance = getUnshieldedBalance(state);
  if (existingBalance > 0n) return state;

  console.log(`\nNo tNIGHT balance found yet.`);
  console.log(`Send test tokens to this unshielded address:`);
  console.log(`\n  ${address}\n`);
  console.log(`Faucet: ${faucet}`);
  console.log('Waiting for the wallet to receive funds...');

  state = await Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.filter((nextState) => nextState.isSynced),
      Rx.filter((nextState) => getUnshieldedBalance(nextState) > 0n),
    ),
  );
  return state;
}

async function ensureDust(wallet, unshieldedKeystore) {
  let state = await waitForSynced(wallet);
  if (state.dust.balance(new Date()) > 0n) return state;

  const unregisteredCoins = state.unshielded.availableCoins.filter(
    (coin) => coin.meta?.registeredForDustGeneration !== true,
  );

  if (unregisteredCoins.length > 0) {
    console.log(`Registering ${unregisteredCoins.length} tNIGHT UTXO(s) for DUST generation...`);
    const recipe = await wallet.registerNightUtxosForDustGeneration(
      unregisteredCoins,
      unshieldedKeystore.getPublicKey(),
      (payload) => unshieldedKeystore.signData(payload),
    );
    const finalized = await wallet.finalizeRecipe(recipe);
    await wallet.submitTransaction(finalized);
  }

  console.log('Waiting for DUST generation...');
  state = await Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.filter((nextState) => nextState.isSynced),
      Rx.filter((nextState) => nextState.dust.balance(new Date()) > 0n),
    ),
  );
  return state;
}

const state = readLocalState();
const previousDeployment = state.deployments?.[network];

if (previousDeployment?.contractAddress && !force) {
  console.log(`A ${network} deployment is already recorded:`);
  console.log(`\n  ${previousDeployment.contractAddress}\n`);
  console.log('Use --force only when you intentionally want to deploy another contract.');
  process.exit(0);
}

const seed = getSeed(state);
state.deployments ??= {};
state.deployments[network] = { seed, updatedAt: new Date().toISOString() };
saveLocalState(state);

const config = buildNetworkConfig();
const walletContext = await createWallet(config, seed);
const address = walletContext.unshieldedKeystore.getBech32Address();

console.log(`\nVeilPass Midnight deployment (${network})`);
console.log(`Wallet address: ${address}`);
console.log(`Proof server: ${config.proofServer}`);

try {
  await waitForFunds(walletContext.wallet, address, config.faucet);
  await ensureDust(walletContext.wallet, walletContext.unshieldedKeystore);

  console.log('Deploying VeilPass contract. Keep this terminal open...');
  const providers = await createProviders(walletContext, config);
  const deployed = await deployContract(providers, {
    compiledContract,
    privateStateId: 'veilpass-private-state',
    initialPrivateState: {
      credentialCommitment: new Uint8Array(32),
      isEligible: true,
    },
  });

  const contractAddress = deployed.deployTxData.public.contractAddress;
  state.deployments[network] = {
    seed,
    contractAddress,
    updatedAt: new Date().toISOString(),
  };
  saveLocalState(state);

  console.log(`\nContract deployed at: ${contractAddress}`);
  console.log(`Network: ${network}`);
  console.log(`Saved locally in ${path.basename(localStatePath)} (gitignored).`);
  console.log('\nCopy this full address into README.md and Vercel:');
  console.log(`NEXT_PUBLIC_MIDNIGHT_CONTRACT_ADDRESS=${contractAddress}`);
} finally {
  if (typeof walletContext.wallet.stop === 'function') await walletContext.wallet.stop();
}
