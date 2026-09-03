import { Networks, contract } from "@stellar/stellar-sdk";
import { signTransaction as freighterSignTransaction } from "@stellar/freighter-api";

import { getPublicKey } from "./wallet";
import { toStroops } from "./utils";
import type {
  CreatorProfile,
  LeaderboardEntry,
  ProtocolStats,
  RegisterParams,
  SoroTipClientConfig,
  SoroTipNetwork,
  Subscription,
  SubscribeParams,
  Tip,
  TipGoal,
  TipGoalParams,
  TipParams,
} from "./types";

const NETWORK_PASSPHRASES: Record<SoroTipNetwork, string> = {
  testnet: Networks.TESTNET,
  mainnet: Networks.PUBLIC,
  futurenet: Networks.FUTURENET,
};

type Tx<T> = Promise<contract.AssembledTransaction<T>>;

/**
 * Typed shape of the deployed `tip` contract's dynamically-generated methods,
 * as produced by {@link contract.Client.from}. Argument object keys and casing
 * must match the contract's Rust parameter names exactly — the SDK converts
 * them positionally by name, not by JS naming convention.
 */
interface TipContractMethods {
  register_creator(
    args: { wallet: string; name: string; bio: string; avatar_ipfs: string },
    options?: contract.MethodOptions,
  ): Tx<bigint>;
  update_profile(
    args: { wallet: string; name: string; bio: string; avatar_ipfs: string },
    options?: contract.MethodOptions,
  ): Tx<void>;
  tip(
    args: { from: string; to: string; amount: bigint; message_ipfs: string },
    options?: contract.MethodOptions,
  ): Tx<bigint>;
  subscribe(
    args: { from: string; to: string; amount_per_month: bigint },
    options?: contract.MethodOptions,
  ): Tx<bigint>;
  cancel_subscription(
    args: { from: string; subscription_id: bigint },
    options?: contract.MethodOptions,
  ): Tx<void>;
  process_due_subscriptions(options?: contract.MethodOptions): Tx<number>;
  set_tip_goal(
    args: { creator: string; goal_amount: bigint; description: string },
    options?: contract.MethodOptions,
  ): Tx<bigint>;
  get_profile(args: { wallet: string }, options?: contract.MethodOptions): Tx<RawCreatorProfile>;
  get_tip_history(
    args: { wallet: string; limit: number },
    options?: contract.MethodOptions,
  ): Tx<RawTip[]>;
  get_subscriptions_by_supporter(
    args: { supporter: string },
    options?: contract.MethodOptions,
  ): Tx<RawSubscription[]>;
  get_subscriptions_by_creator(
    args: { creator: string },
    options?: contract.MethodOptions,
  ): Tx<RawSubscription[]>;
  get_tip_goal(
    args: { creator: string },
    options?: contract.MethodOptions,
  ): Tx<RawTipGoal | undefined>;
  get_protocol_stats(options?: contract.MethodOptions): Tx<RawProtocolStats>;
  get_top_creators(
    args: { limit: number },
    options?: contract.MethodOptions,
  ): Tx<RawLeaderboardEntry[]>;
}

/** Public Soroban RPC endpoints with a well-known default. Mainnet has none — pass `rpcUrl` explicitly. */
const DEFAULT_RPC_URLS: Partial<Record<SoroTipNetwork, string>> = {
  testnet: "https://soroban-testnet.stellar.org",
  futurenet: "https://rpc-futurenet.stellar.org",
};

/** Converts a raw contract timestamp (Unix seconds) into a JS {@link Date}. */
function toDate(seconds: bigint | number): Date {
  return new Date(Number(seconds) * 1000);
}

/** Raw shape returned by the contract for a `CreatorProfile`, before mapping to the SDK's public type. */
interface RawCreatorProfile {
  id: bigint;
  wallet: string;
  name: string;
  bio: string;
  avatar_ipfs: string;
  total_received: bigint;
  tip_count: number;
  subscriber_count: number;
  registered_at: bigint;
}

interface RawTip {
  id: bigint;
  from: string;
  to: string;
  amount: bigint;
  fee_paid: bigint;
  message_ipfs: string;
  timestamp: bigint;
}

interface RawSubscription {
  id: bigint;
  supporter: string;
  creator: string;
  amount_per_month: bigint;
  next_charge_date: bigint;
  active: boolean;
  created_at: bigint;
}

interface RawTipGoal {
  id: bigint;
  creator: string;
  goal_amount: bigint;
  current_amount: bigint;
  description: string;
  completed: boolean;
  created_at: bigint;
}

interface RawProtocolStats {
  total_tips: number;
  total_volume: bigint;
  total_creators: number;
  total_subscriptions: number;
  fee_collected: bigint;
}

interface RawLeaderboardEntry {
  wallet: string;
  name: string;
  total_received: bigint;
  tip_count: number;
}

