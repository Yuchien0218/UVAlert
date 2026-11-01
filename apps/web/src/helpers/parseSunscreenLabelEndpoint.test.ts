import { describe, expect, it, vi } from "vitest";
import {
  readSunscreenScanErrorMessage,
  resolveParseSunscreenLabelEndpoint
} from "./parseSunscreenLabelEndpoint";

describe("resolveParseSunscreenLabelEndpoint", () => {
  it("自訂 baseUrl 優先採用", () => {
    expect(
      resolveParseSunscreenLabelEndpoint({
        baseUrl: "https://custom.supabase.co/functions/v1/"
      })
    ).toBe("https://custom.supabase.co/functions/v1/parse-sunscreen-label");
  });

  it("在 production 預設直連正式 Supabase Edge Function，避免 Vercel 405", () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    expect(resolveParseSunscreenLabelEndpoint({ isDev: false })).toBe(
      "https://ykfdnltaqpdytmrszbbk.supabase.co/functions/v1/parse-sunscreen-label"
    );
  });

  it("若環境變數設為 /v1 但處於 production，仍退回 Supabase Edge Function", () => {
    vi.stubEnv("VITE_API_BASE_URL", "/v1");
    expect(resolveParseSunscreenLabelEndpoint({ isDev: false })).toBe(
      "https://ykfdnltaqpdytmrszbbk.supabase.co/functions/v1/parse-sunscreen-label"
    );
  });

  it("若在 dev 且環境變數為 /v1，使用本地 proxy", () => {
    vi.stubEnv("VITE_API_BASE_URL", "/v1");
    expect(resolveParseSunscreenLabelEndpoint({ isDev: true })).toBe(
      "/v1/parse-sunscreen-label"
    );
  });

  it("若環境變數為完整 https URL，優先採用", () => {
    vi.stubEnv(
      "VITE_API_BASE_URL",
      "https://test-project.supabase.co/functions/v1"
    );
    expect(resolveParseSunscreenLabelEndpoint({ isDev: false })).toBe(
      "https://test-project.supabase.co/functions/v1/parse-sunscreen-label"
    );
  });
});

describe("readSunscreenScanErrorMessage", () => {
  it("解析標準 _shared/http.ts 的 { error: { code, message } } 結構", () => {
    expect(
      readSunscreenScanErrorMessage(
        {
          error: {
            code: "UPSTREAM_ERROR",
            message: "視覺辨識服務暫時無法回應，請稍後再試"
          }
        },
        502
      )
    ).toBe("視覺辨識服務暫時無法回應，請稍後再試");
  });

  it("相容 { error: string } 字串結構", () => {
    expect(
      readSunscreenScanErrorMessage({ error: "Bad Gateway" }, 502)
    ).toBe("Bad Gateway");
  });

  it("相容 Supabase 網關層 { message: string } 結構", () => {
    expect(
      readSunscreenScanErrorMessage({ message: "Invalid JWT" }, 401)
    ).toBe("Invalid JWT");
  });

  it("當 error 為無 message 的未知物件時退回 HTTP 狀態碼，絕不回傳 [object Object]", () => {
    const msg = readSunscreenScanErrorMessage({ error: { foo: "bar" } }, 502);
    expect(msg).toBe("HTTP 502");
    expect(msg).not.toContain("[object Object]");
  });

  it("當 body 為 null 或非物件時退回 HTTP 狀態碼", () => {
    expect(readSunscreenScanErrorMessage(null, 500)).toBe("HTTP 500");
  });
});
