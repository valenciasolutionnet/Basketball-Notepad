import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import webpush from "web-push";
import { isPushSubscription } from "../../../api/push";
import { urlBase64ToUint8Array } from "../push";

describe("VAPID key generation", () => {
  it("generates a keypair in the shape our server and client expect", () => {
    const { publicKey, privateKey } = webpush.generateVAPIDKeys();
    // Uncompressed EC point: 0x04 + 32-byte X + 32-byte Y, base64url-encoded (no padding).
    expect(urlBase64ToUint8Array(publicKey)).toHaveLength(65);
    expect(urlBase64ToUint8Array(publicKey)[0]).toBe(4);
    expect(urlBase64ToUint8Array(privateKey)).toHaveLength(32);
    expect(publicKey).not.toMatch(/[+/=]/);
    expect(privateKey).not.toMatch(/[+/=]/);
  });

  it("round-trips our own generated dev keys (see .env.example / PR notes)", () => {
    const publicKey = "BG3NW_sBo33OLSd7nXm-pTrXNjnjZuHw8TV-9ZgtnxQr7ZKQmsVmtTisA6O_r2w9s3BuFhrVBIgGus30Jh2kCDI";
    expect(urlBase64ToUint8Array(publicKey)).toHaveLength(65);
  });
});

describe("payload signing (webpush.encrypt)", () => {
  it("encrypts a JSON payload against a subscriber's keys without contacting a push service", async () => {
    const receiver = webpush.generateVAPIDKeys();
    // A subscriber's p256dh is just an EC public key; reuse the VAPID helper to produce
    // a well-formed one, paired with a fresh 16-byte auth secret, for this offline check.
    const { encrypt } = await import("web-push");
    const authSecret = randomBytes(16).toString("base64url");
    const result = encrypt(receiver.publicKey, authSecret, JSON.stringify({ title: "t", body: "b" }), "aes128gcm");
    expect(result.cipherText).toBeInstanceOf(Buffer);
    expect(result.cipherText.length).toBeGreaterThan(0);
    expect(result.salt).toBeTypeOf("string");
  });
});

describe("push subscription validation", () => {
  it("accepts a well-formed PushSubscriptionJSON", () => {
    expect(isPushSubscription({ endpoint: "https://fcm.googleapis.com/x", keys: { p256dh: "a", auth: "b" } })).toBe(true);
  });
  it("rejects non-https endpoints and missing keys", () => {
    expect(isPushSubscription({ endpoint: "http://insecure", keys: { p256dh: "a", auth: "b" } })).toBe(false);
    expect(isPushSubscription({ endpoint: "https://x" })).toBe(false);
    expect(isPushSubscription(null)).toBe(false);
    expect(isPushSubscription("nope")).toBe(false);
  });
});
