// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SoroTipClient } from "../src/SoroTipClient";
import {
  useProfile,
  useProtocolStats,
  useSubscriptions,
  useTipGoal,
  useTipHistory,
  useTopCreators,
  useWallet,
} from "../src/hooks";
import * as wallet from "../src/wallet";
import type { CreatorProfile, LeaderboardEntry, ProtocolStats, Subscription, Tip, TipGoal } from "../src/types";

function makeClient(): SoroTipClient {
  return new SoroTipClient({ network: "testnet", contractId: "CONTRACTID" });
}

const PROFILE: CreatorProfile = {
  id: "1",
  wallet: "GCREATOR",
  name: "Ada",
  bio: "Builder",
  avatarIpfs: "Qm...",
  totalReceived: "100000000",
  tipCount: 3,
  subscriberCount: 1,
  registeredAt: new Date("2024-01-01T00:00:00Z"),
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useProfile", () => {
  it("starts loading, then resolves with the client's data", async () => {
    const client = makeClient();
    const getProfile = vi.spyOn(client, "getProfile").mockResolvedValue(PROFILE);

    const { result } = renderHook(() => useProfile(client, "GCREATOR"));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.profile).toBeUndefined();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.profile).toEqual(PROFILE);
    expect(result.current.error).toBeUndefined();
    expect(getProfile).toHaveBeenCalledWith("GCREATOR");
  });

  it("surfaces a rejected call as an Error, not a thrown exception", async () => {
    const client = makeClient();
    vi.spyOn(client, "getProfile").mockRejectedValue(new Error("rpc down"));

    const { result } = renderHook(() => useProfile(client, "GCREATOR"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.profile).toBeUndefined();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("rpc down");
  });

  it("wraps a non-Error rejection in an Error", async () => {
    const client = makeClient();
    vi.spyOn(client, "getProfile").mockRejectedValue("plain string failure");

    const { result } = renderHook(() => useProfile(client, "GCREATOR"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("plain string failure");
  });

  it("refetch triggers another call to the client", async () => {
    const client = makeClient();
    const getProfile = vi.spyOn(client, "getProfile").mockResolvedValue(PROFILE);

    const { result } = renderHook(() => useProfile(client, "GCREATOR"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getProfile).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.refetch();
    });
    await waitFor(() => expect(getProfile).toHaveBeenCalledTimes(2));
  });

  it("re-fetches when the wallet argument changes", async () => {
    const client = makeClient();
    const getProfile = vi.spyOn(client, "getProfile").mockResolvedValue(PROFILE);

    const { result, rerender } = renderHook(({ wallet }) => useProfile(client, wallet), {
      initialProps: { wallet: "GONE" },
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getProfile).toHaveBeenCalledWith("GONE");

    rerender({ wallet: "GTWO" });
    await waitFor(() => expect(getProfile).toHaveBeenCalledWith("GTWO"));
    expect(getProfile).toHaveBeenCalledTimes(2);
  });
});

describe("useTipHistory", () => {
  it("passes the wallet and limit through to the client", async () => {
    const client = makeClient();
    const tips: Tip[] = [
      {
        id: "1",
        from: "GFROM",
        to: "GTO",
        amount: "50000000",
        feePaid: "0",
        messageIpfs: "",
        timestamp: new Date(),
      },
    ];
    const getTipHistory = vi.spyOn(client, "getTipHistory").mockResolvedValue(tips);

    const { result } = renderHook(() => useTipHistory(client, "GTO", 5));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getTipHistory).toHaveBeenCalledWith("GTO", 5);
    expect(result.current.tips).toEqual(tips);
  });

  it("defaults limit to 20 when not provided", async () => {
    const client = makeClient();
    const getTipHistory = vi.spyOn(client, "getTipHistory").mockResolvedValue([]);

    renderHook(() => useTipHistory(client, "GTO"));
    await waitFor(() => expect(getTipHistory).toHaveBeenCalledWith("GTO", 20));
  });
});

