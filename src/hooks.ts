import { useCallback, useEffect, useState } from "react";

import type { SoroTipClient } from "./SoroTipClient";
import { connectWallet, getPublicKey, isConnected as walletIsConnected } from "./wallet";
import type {
  CreatorProfile,
  LeaderboardEntry,
  ProtocolStats,
  Subscription,
  Tip,
  TipGoal,
} from "./types";

interface AsyncState<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

/**
 * Internal helper: runs `fetcher` whenever `deps` change, exposing loading /
 * error / data state plus a manual `refetch`.
 */
function useAsync<T>(fetcher: () => Promise<T>, deps: ReadonlyArray<unknown>): AsyncState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [refetchCount, setRefetchCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(undefined);

    fetcher()
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refetchCount]);

  const refetch = useCallback(() => setRefetchCount((count) => count + 1), []);

  return { data, isLoading, error, refetch };
}

/** Loads a creator's public profile, with a manual `refetch`. */
export function useProfile(
  client: SoroTipClient,
  wallet: string,
): { profile: CreatorProfile | undefined; isLoading: boolean; error: Error | undefined; refetch: () => void } {
  const { data, isLoading, error, refetch } = useAsync(
    () => client.getProfile(wallet),
    [client, wallet],
  );
  return { profile: data, isLoading, error, refetch };
}

/** Loads the most recent `limit` tips involving `wallet`. */
export function useTipHistory(
  client: SoroTipClient,
  wallet: string,
  limit = 20,
): { tips: Tip[] | undefined; isLoading: boolean; error: Error | undefined } {
  const { data, isLoading, error } = useAsync(
    () => client.getTipHistory(wallet, limit),
    [client, wallet, limit],
  );
  return { tips: data, isLoading, error };
}

/** Loads every subscription a supporter has opened. */
export function useSubscriptions(
  client: SoroTipClient,
  wallet: string,
): { subscriptions: Subscription[] | undefined; isLoading: boolean; error: Error | undefined } {
  const { data, isLoading, error } = useAsync(
    () => client.getSubscriptionsBySupporter(wallet),
    [client, wallet],
  );
  return { subscriptions: data, isLoading, error };
}

/** Loads a creator's current funding goal, if any. */
export function useTipGoal(
  client: SoroTipClient,
  wallet: string,
): { goal: TipGoal | undefined; isLoading: boolean; error: Error | undefined } {
  const { data, isLoading, error } = useAsync(
    () => client.getTipGoal(wallet),
    [client, wallet],
  );
  return { goal: data, isLoading, error };
}

/** Loads the top `limit` creators by total USDC received. */
export function useTopCreators(
  client: SoroTipClient,
  limit = 10,
): { creators: LeaderboardEntry[] | undefined; isLoading: boolean; error: Error | undefined } {
  const { data, isLoading, error } = useAsync(
    () => client.getTopCreators(limit),
    [client, limit],
  );
  return { creators: data, isLoading, error };
}

/** Loads aggregate, protocol-wide statistics. */
export function useProtocolStats(
  client: SoroTipClient,
): { stats: ProtocolStats | undefined; isLoading: boolean; error: Error | undefined } {
  const { data, isLoading, error } = useAsync(() => client.getProtocolStats(), [client]);
  return { stats: data, isLoading, error };
}

/**
 * Tracks the connected Freighter wallet's public key and exposes
 * `connect`/`disconnect` actions.
 *
 * "Disconnecting" only clears local component state — Freighter itself has
 * no programmatic revoke; the user must do that from the extension.
 */
export function useWallet(): {
  publicKey: string | undefined;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
} {
  const [publicKey, setPublicKey] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    walletIsConnected()
      .then((connected) => (connected ? getPublicKey() : undefined))
      .then((address) => {
        if (!cancelled && address) {
          setPublicKey(address);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async () => {
    const address = await connectWallet();
    setPublicKey(address);
  }, []);

  const disconnect = useCallback(() => setPublicKey(undefined), []);

  return { publicKey, connect, disconnect, isConnected: publicKey !== undefined };
}
