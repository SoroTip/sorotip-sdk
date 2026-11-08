/**
 * Smoke-tests this SDK against a real, deployed SoroTip contract over real
 * Soroban RPC — not a mock, not a unit test. Run it yourself; it is not run
 * in CI, since it needs a live contract and (for the write check) a funded
 * secret key.
 *
 * Usage:
 *
 *   SOROTIP_CONTRACT_ID=C... \
 *   SOROTIP_NETWORK=testnet \
 *   npx tsx scripts/smoke.ts
 *
 * Env vars:
 *   SOROTIP_CONTRACT_ID   (required) the deployed contract id to test against.
 *   SOROTIP_NETWORK       "testnet" | "mainnet" | "futurenet" (default: "testnet").
 *   SOROTIP_RPC_URL       Override the default RPC URL for the network.
 *   SOROTIP_SECRET_KEY    (optional) a funded account's Stellar secret seed
 *                         (S...). If set, also runs one real signed write
 *                         call (register_creator, which is idempotent — safe
 *                         to run against an already-registered key) to prove
 *                         the full sign-and-submit path works, not just
 *                         reads. Without it, only read-only checks run.
 *
 * SoroTipClient's write methods go through the Freighter browser extension
 * (see src/wallet.ts) and can't run in plain Node, so the write check here
 * uses @stellar/stellar-sdk's contract.Client directly with
 * contract.basicNodeSigner (a Keypair-based signer the library ships
 * specifically "for testing and...simple Node applications") instead of
 * going through SoroTipClient.
 *
 * Imports from "../dist/index.cjs" (the built CJS output), not "../src" or
 * the ESM dist build: @stellar/freighter-api ships a single minified CJS
 * bundle with no "exports" map, and Node's native ESM loader can't
 * statically detect its named exports (cjs-module-lexer limitation on
 * minified code) — a bundler (tsup, webpack, vite) can and does, which is
 * why the published package works fine for real consumers and in this
 * repo's own vitest-run tests, just not under plain `node`/`tsx` ESM
 * execution. Loading the CJS build via a default import sidesteps that:
 * Node just hands back the whole `module.exports` object instead of trying
 * to detect named exports from it. Run `npm run build` first (the "smoke"
 * npm script does this for you).
 */
import { Keypair, contract } from "@stellar/stellar-sdk";

import sorotipSdk from "../dist/index.cjs";
import type { SoroTipNetwork } from "../src/types";

const { SoroTipClient } = sorotipSdk;

const NETWORK_PASSPHRASES: Record<SoroTipNetwork, string> = {
  testnet: "Test SDF Network ; September 2015",
  mainnet: "Public Global Stellar Network ; September 2015",
  futurenet: "Test SDF Future Network ; October 2022",
};

const DEFAULT_RPC_URLS: Partial<Record<SoroTipNetwork, string>> = {
  testnet: "https://soroban-testnet.stellar.org",
  futurenet: "https://rpc-futurenet.stellar.org",
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

async function main(): Promise<void> {
  const contractId = requireEnv("SOROTIP_CONTRACT_ID");
  const network = (process.env.SOROTIP_NETWORK ?? "testnet") as SoroTipNetwork;
  const rpcUrl = process.env.SOROTIP_RPC_URL;
  const secretKey = process.env.SOROTIP_SECRET_KEY;

  console.log(`SoroTip SDK smoke test — network=${network} contract=${contractId}`);

  const client = new SoroTipClient({
    network,
    contractId,
    ...(rpcUrl ? { rpcUrl } : {}),
  });

  console.log("\n-- Read-only checks --");

  const stats = await client.getProtocolStats();
  console.log("getProtocolStats():", stats);

  const fee = await client.getFee();
  console.log("getFee():", fee, "basis points");

  const top = await client.getTopCreators(5);
  console.log("getTopCreators(5):", top.length, "entries");

  if (!secretKey) {
    console.log(
      "\nSOROTIP_SECRET_KEY not set — skipping the real write check. " +
        "Set it to a funded account's secret seed to also smoke-test a real signed submission.",
    );
    return;
  }

  console.log("\n-- Write check (real signed transaction) --");

  const keypair = Keypair.fromSecret(secretKey);
  const networkPassphrase = NETWORK_PASSPHRASES[network];
  const signer = contract.basicNodeSigner(keypair, networkPassphrase);
  const resolvedRpcUrl = rpcUrl ?? DEFAULT_RPC_URLS[network];
  if (!resolvedRpcUrl) {
    throw new Error(`No default RPC URL for network "${network}" — set SOROTIP_RPC_URL.`);
  }

  const rawClient = await contract.Client.from({
    contractId,
    networkPassphrase,
    rpcUrl: resolvedRpcUrl,
    publicKey: keypair.publicKey(),
    ...signer,
  });

  console.log(`Registering ${keypair.publicKey()} as a creator (idempotent if already registered)...`);
  const tx = await (
    rawClient as unknown as {
      register_creator(args: {
        wallet: string;
        name: string;
        bio: string;
        avatar_ipfs: string;
      }): Promise<contract.AssembledTransaction<bigint>>;
    }
  ).register_creator({
    wallet: keypair.publicKey(),
    name: "SDK Smoke Test",
    bio: "Created by scripts/smoke.ts",
    avatar_ipfs: "",
  });
  const sent = await tx.signAndSend();
  console.log("register_creator submitted:", sent.sendTransactionResponse?.hash);

  const profile = await client.getProfile(keypair.publicKey());
  console.log("getProfile() read back:", profile);
}

main()
  .then(() => {
    console.log("\nSmoke test passed.");
  })
  .catch((err: unknown) => {
    console.error("\nSmoke test failed:", err);
    process.exitCode = 1;
  });