describe("useSubscriptions", () => {
  it("loads subscriptions for a supporter", async () => {
    const client = makeClient();
    const subs: Subscription[] = [
      {
        id: "1",
        supporter: "GSUP",
        creator: "GCREATOR",
        amountPerMonth: "30000000",
        nextChargeDate: new Date(),
        active: true,
        createdAt: new Date(),
      },
    ];
    vi.spyOn(client, "getSubscriptionsBySupporter").mockResolvedValue(subs);

    const { result } = renderHook(() => useSubscriptions(client, "GSUP"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.subscriptions).toEqual(subs);
  });
});

describe("useTipGoal", () => {
  it("loads an existing goal", async () => {
    const client = makeClient();
    const goal: TipGoal = {
      id: "1",
      creator: "GCREATOR",
      goalAmount: "100000000",
      currentAmount: "50000000",
      description: "New mic",
      completed: false,
      progressPercent: 50,
    };
    vi.spyOn(client, "getTipGoal").mockResolvedValue(goal);

    const { result } = renderHook(() => useTipGoal(client, "GCREATOR"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.goal).toEqual(goal);
  });

  it("resolves to undefined when the creator has no goal", async () => {
    const client = makeClient();
    vi.spyOn(client, "getTipGoal").mockResolvedValue(undefined);

    const { result } = renderHook(() => useTipGoal(client, "GCREATOR"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.goal).toBeUndefined();
    expect(result.current.error).toBeUndefined();
  });
});

describe("useTopCreators", () => {
  it("defaults limit to 10", async () => {
    const client = makeClient();
    const entries: LeaderboardEntry[] = [];
    const getTopCreators = vi.spyOn(client, "getTopCreators").mockResolvedValue(entries);

    renderHook(() => useTopCreators(client));
    await waitFor(() => expect(getTopCreators).toHaveBeenCalledWith(10));
  });
});

describe("useProtocolStats", () => {
  it("loads protocol stats", async () => {
    const client = makeClient();
    const stats: ProtocolStats = {
      totalTips: 10,
      totalVolume: "1000000000",
      totalCreators: 5,
      totalSubscriptions: 2,
      feeCollected: "5000000",
    };
    vi.spyOn(client, "getProtocolStats").mockResolvedValue(stats);

    const { result } = renderHook(() => useProtocolStats(client));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.stats).toEqual(stats);
  });
});

describe("useWallet", () => {
  it("starts disconnected when the wallet has not granted access", async () => {
    vi.spyOn(wallet, "isConnected").mockResolvedValue(false);
    const getPublicKey = vi.spyOn(wallet, "getPublicKey");

    const { result } = renderHook(() => useWallet());
    await waitFor(() => expect(getPublicKey).not.toHaveBeenCalled());

    expect(result.current.publicKey).toBeUndefined();
    expect(result.current.isConnected).toBe(false);
  });

  it("picks up an already-connected wallet's public key on mount", async () => {
    vi.spyOn(wallet, "isConnected").mockResolvedValue(true);
    vi.spyOn(wallet, "getPublicKey").mockResolvedValue("GEXISTING");

    const { result } = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.publicKey).toBe("GEXISTING"));
    expect(result.current.isConnected).toBe(true);
  });

  it("connect() sets the public key returned by connectWallet", async () => {
    vi.spyOn(wallet, "isConnected").mockResolvedValue(false);
    vi.spyOn(wallet, "connectWallet").mockResolvedValue("GNEWLYCONNECTED");

    const { result } = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.isConnected).toBe(false));

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.publicKey).toBe("GNEWLYCONNECTED");
    expect(result.current.isConnected).toBe(true);
  });

  it("disconnect() clears local state without calling Freighter", async () => {
    vi.spyOn(wallet, "isConnected").mockResolvedValue(true);
    vi.spyOn(wallet, "getPublicKey").mockResolvedValue("GEXISTING");

    const { result } = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.publicKey).toBe("GEXISTING"));

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.publicKey).toBeUndefined();
    expect(result.current.isConnected).toBe(false);
  });
});
