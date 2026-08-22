import { describe, expect, it } from "vitest";
import type { AuthPort, AuthState } from "@sunshield/platform";
import { createAuthController } from "./createAuthController";

function makeAuth(options: {
  initial?: AuthState;
  signInError?: unknown;
} = {}): AuthPort & { setState(next: AuthState): void } {
  let state = options.initial ?? { kind: "signed_out" as const };
  return {
    async getState() {
      return state;
    },
    async getAccessToken() {
      return state.kind === "signed_in" ? "test-token" : null;
    },
    async signInWithGoogle() {
      if (options.signInError !== undefined) throw options.signInError;
      state = {
        kind: "signed_in",
        userId: "user-1",
        accessTokenExpiresAt: "2026-08-17T12:00:00.000Z"
      };
    },
    async signOut() {
      state = { kind: "signed_out" };
    },
    setState(next) {
      state = next;
    }
  };
}

describe("createAuthController", () => {
  it("登入成功後只更新 auth state", async () => {
    const auth = makeAuth();
    const controller = createAuthController({ auth });

    await expect(controller.signInWithGoogle()).resolves.toBe(true);
    expect(controller.state.value).toMatchObject({
      status: "signed_in",
      auth: { kind: "signed_in", userId: "user-1" }
    });
  });

  it("Google OAuth 取消時回傳 false，且不觸碰本機資料相依性", async () => {
    const auth = makeAuth({
      signInError: { code: "AUTH_CANCELLED", message: "cancelled" }
    });
    let localReadCount = 0;
    const controller = createAuthController({
      auth,
      local: {
        async collectSyncSnapshot() {
          localReadCount += 1;
          return { collectedAt: "2026-08-17T09:00:00.000Z", records: [], tombstones: [], metadata: [] };
        },
        async getActiveSession() {
          localReadCount += 1;
          return null;
        },
        async applySelectedRecords() {
          throw new Error("不應該寫入本機");
        },
        async applyTombstones() {
          throw new Error("不應該寫入本機");
        }
      }
    });

    await expect(controller.signInWithGoogle()).resolves.toBe(false);
    expect(localReadCount).toBe(0);
    expect(controller.state.value).toMatchObject({
      status: "error",
      errorCode: "AUTH_CANCELLED"
    });
  });

  it("登出不清除本機資料，且會回到 signed_out", async () => {
    const auth = makeAuth({
      initial: {
        kind: "signed_in",
        userId: "user-1",
        accessTokenExpiresAt: null
      }
    });
    const controller = createAuthController({ auth });
    await controller.refresh();

    await expect(controller.signOut()).resolves.toBe(true);
    expect(controller.state.value).toMatchObject({
      status: "signed_out",
      auth: { kind: "signed_out" }
    });
  });
});
