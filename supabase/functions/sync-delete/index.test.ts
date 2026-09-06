import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const approvedOrigin = "https://uv-alert-web.vercel.app";

const runtime = vi.hoisted(() => {
  const requirePermanentUser = vi.fn(async () => ({
    ok: false as const,
    response: new Response(
      JSON.stringify({ error: { code: "AUTH_REQUIRED" } }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    )
  }));

  return { requirePermanentUser };
});

vi.mock("../_shared/auth.ts", () => ({
  requirePermanentUser: runtime.requirePermanentUser
}));

let handleDelete: typeof import("./index.ts").handleDelete;

function makeRequest(method: string): Request {
  return new Request("https://api.test/sync-delete", {
    method,
    headers: { Origin: approvedOrigin }
  });
}

beforeEach(async () => {
  vi.resetModules();
  runtime.requirePermanentUser.mockClear();
  vi.stubGlobal("Deno", {
    env: {
      get: (key: string) =>
        key === "ALLOWED_ORIGINS" ? approvedOrigin : undefined
    },
    serve: vi.fn()
  });
  ({ handleDelete } = await import("./index.ts"));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sync delete boundary", () => {
  it("approved origin 的 OPTIONS 回 204，且不要求 JWT", async () => {
    const response = await handleDelete(makeRequest("OPTIONS"));

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      approvedOrigin
    );
    expect(runtime.requirePermanentUser).not.toHaveBeenCalled();
  });

  it("拒絕非 POST method，且不進入驗證", async () => {
    const response = await handleDelete(makeRequest("GET"));

    expect(response.status).toBe(405);
    expect(runtime.requirePermanentUser).not.toHaveBeenCalled();
  });

  it("未登入的 POST 仍交給 requirePermanentUser 回 401", async () => {
    const response = await handleDelete(makeRequest("POST"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "AUTH_REQUIRED" }
    });
    expect(runtime.requirePermanentUser).toHaveBeenCalledOnce();
  });
});