function mapProfile(raw: RawCreatorProfile): CreatorProfile {
  return {
    id: raw.id.toString(),
    wallet: raw.wallet,
    name: raw.name,
    bio: raw.bio,
    avatarIpfs: raw.avatar_ipfs,
    totalReceived: raw.total_received.toString(),
    tipCount: raw.tip_count,
    subscriberCount: raw.subscriber_count,
    registeredAt: toDate(raw.registered_at),
  };
}

function mapTip(raw: RawTip): Tip {
  return {
    id: raw.id.toString(),
    from: raw.from,
    to: raw.to,
    amount: raw.amount.toString(),
    feePaid: raw.fee_paid.toString(),
    messageIpfs: raw.message_ipfs,
    timestamp: toDate(raw.timestamp),
  };
}

function mapSubscription(raw: RawSubscription): Subscription {
  return {
    id: raw.id.toString(),
    supporter: raw.supporter,
    creator: raw.creator,
    amountPerMonth: raw.amount_per_month.toString(),
    nextChargeDate: toDate(raw.next_charge_date),
    active: raw.active,
    createdAt: toDate(raw.created_at),
  };
}

function mapGoal(raw: RawTipGoal): TipGoal {
  const goalAmount = raw.goal_amount;
  const currentAmount = raw.current_amount;
  const progressPercent =
    goalAmount > 0n
      ? Math.max(0, Math.min(100, Number((currentAmount * 10000n) / goalAmount) / 100))
      : 0;
  return {
    id: raw.id.toString(),
    creator: raw.creator,
    goalAmount: goalAmount.toString(),
    currentAmount: currentAmount.toString(),
    description: raw.description,
    completed: raw.completed,
    progressPercent,
  };
}

function mapStats(raw: RawProtocolStats): ProtocolStats {
  return {
    totalTips: raw.total_tips,
    totalVolume: raw.total_volume.toString(),
    totalCreators: raw.total_creators,
    totalSubscriptions: raw.total_subscriptions,
    feeCollected: raw.fee_collected.toString(),
  };
}

function mapLeaderboardEntry(raw: RawLeaderboardEntry): LeaderboardEntry {
  return {
    wallet: raw.wallet,
    name: raw.name,
    totalReceived: raw.total_received.toString(),
    tipCount: raw.tip_count,
  };
}

/**
 * Client for interacting with the SoroTip on-chain tipping and creator
 * monetization contract on Stellar Soroban.
 *
 * Write methods (registering, tipping, subscribing, ...) sign transactions
 * through the connected Freighter wallet — call {@link connectWallet} from
 * `./wallet` first. Read methods work without a connected wallet.
 */
export class SoroTipClient {
  private readonly contractId: string;
  private readonly rpcUrl: string;
  private readonly networkPassphrase: string;

  constructor(config: SoroTipClientConfig) {
    const rpcUrl = config.rpcUrl ?? DEFAULT_RPC_URLS[config.network];
    if (!rpcUrl) {
      throw new Error(
        `No default RPC URL for network "${config.network}" — pass "rpcUrl" explicitly in SoroTipClientConfig.`,
      );
    }
    this.contractId = config.contractId;
    this.rpcUrl = rpcUrl;
    this.networkPassphrase = NETWORK_PASSPHRASES[config.network];
  }

  private async buildClient(
    publicKey?: string,
  ): Promise<contract.Client & TipContractMethods> {
    return contract.Client.from<TipContractMethods>({
      contractId: this.contractId,
      networkPassphrase: this.networkPassphrase,
      rpcUrl: this.rpcUrl,
      publicKey,
      signTransaction: freighterSignTransaction,
    });
  }

  /** Builds a client authenticated as the currently connected Freighter wallet, for write calls. */
  private async buildSignedClient(): Promise<{
    client: contract.Client & TipContractMethods;
    publicKey: string;
  }> {
    const publicKey = await getPublicKey();
    const client = await this.buildClient(publicKey);
    return { client, publicKey };
  }

  /**
   * Registers (or, if already registered, returns the existing profile id
   * for) the connected wallet as a creator.
   */
  async registerCreator(
    params: RegisterParams,
  ): Promise<{ profileId: string; txHash: string }> {
    const { client, publicKey } = await this.buildSignedClient();
    const tx = await client.register_creator({
      wallet: publicKey,
      name: params.name,
      bio: params.bio,
      avatar_ipfs: params.avatarIpfs,
    });
    const sent = await tx.signAndSend();
    return {
      profileId: sent.result.toString(),
      txHash: sent.sendTransactionResponse!.hash,
    };
  }

  /** Updates the connected wallet's creator profile. */
  async updateProfile(params: RegisterParams): Promise<{ txHash: string }> {
    const { client, publicKey } = await this.buildSignedClient();
    const tx = await client.update_profile({
      wallet: publicKey,
      name: params.name,
      bio: params.bio,
      avatar_ipfs: params.avatarIpfs,
    });
    const sent = await tx.signAndSend();
    return { txHash: sent.sendTransactionResponse!.hash };
  }

