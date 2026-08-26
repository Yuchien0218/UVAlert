import { describe, expect, it } from "vitest";
import { hashClientFingerprint, SlidingWindowRateLimiter } from "./rate-limit";

describe("feedback rate limit", () => {
  it("在短視窗內限制同一 hashed fingerprint，並提供 retry-after", () => {
    const limiter = new SlidingWindowRateLimiter({
      maxRequests: 2,
      windowMs: 60_000
    });
    expect(limiter.check("hashed-client", 0).allowed).toBe(true);
    expect(limiter.check("hashed-client", 1_000).allowed).toBe(true);
    expect(limiter.check("hashed-client", 2_000)).toMatchObject({
      allowed: false,
      retryAfterSeconds: 58
    });
    expect(limiter.check("other-hashed-client", 2_000).allowed).toBe(true);
  });

  it("只回傳雜湊值，不保留輸入指紋", async () => {
    const hash = await hashClientFingerprint(["ip", "user-agent"]);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain("user-agent");
  });
});
