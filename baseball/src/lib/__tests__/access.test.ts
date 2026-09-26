import { describe, expect, it } from "vitest";
import { countFounding, foundingCap, isCheckoutSessionId, isEmail, newCode, normalizeCode, type License } from "../../../api/access";

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

describe("founding spots", () => {
  const lic = (over: Partial<License>): License => ({ code: "X", email: "", name: "", source: "stripe", created: 0, ...over });

  it("counts working founding codes, including ones issued before the cap", () => {
    expect(countFounding([lic({ founding: true }), lic({}), lic({ founding: false }), lic({ founding: true, revoked: true })])).toBe(2);
  });

  it("defaults the cap to 100 and reads FOUNDING_CAP", () => {
    const prev = process.env.FOUNDING_CAP;
    delete process.env.FOUNDING_CAP;
    expect(foundingCap()).toBe(100);
    process.env.FOUNDING_CAP = "200";
    expect(foundingCap()).toBe(200);
    process.env.FOUNDING_CAP = "lots";
    expect(foundingCap()).toBe(100);
    if (prev === undefined) delete process.env.FOUNDING_CAP;
    else process.env.FOUNDING_CAP = prev;
  });
});
