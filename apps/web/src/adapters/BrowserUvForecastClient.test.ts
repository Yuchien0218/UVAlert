import { makeFiveDayUvForecast } from "@sunshield/test-fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BrowserUvForecastClient,
  resolveUvForecastEndpoint
} from "./BrowserUvForecastClient";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("BrowserUvForecastClient", () => {
  it.each([
    [undefined, "/v1/uv/forecast"],
    ["", "/v1/uv/forecast"],
    ["   ", "/v1/uv/forecast"],
    ["/v1", "/v1/uv/forecast"],
    ["/v1/", "/v1/uv/forecast"],
    [
      " https://project-ref.supabase.co/functions/v1/ ",
      "https://project-ref.supabase.co/functions/v1/uv-forecast"
    ]
  ])("由 API base %j 組出 UV endpoint", (baseUrl, expected) => {
    expect(resolveUvForecastEndpoint(baseUrl)).toBe(expected);
  });

  it("以同源 API 取得並驗證五日預報 contract", async () => {
    const forecast = makeFiveDayUvForecast();
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(forecast), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
    );
    const client = new BrowserUvForecastClient({ fetch });

    const result = await client.getFiveDayForecast(forecast.region.regionCode);

    expect(result).toEqual(forecast);
    expect(fetch).toHaveBeenCalledWith(
      "/v1/uv/forecast?regionCode=TPE-ZHONGZHENG",
      expect.objectContaining({
        method: "GET",
        cache: "no-store"
      })
    );
  });

  it("拒絕非成功 HTTP 回應", async () => {
    const client = new BrowserUvForecastClient({
      fetch: async () => new Response(null, { status: 503 })
    });

    await expect(client.getFiveDayForecast("TPE-ZHONGZHENG")).rejects.toThrow(
      "UV_FORECAST_HTTP_503"
    );
  });

  it("預設使用環境設定的 Supabase Function base URL", async () => {
    vi.stubEnv(
      "VITE_API_BASE_URL",
      "https://project-ref.supabase.co/functions/v1/"
    );
    const forecast = makeFiveDayUvForecast();
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(forecast), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
    );

    await new BrowserUvForecastClient({ fetch }).getFiveDayForecast(
      forecast.region.regionCode
    );

    expect(fetch).toHaveBeenCalledWith(
      "https://project-ref.supabase.co/functions/v1/uv-forecast?regionCode=TPE-ZHONGZHENG",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("明確傳入的 endpoint 優先於環境設定", async () => {
    vi.stubEnv(
      "VITE_API_BASE_URL",
      "https://project-ref.supabase.co/functions/v1"
    );
    const forecast = makeFiveDayUvForecast();
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(forecast), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
    );

    await new BrowserUvForecastClient({
      fetch,
      endpoint: "/test-only/uv"
    }).getFiveDayForecast(forecast.region.regionCode);

    expect(fetch).toHaveBeenCalledWith(
      "/test-only/uv?regionCode=TPE-ZHONGZHENG",
      expect.objectContaining({ method: "GET" })
    );
  });
});
