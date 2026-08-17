export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export class SlidingWindowRateLimiter {
  readonly #maxRequests: number;
  readonly #windowMs: number;
  readonly #entries = new Map<string, number[]>();

  constructor(options: { maxRequests: number; windowMs: number }) {
    if (!Number.isSafeInteger(options.maxRequests) || options.maxRequests < 1) {
      throw new Error("RATE_LIMIT_MAX_INVALID");
    }
    if (!Number.isSafeInteger(options.windowMs) || options.windowMs < 1000) {
      throw new Error("RATE_LIMIT_WINDOW_INVALID");
    }
    this.#maxRequests = options.maxRequests;
    this.#windowMs = options.windowMs;
  }

  check(key: string, now = Date.now()): RateLimitResult {
    const cutoff = now - this.#windowMs;
    const recent = (this.#entries.get(key) ?? []).filter((timestamp) => timestamp > cutoff);
    if (recent.length >= this.#maxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil(((recent[0] ?? now) + this.#windowMs - now) / 1000)
      );
      this.#entries.set(key, recent);
      return { allowed: false, retryAfterSeconds };
    }
    recent.push(now);
    this.#entries.set(key, recent);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  clear(): void {
    this.#entries.clear();
  }
}

export async function hashClientFingerprint(parts: readonly string[]): Promise<string> {
  const data = new TextEncoder().encode(parts.join("\u001f"));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
