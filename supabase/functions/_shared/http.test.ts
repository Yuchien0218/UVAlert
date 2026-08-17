import { describe, expect, it } from "vitest";
import { errorResponse } from "./http";

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
});
