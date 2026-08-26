import { makeFiveDayUvForecast } from "@sunshield/test-fixtures";
import { describe, expect, it, vi } from "vitest";
import { BrowserUvForecastClient } from "./BrowserUvForecastClient";

describe("BrowserUvForecastClient", () => {
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
});
