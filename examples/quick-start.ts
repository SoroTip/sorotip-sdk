/**
 * The exact "Quick Start" code sample from README.md, kept here so it is
 * typechecked by `npm run typecheck` (and therefore CI) — a change that
 * breaks this file means the README's code sample no longer compiles.
 *
 * This file is never executed; `void` discards the floating promises so
 * `tsc --noEmit` only checks types, it does not require `--isolatedModules`
 * top-level-await workarounds.
 */
import { SoroTipClient, connectWallet } from "../src/index";

const client = new SoroTipClient({
  network: "testnet",
  contractId: "CA...", // your deployed SoroTip contract id
});

async function quickStart(): Promise<void> {
  // Connect the user's Freighter wallet (prompts if not already authorized)
  const publicKey = await connectWallet();
  void publicKey;

  // Register as a creator
  const { profileId, txHash } = await client.registerCreator({
    name: "Ada",
    bio: "Building on Stellar",
    avatarIpfs: "Qm...",
  });
  void profileId;
  void txHash;

  // Send a tip (amount is a decimal USDC string)
  await client.tip({
    to: "GDESTINATIONADDRESS...",
    amount: "5",
    messageIpfs: "",
  });

  // Open a $3/month subscription
  await client.subscribe({ to: "GDESTINATIONADDRESS...", amountPerMonth: "3" });

  // Read a creator's public profile — no wallet connection needed
  const profile = await client.getProfile("GDESTINATIONADDRESS...");
  void profile;
}

void quickStart;
