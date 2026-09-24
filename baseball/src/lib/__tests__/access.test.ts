import { describe, expect, it } from "vitest";
import { isCheckoutSessionId, isEmail, newCode, normalizeCode } from "../../../api/access";

describe("access codes", () => {
  it("issues grouped codes without look-alike characters", () => {
    for (let i = 0; i < 200; i++) {
      const c = newCode();
      expect(c).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      expect(c).not.toMatch(/[01OIL]/);
      expect(normalizeCode(c)).toBe(c);
    }
  });

  it("normalizes what coaches type", () => {
    expect(normalizeCode("abcd efgh jkmn")).toBe("ABCD-EFGH-JKMN");
    expect(normalizeCode(" abcd-efgh-jkmn ")).toBe("ABCD-EFGH-JKMN");
  });

  it("rejects malformed codes", () => {
    expect(normalizeCode("ABCD-EFGH-JKM")).toBeNull();
    expect(normalizeCode("ABCD-EFGH-JKM0")).toBeNull();
    expect(normalizeCode(42)).toBeNull();
  });
});

describe("input checks", () => {
  it("validates emails", () => {
    expect(isEmail("coach@club.ca")).toBe(true);
    expect(isEmail("coach@club")).toBe(false);
    expect(isEmail("a b@c.d")).toBe(false);
  });

  it("accepts only Stripe Checkout Session ids", () => {
    expect(isCheckoutSessionId("cs_live_a1B2c3D4e5F6g7")).toBe(true);
    expect(isCheckoutSessionId("cs_test_a1B2c3D4e5F6g7")).toBe(true);
    expect(isCheckoutSessionId("pi_live_a1B2c3D4e5F6g7")).toBe(false);
    expect(isCheckoutSessionId("cs_live_../../v1/customers")).toBe(false);
  });
});
