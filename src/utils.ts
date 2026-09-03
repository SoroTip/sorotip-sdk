/**
 * Number of decimal places used by the USDC Stellar Asset Contract (and Stellar
 * classic assets generally): 1 USDC == 10_000_000 stroops.
 */
const USDC_DECIMALS = 7;
const USDC_SCALE = 10n ** BigInt(USDC_DECIMALS);

/**
 * Formats a raw stroop amount (the token's smallest unit) as a fixed 2-decimal
 * USDC string, e.g. `10_000_000n` -> `"1.00"`.
 */
export function formatUSDC(stroops: bigint): string {
  const negative = stroops < 0n;
  const abs = negative ? -stroops : stroops;
  const whole = abs / USDC_SCALE;
  const fraction = abs % USDC_SCALE;
  const cents = fraction / (USDC_SCALE / 100n);
  const sign = negative ? "-" : "";
  return `${sign}${whole.toString()}.${cents.toString().padStart(2, "0")}`;
}

/**
 * Parses a decimal USDC string (e.g. `"5"`, `"5.5"`, `"5.123456"`) into its
 * raw stroop amount. Throws on malformed input or more than 7 fractional digits.
 */
export function toStroops(usdc: string): bigint {
  const trimmed = usdc.trim();
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (!match) {
    throw new Error(`Invalid USDC amount: "${usdc}"`);
  }
  const [, sign = "", wholePart = "0", fractionPart = ""] = match;
  if (fractionPart.length > USDC_DECIMALS) {
    throw new Error(
      `USDC amount "${usdc}" has more than ${USDC_DECIMALS} decimal places`,
    );
  }
  const paddedFraction = fractionPart.padEnd(USDC_DECIMALS, "0");
  const stroops = BigInt(wholePart) * USDC_SCALE + BigInt(paddedFraction || "0");
  return sign === "-" ? -stroops : stroops;
}

/**
 * Truncates a Stellar address to `G...XXXX` form for compact display.
 */
export function truncateAddress(address: string): string {
  if (address.length <= 10) {
    return address;
  }
  return `${address.slice(0, 1)}...${address.slice(-4)}`;
}

/**
 * Formats a raw stroop tip amount as a display string, e.g. `"$5.00 USDC"`.
 */
export function formatTipAmount(amount: string): string {
  return `$${formatUSDC(BigInt(amount))} USDC`;
}

/**
 * Renders a past {@link Date} as a short relative time string, e.g.
 * `"2 hours ago"`, `"just now"`, `"3 days ago"`.
 */
export function timeAgo(date: Date): string {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  const units: Array<[string, number]> = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];

  for (const [label, secondsInUnit] of units) {
    const value = Math.floor(seconds / secondsInUnit);
    if (value >= 1) {
      return `${value} ${label}${value === 1 ? "" : "s"} ago`;
    }
  }
  return "just now";
}

/**
 * Computes progress toward a funding goal as a percentage from 0 to 100,
 * given raw stroop amounts. Returns 0 if `goal` is zero or negative.
 */
export function goalProgressPercent(current: string, goal: string): number {
  const currentAmount = BigInt(current);
  const goalAmount = BigInt(goal);
  if (goalAmount <= 0n) {
    return 0;
  }
  const ratio = Number((currentAmount * 10000n) / goalAmount) / 100;
  return Math.max(0, Math.min(100, ratio));
}

/**
 * Formats a raw stroop monthly subscription amount as a display string, e.g.
 * `"$3.00/month"`.
 */
export function formatSubscriptionAmount(amount: string): string {
  return `$${formatUSDC(BigInt(amount))}/month`;
}
