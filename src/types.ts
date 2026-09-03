/**
 * A creator's public on-chain profile.
 */
export interface CreatorProfile {
  /** Numeric profile id assigned at registration. */
  id: string;
  /** Creator's Stellar wallet (G...) address. */
  wallet: string;
  /** Display name. */
  name: string;
  /** Short biography. */
  bio: string;
  /** IPFS hash of the creator's avatar image. */
  avatarIpfs: string;
  /** Total amount received across all tips and subscription charges, in the token's smallest unit, as a decimal string. */
  totalReceived: string;
  /** Total number of one-time tips received. */
  tipCount: number;
  /** Number of currently active subscribers. */
  subscriberCount: number;
  /** When the profile was registered. */
  registeredAt: Date;
}

/**
 * A single one-time tip record.
 */
export interface Tip {
  /** Numeric tip id. */
  id: string;
  /** Sender's Stellar wallet address. */
  from: string;
  /** Recipient's Stellar wallet address. */
  to: string;
  /** Total tip amount (before fee deduction), in the token's smallest unit, as a decimal string. */
  amount: string;
  /** Protocol fee deducted from `amount`, as a decimal string. */
  feePaid: string;
  /** IPFS hash of an optional message attached to the tip. */
  messageIpfs: string;
  /** When the tip was sent. */
  timestamp: Date;
}

/**
 * A recurring monthly subscription from a supporter to a creator.
 */
export interface Subscription {
  /** Numeric subscription id. */
  id: string;
  /** Supporter's Stellar wallet address. */
  supporter: string;
  /** Creator's Stellar wallet address. */
  creator: string;
  /** Monthly charge amount, in the token's smallest unit, as a decimal string. */
  amountPerMonth: string;
  /** The next date this subscription is due to be charged. */
  nextChargeDate: Date;
  /** Whether the subscription is still active (not cancelled). */
  active: boolean;
  /** When the subscription was created. */
  createdAt: Date;
}

/**
 * A creator's funding goal and progress toward it.
 */
export interface TipGoal {
  /** Numeric goal id. */
  id: string;
  /** Creator's Stellar wallet address. */
  creator: string;
  /** Target amount, in the token's smallest unit, as a decimal string. */
  goalAmount: string;
  /** Amount received toward the goal so far, in the token's smallest unit, as a decimal string. */
  currentAmount: string;
  /** Description of what the goal funds. */
  description: string;
  /** Whether the goal has been reached or manually closed. */
  completed: boolean;
  /** Progress toward the goal, from 0 to 100. */
  progressPercent: number;
}

/**
 * Aggregate, protocol-wide statistics.
 */
export interface ProtocolStats {
  /** Total number of one-time tips ever sent. */
  totalTips: number;
  /** Total volume moved through the protocol (tips + subscription charges), in the token's smallest unit, as a decimal string. */
  totalVolume: string;
  /** Total number of registered creators. */
  totalCreators: number;
  /** Total number of subscriptions ever opened. */
  totalSubscriptions: number;
  /** Total protocol fees collected, in the token's smallest unit, as a decimal string. */
  feeCollected: string;
}

/**
 * A single entry on the top-creators leaderboard.
 */
export interface LeaderboardEntry {
  /** Creator's Stellar wallet address. */
  wallet: string;
  /** Creator's display name. */
  name: string;
  /** Total amount received, in the token's smallest unit, as a decimal string. */
  totalReceived: string;
  /** Total number of tips received. */
  tipCount: number;
}

/**
 * Parameters for registering or updating a creator profile.
 */
export interface RegisterParams {
  /** Display name. */
  name: string;
  /** Short biography. */
  bio: string;
  /** IPFS hash of the creator's avatar image. */
  avatarIpfs: string;
}

/**
 * Parameters for sending a one-time tip.
 */
export interface TipParams {
  /** Recipient's Stellar wallet address. */
  to: string;
  /** Tip amount, as a decimal USDC string (e.g. `"5"` or `"5.50"`). */
  amount: string;
  /** Optional IPFS hash of a message to attach to the tip. */
  messageIpfs?: string;
}

/**
 * Parameters for opening a recurring subscription.
 */
export interface SubscribeParams {
  /** Creator's Stellar wallet address. */
  to: string;
  /** Monthly charge amount, as a decimal USDC string (e.g. `"3"` or `"3.00"`). */
  amountPerMonth: string;
}

/**
 * Parameters for setting a creator's funding goal.
 */
export interface TipGoalParams {
  /** Target amount, as a decimal USDC string. */
  goalAmount: string;
  /** Description of what the goal funds. */
  description: string;
}

/**
 * Which Stellar network the client should talk to.
 */
export type SoroTipNetwork = "testnet" | "mainnet" | "futurenet";

/**
 * Configuration for constructing a {@link SoroTipClient}.
 */
export interface SoroTipClientConfig {
  /** Which Stellar network to use. */
  network: SoroTipNetwork;
  /** Deployed SoroTip contract id (C...). */
  contractId: string;
  /** Soroban RPC URL. Defaults to the public RPC endpoint for `network`. */
  rpcUrl?: string;
}

/** The result of a state-changing SDK call: a transaction hash and any decoded return value. */
export interface TxResult {
  /** Hash of the submitted, confirmed transaction. */
  txHash: string;
}