  /** Sends a one-time tip from the connected wallet to `params.to`. */
  async tip(params: TipParams): Promise<{ tipId: string; txHash: string }> {
    const { client, publicKey } = await this.buildSignedClient();
    const tx = await client.tip({
      from: publicKey,
      to: params.to,
      amount: toStroops(params.amount),
      message_ipfs: params.messageIpfs ?? "",
    });
    const sent = await tx.signAndSend();
    return {
      tipId: sent.result.toString(),
      txHash: sent.sendTransactionResponse!.hash,
    };
  }

  /** Opens a recurring monthly subscription from the connected wallet to `params.to`. */
  async subscribe(
    params: SubscribeParams,
  ): Promise<{ subscriptionId: string; txHash: string }> {
    const { client, publicKey } = await this.buildSignedClient();
    const tx = await client.subscribe({
      from: publicKey,
      to: params.to,
      amount_per_month: toStroops(params.amountPerMonth),
    });
    const sent = await tx.signAndSend();
    return {
      subscriptionId: sent.result.toString(),
      txHash: sent.sendTransactionResponse!.hash,
    };
  }

  /** Cancels a subscription opened by the connected wallet. */
  async cancelSubscription(subscriptionId: string): Promise<{ txHash: string }> {
    const { client, publicKey } = await this.buildSignedClient();
    const tx = await client.cancel_subscription({
      from: publicKey,
      subscription_id: BigInt(subscriptionId),
    });
    const sent = await tx.signAndSend();
    return { txHash: sent.sendTransactionResponse!.hash };
  }

  /**
   * Charges every subscription currently due, using the connected wallet as
   * the submitting "keeper". Callable by anyone — the contract itself does
   * not require the caller to be a party to any subscription.
   */
  async processDueSubscriptions(): Promise<{ txHash: string; charged: number }> {
    const { client } = await this.buildSignedClient();
    const tx = await client.process_due_subscriptions();
    const sent = await tx.signAndSend();
    return {
      charged: sent.result,
      txHash: sent.sendTransactionResponse!.hash,
    };
  }

  /** Publishes a new funding goal for the connected wallet's creator profile. */
  async setTipGoal(params: TipGoalParams): Promise<{ goalId: string; txHash: string }> {
    const { client, publicKey } = await this.buildSignedClient();
    const tx = await client.set_tip_goal({
      creator: publicKey,
      goal_amount: toStroops(params.goalAmount),
      description: params.description,
    });
    const sent = await tx.signAndSend();
    return {
      goalId: sent.result.toString(),
      txHash: sent.sendTransactionResponse!.hash,
    };
  }

  /** Reads a creator's public profile. Works without a connected wallet. */
  async getProfile(wallet: string): Promise<CreatorProfile> {
    const client = await this.buildClient();
    const tx = await client.get_profile({ wallet });
    return mapProfile(tx.result);
  }

  /** Returns the most recent `limit` tips involving `wallet`. Works without a connected wallet. */
  async getTipHistory(wallet: string, limit: number): Promise<Tip[]> {
    const client = await this.buildClient();
    const tx = await client.get_tip_history({ wallet, limit });
    return tx.result.map(mapTip);
  }

  /** Returns every subscription a supporter has opened. Works without a connected wallet. */
  async getSubscriptionsBySupporter(wallet: string): Promise<Subscription[]> {
    const client = await this.buildClient();
    const tx = await client.get_subscriptions_by_supporter({ supporter: wallet });
    return tx.result.map(mapSubscription);
  }

  /** Returns every subscription a creator has received. Works without a connected wallet. */
  async getSubscriptionsByCreator(wallet: string): Promise<Subscription[]> {
    const client = await this.buildClient();
    const tx = await client.get_subscriptions_by_creator({ creator: wallet });
    return tx.result.map(mapSubscription);
  }

  /** Returns a creator's current funding goal, if any. Works without a connected wallet. */
  async getTipGoal(wallet: string): Promise<TipGoal | undefined> {
    const client = await this.buildClient();
    const tx = await client.get_tip_goal({ creator: wallet });
    const raw = tx.result;
    return raw ? mapGoal(raw) : undefined;
  }

  /** Reads aggregate, protocol-wide statistics. Works without a connected wallet. */
  async getProtocolStats(): Promise<ProtocolStats> {
    const client = await this.buildClient();
    const tx = await client.get_protocol_stats();
    return mapStats(tx.result);
  }

  /** Returns the top `limit` creators by total USDC received. Works without a connected wallet. */
  async getTopCreators(limit: number): Promise<LeaderboardEntry[]> {
    const client = await this.buildClient();
    const tx = await client.get_top_creators({ limit });
    return tx.result.map(mapLeaderboardEntry);
  }

  /** Returns whether `wallet` has registered a creator profile. Works without a connected wallet. */
  async isRegistered(wallet: string): Promise<boolean> {
    try {
      await this.getProfile(wallet);
      return true;
    } catch {
      return false;
    }
  }
}
