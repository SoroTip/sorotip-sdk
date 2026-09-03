import { describe, expect, it } from "vitest";

import {
  formatSubscriptionAmount,
  formatTipAmount,
  formatUSDC,
  goalProgressPercent,
  timeAgo,
  toStroops,
  truncateAddress,
} from "../src/utils";
import type {
  CreatorProfile,
  LeaderboardEntry,
  ProtocolStats,
  Subscription,
  Tip,
  TipGoal,
} from "../src/types";

describe("formatUSDC", () => {
  it("formats whole stroop amounts with two decimal places", () => {
    expect(formatUSDC(10_000_000n)).toBe("1.00");
    expect(formatUSDC(0n)).toBe("0.00");
  });

  it("formats fractional cent amounts, truncating beyond the cent", () => {
    expect(formatUSDC(15_500_000n)).toBe("1.55");
    expect(formatUSDC(1_234_567n)).toBe("0.12");
  });

  it("formats negative amounts with a leading minus sign", () => {
    expect(formatUSDC(-5_000_000n)).toBe("-0.50");
  });
});

describe("toStroops", () => {
  it("parses whole-number USDC strings", () => {
    expect(toStroops("1")).toBe(10_000_000n);
    expect(toStroops("0")).toBe(0n);
  });

  it("parses decimal USDC strings", () => {
    expect(toStroops("5.5")).toBe(55_000_000n);
    expect(toStroops("0.0000001")).toBe(1n);
  });

  it("round-trips with formatUSDC", () => {
    expect(formatUSDC(toStroops("42.42"))).toBe("42.42");
  });

  it("parses negative amounts", () => {
    expect(toStroops("-3.5")).toBe(-35_000_000n);
  });

  it("throws on malformed input", () => {
    expect(() => toStroops("abc")).toThrow();
    expect(() => toStroops("")).toThrow();
    expect(() => toStroops("1.2.3")).toThrow();
  });

  it("throws on more than 7 fractional digits", () => {
    expect(() => toStroops("1.12345678")).toThrow();
  });
});

describe("truncateAddress", () => {
  it("truncates a full Stellar address to G...XXXX form", () => {
    expect(truncateAddress("GABC1234567890XYZDEF1234567890XYZDEF1234567890XYZDEF")).toBe(
      "G...ZDEF",
    );
  });

  it("leaves short strings untouched", () => {
    expect(truncateAddress("SHORT")).toBe("SHORT");
  });
});

describe("formatTipAmount", () => {
  it("formats a raw stroop amount as a dollar-prefixed USDC string", () => {
    expect(formatTipAmount("50000000")).toBe("$5.00 USDC");
  });
});

describe("formatSubscriptionAmount", () => {
  it("formats a raw stroop amount as a per-month USDC string", () => {
    expect(formatSubscriptionAmount("30000000")).toBe("$3.00/month");
  });
});

describe("goalProgressPercent", () => {
  it("computes percentage progress toward a goal", () => {
    expect(goalProgressPercent("50000000", "100000000")).toBe(50);
    expect(goalProgressPercent("0", "100000000")).toBe(0);
    expect(goalProgressPercent("100000000", "100000000")).toBe(100);
  });

  it("clamps overshoot to 100", () => {
    expect(goalProgressPercent("150000000", "100000000")).toBe(100);
  });

  it("returns 0 for a zero or negative goal", () => {
    expect(goalProgressPercent("10", "0")).toBe(0);
    expect(goalProgressPercent("10", "-5")).toBe(0);
  });
});

describe("timeAgo", () => {
  it("renders 'just now' for the current instant", () => {
    expect(timeAgo(new Date())).toBe("just now");
  });

  it("renders singular and plural units correctly", () => {
    const oneHourAgo = new Date(Date.now() - 3600 * 1000);
    expect(timeAgo(oneHourAgo)).toBe("1 hour ago");

    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000);
    expect(timeAgo(twoHoursAgo)).toBe("2 hours ago");

    const threeDaysAgo = new Date(Date.now() - 3 * 86400 * 1000);
    expect(timeAgo(threeDaysAgo)).toBe("3 days ago");
  });
});

describe("type shapes", () => {
  it("CreatorProfile accepts the documented fields", () => {
    const profile: CreatorProfile = {
      id: "1",
      wallet: "GABC",
      name: "Ada",
      bio: "Builder",
      avatarIpfs: "Qm...",
      totalReceived: "100000000",
      tipCount: 3,
      subscriberCount: 1,
      registeredAt: new Date(),
    };
    expect(profile.id).toBe("1");
  });

  it("Tip accepts the documented fields", () => {
    const tip: Tip = {
      id: "1",
      from: "GABC",
      to: "GXYZ",
      amount: "50000000",
      feePaid: "0",
      messageIpfs: "",
      timestamp: new Date(),
    };
    expect(tip.amount).toBe("50000000");
  });

  it("Subscription accepts the documented fields", () => {
    const subscription: Subscription = {
      id: "1",
      supporter: "GABC",
      creator: "GXYZ",
      amountPerMonth: "30000000",
      nextChargeDate: new Date(),
      active: true,
      createdAt: new Date(),
    };
    expect(subscription.active).toBe(true);
  });

  it("TipGoal accepts the documented fields", () => {
    const goal: TipGoal = {
      id: "1",
      creator: "GABC",
      goalAmount: "100000000",
      currentAmount: "50000000",
      description: "New microphone",
      completed: false,
      progressPercent: 50,
    };
    expect(goal.progressPercent).toBe(50);
  });

  it("ProtocolStats accepts the documented fields", () => {
    const stats: ProtocolStats = {
      totalTips: 10,
      totalVolume: "1000000000",
      totalCreators: 5,
      totalSubscriptions: 2,
      feeCollected: "5000000",
    };
    expect(stats.totalTips).toBe(10);
  });

  it("LeaderboardEntry accepts the documented fields", () => {
    const entry: LeaderboardEntry = {
      wallet: "GABC",
      name: "Ada",
      totalReceived: "100000000",
      tipCount: 3,
    };
    expect(entry.tipCount).toBe(3);
  });
});
