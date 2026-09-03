import {
  getAddress,
  isAllowed,
  isConnected as freighterIsConnected,
  requestAccess,
  signTransaction as freighterSignTransaction,
} from "@stellar/freighter-api";

/**
 * Thrown when a wallet operation fails, wrapping the underlying Freighter
 * error message (if any).
 */
export class WalletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletError";
  }
}

/**
 * Returns whether the Freighter browser extension is installed. Safe to call
 * during server-side rendering — resolves to `false` outside a browser.
 */
export async function isFreighterInstalled(): Promise<boolean> {
  const result = await freighterIsConnected();
  return Boolean(result.isConnected) && !result.error;
}

/**
 * Returns whether this site currently has permission to access the user's
 * Freighter wallet, without prompting.
 */
export async function isConnected(): Promise<boolean> {
  const result = await isAllowed();
  return Boolean(result.isAllowed) && !result.error;
}

/**
 * Prompts the user to connect their Freighter wallet to this site (if not
 * already connected) and returns their public key.
 *
 * @throws {WalletError} If Freighter is not installed or the user declines.
 */
export async function connectWallet(): Promise<string> {
  const result = await requestAccess();
  if (result.error) {
    throw new WalletError(result.error.message);
  }
  return result.address;
}

/**
 * Returns the currently connected wallet's public key. The site must
 * already have permission (see {@link connectWallet} / {@link isConnected}).
 *
 * @throws {WalletError} If Freighter is not installed or not yet connected.
 */
export async function getPublicKey(): Promise<string> {
  const result = await getAddress();
  if (result.error) {
    throw new WalletError(result.error.message);
  }
  return result.address;
}

/**
 * Requests that Freighter sign a base64-encoded transaction XDR using the
 * currently connected wallet, and returns the signed XDR.
 *
 * @throws {WalletError} If signing fails or is rejected by the user.
 */
export async function signTransaction(
  transactionXdr: string,
  opts?: { networkPassphrase?: string; address?: string },
): Promise<string> {
  const result = await freighterSignTransaction(transactionXdr, opts);
  if (result.error) {
    throw new WalletError(result.error.message);
  }
  return result.signedTxXdr;
}
