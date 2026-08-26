import { describe, expect, it, vi } from "vitest";
import { SupabaseAuthAdapter } from "./SupabaseAuthAdapter";

function makeClient() {
  const session = {
    access_token: "access-token",
    expires_at: 1_754_000_000,
    user: { id: "user-1" }
  };
  const unsubscribe = vi.fn();
  const client = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session }, error: null })),
      signInWithOAuth: vi.fn(async () => ({
        data: { provider: "google" },
        error: null
      })),
      signOut: vi.fn(async () => ({ error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe } }
      }))
    }
  };
  return { client, session, unsubscribe };
}

describe("SupabaseAuthAdapter", () => {
  it("讀取 session 時只回傳 user id 與 expiry，不把 access token 放進 state", async () => {
    const { client } = makeClient();
    const adapter = new SupabaseAuthAdapter({
      client: client as never,
      redirectTo: "https://uvalert.example/"
    });

    await expect(adapter.getState()).resolves.toMatchObject({
      kind: "signed_in",
      userId: "user-1"
    });
    const state = await adapter.getState();
    expect(state).not.toHaveProperty("accessToken");
    await expect(adapter.getAccessToken()).resolves.toBe("access-token");
  });

  it("只呼叫 Google OAuth 與 sign out，不建立匿名使用者", async () => {
    const { client, unsubscribe } = makeClient();
    const adapter = new SupabaseAuthAdapter({
      client: client as never,
      redirectTo: "https://uvalert.example/"
    });

    await adapter.signInWithGoogle();
    expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "https://uvalert.example/" }
    });
    await adapter.signOut();
    expect(client.auth.signOut).toHaveBeenCalledTimes(1);

    const stop = adapter.onAuthStateChange(() => undefined);
    stop();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
