import { describe, expect, it, vi } from "vitest";
import { resolveParseSunscreenLabelEndpoint } from "./parseSunscreenLabelEndpoint";

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
