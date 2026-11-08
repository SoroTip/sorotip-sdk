// @vitest-environment jsdom
/**
 * These tests mock the actual browser surface @stellar/freighter-api talks
 * to — `window.freighter` and the `window.postMessage`/"message" event
 * protocol it uses to reach the extension's content script — rather than
 * mocking the `@stellar/freighter-api` module itself. That way wallet.ts is
 * exercised against the real freighter-api implementation, and these tests
 * would catch a freighter-api protocol change (message field names, request
 * types) that module-level mocking would hide.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  connectWallet,
  getPublicKey,
  isConnected,
  isFreighterInstalled,
  signTransaction,
  WalletError,
} from "../src/wallet";

interface FreighterRequestMessage {
  source: "FREIGHTER_EXTERNAL_MSG_REQUEST";
  messageId: number;
  type: string;
  [key: string]: unknown;
}

/**
 * Installs a fake Freighter extension content script: intercepts the
 * FREIGHTER_EXTERNAL_MSG_REQUEST postMessage calls freighter-api makes and
 * replies on the same tick with a FREIGHTER_EXTERNAL_MSG_RESPONSE message
 * carrying `responseData`, exactly as the real extension would.
 *
 * Note `messagedId` (not `messageId`) below is not a typo in this test — it
 * matches a real quirk in @stellar/freighter-api's own response-matching
 * code, which reads `messagedId` off the response. Mimicking the real
 * protocol, not an idealized one, is the point of mocking at this level.
 */
function mockFreighterExtension(responseData: Record<string, unknown>): void {
  vi.spyOn(window, "postMessage").mockImplementation((message: unknown) => {
    const req = message as FreighterRequestMessage;
    if (req.source !== "FREIGHTER_EXTERNAL_MSG_REQUEST") {
      return;
    }
    queueMicrotask(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            source: "FREIGHTER_EXTERNAL_MSG_RESPONSE",
            messagedId: req.messageId,
            ...responseData,
          },
          source: window,
        }),
      );
    });
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(window, "freighter");
});

describe("isFreighterInstalled", () => {
  // freighter-api special-cases this one: it reads `window.freighter`
  // directly instead of going through postMessage.
  it("is true when window.freighter is set by the extension", async () => {
    (window as unknown as { freighter: boolean }).freighter = true;
    await expect(isFreighterInstalled()).resolves.toBe(true);
  });

  it("is false when window.freighter is not set", async () => {
    await expect(isFreighterInstalled()).resolves.toBe(false);
  });
});

describe("isConnected", () => {
  beforeEach(() => {
    mockFreighterExtension({ isAllowed: true });
  });

  it("resolves true when the extension reports the site is allowed", async () => {
    await expect(isConnected()).resolves.toBe(true);
  });

  it("resolves false when the extension reports an error", async () => {
    vi.restoreAllMocks();
    mockFreighterExtension({ isAllowed: false, apiError: { code: -1, message: "denied" } });
    await expect(isConnected()).resolves.toBe(false);
  });
});

describe("connectWallet", () => {
  it("returns the public key the extension grants access to", async () => {
    mockFreighterExtension({ publicKey: "GCONNECTED" });
    await expect(connectWallet()).resolves.toBe("GCONNECTED");
  });

  it("throws WalletError when the extension reports an error", async () => {
    mockFreighterExtension({
      publicKey: "",
      apiError: { code: -1, message: "User declined access" },
    });
    await expect(connectWallet()).rejects.toThrow(WalletError);
    await expect(connectWallet()).rejects.toThrow("User declined access");
  });
});

describe("getPublicKey", () => {
  it("returns the already-connected wallet's public key", async () => {
    mockFreighterExtension({ publicKey: "GALREADY" });
    await expect(getPublicKey()).resolves.toBe("GALREADY");
  });

  it("throws WalletError when the extension reports an error", async () => {
    mockFreighterExtension({ publicKey: "", apiError: { code: -1, message: "Not connected" } });
    await expect(getPublicKey()).rejects.toThrow(WalletError);
  });
});

describe("signTransaction", () => {
  it("returns the signed transaction XDR from the extension", async () => {
    mockFreighterExtension({ signedTransaction: "SIGNED_XDR", signerAddress: "GSIGNER" });
    await expect(signTransaction("UNSIGNED_XDR")).resolves.toBe("SIGNED_XDR");
  });

  it("throws WalletError when signing fails or is rejected", async () => {
    mockFreighterExtension({
      signedTransaction: "",
      signerAddress: "",
      apiError: { code: -1, message: "User rejected signature" },
    });
    await expect(signTransaction("UNSIGNED_XDR")).rejects.toThrow(WalletError);
    await expect(signTransaction("UNSIGNED_XDR")).rejects.toThrow("User rejected signature");
  });
});
