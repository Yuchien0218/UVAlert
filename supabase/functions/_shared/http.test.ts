import { describe, expect, it, vi } from "vitest";
import { corsHeaders, errorResponse } from "./http";

describe("backend HTTP helpers", () => {
  it("maps a typed error to stable JSON without exposing stack details", () => {
    const response = errorResponse({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "資料格式不正確"
    });

    expect(response.status).toBe(422);
    expect(response.json).toEqual({
      error: { code: "VALIDATION_ERROR", message: "資料格式不正確" }
    });
    expect(response.json).not.toHaveProperty("stack");
  });

  it("keeps a request id without exposing arbitrary error fields", () => {
    const response = errorResponse({
      status: 500,
      code: "SERVER_ERROR",
      message: "伺服器暫時無法完成要求",
      requestId: "request-1"
    });

    expect(response.json).toEqual({
      error: {
        code: "SERVER_ERROR",
        message: "伺服器暫時無法完成要求",
        requestId: "request-1"
      }
    });
  });

  it("allows the subscription methods and only required request headers", () => {
    vi.stubGlobal("Deno", { env: { get: vi.fn(() => undefined) } });
    const headers = corsHeaders(
      new Request("https://api.test/push-subscription")
    );

    expect(headers["Access-Control-Allow-Methods"]).toBe(
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    expect(headers["Access-Control-Allow-Headers"]).toBe(
      "authorization, content-type"
    );
  });
});
