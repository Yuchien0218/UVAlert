import { describe, expect, it, vi } from "vitest";
import {
  buildCwaRequestUrl,
  CwaMappingError,
  CwaUpstreamError,
  fetchCwaDataset,
  mapCwaForecast,
  parseCachedForecast
} from "./cwa";

const regionCode = "65000010";

function makeCwaResponse(
  overrides: {
    regionCode?: string;
    uvi?: unknown;
    emptyValue?: boolean;
  } = {}
) {
  const days = Array.from({ length: 5 }, (_, index) => {
    const date = `2026-08-${String(17 + index).padStart(2, "0")}`;
    return {
      start: `${date}T06:00:00+08:00`,
      end: `${date}T18:00:00+08:00`,
      uvi: index === 0 ? (overrides.uvi ?? 8) : 5,
      temperature: 30 + index
    };
  });
  return {
    records: {
      locations: [
        {
          datasetInfo: { IssueTime: "2026-08-17T01:00:00+08:00" },
          location: [
            {
              LocationName: "新北市萬里區",
              Geocode: overrides.regionCode ?? regionCode,
              WeatherElement: [
                {
                  ElementName: "紫外線指數",
                  Time: days.map((day) => ({
                    StartTime: day.start,
                    EndTime: day.end,
                    ElementValue: [
                      { UVIndex: overrides.emptyValue ? "--" : day.uvi }
                    ]
                  }))
                },
                {
                  ElementName: "平均溫度",
                  Time: days.map((day) => ({
                    StartTime: day.start,
                    EndTime: day.end,
                    ElementValue: [{ Temperature: day.temperature }]
                  }))
                }
              ]
            }
          ]
        }
      ]
    }
  };
}

describe("CWA UV boundary", () => {
  it("將 F-D0047-091 的 UV 時段映射為五日預報並保留溫度", () => {
    const result = mapCwaForecast(makeCwaResponse(), {
      regionCode,
      fetchedAt: "2026-08-17T00:00:00.000Z",
      now: "2026-08-17T00:00:00.000Z"
    });

    expect(result.region).toEqual({ regionCode, displayName: "新北市萬里區" });
    expect(result.sourceDataset).toBe("F-D0047-091");
    expect(result.days).toHaveLength(5);
    expect(result.days[0]).toMatchObject({
      localDate: "2026-08-17",
      validFrom: "2026-08-16T22:00:00.000Z",
      validTo: "2026-08-17T10:00:00.000Z",
      uvi: 8,
      riskLevel: "very_high",
      temperatureCelsius: 30
    });
  });

  it("找不到行政區、非法 UVI、全空值或已過期資料都不會產生預報", () => {
    expect(() =>
      mapCwaForecast(makeCwaResponse({ regionCode: "99999999" }), {
        regionCode,
        fetchedAt: "2026-08-17T00:00:00.000Z"
      })
    ).toThrowError(CwaMappingError);
    expect(() =>
      mapCwaForecast(makeCwaResponse({ uvi: "not-a-number" }), {
        regionCode,
        fetchedAt: "2026-08-17T00:00:00.000Z"
      })
    ).toThrowError(CwaMappingError);
    expect(() =>
      mapCwaForecast(makeCwaResponse({ emptyValue: true }), {
        regionCode,
        fetchedAt: "2026-08-17T00:00:00.000Z"
      })
    ).toThrowError(CwaMappingError);
    expect(() =>
      mapCwaForecast(makeCwaResponse(), {
        regionCode,
        fetchedAt: "2026-08-18T00:00:00.000Z",
        now: "2026-08-22T00:00:00.000Z"
      })
    ).toThrowError(CwaMappingError);
  });

  it("支援 ETag 條件請求", async () => {
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.headers).toEqual({
        Accept: "application/json",
        "If-None-Match": "etag-1"
      });
      return new Response(null, { status: 304, headers: { ETag: "etag-1" } });
    });
    const result = await fetchCwaDataset({
      fetch,
      apiKey: "secret-key",
      etag: "etag-1"
    });
    expect(result).toEqual({ status: 304, etag: "etag-1", payload: null });
    expect(buildCwaRequestUrl({ apiKey: "secret-key" })).toContain(
      "format=JSON"
    );
  });

  it.each([401, 429, 500, 503])(
    "CWA HTTP %i 保留 status 且不洩漏授權碼",
    async (status) => {
      const apiKey = "cwa-secret-do-not-leak";
      const failedFetch = vi.fn(async () => new Response(null, { status }));

      await expect(
        fetchCwaDataset({ fetch: failedFetch, apiKey })
      ).rejects.toMatchObject({ status });

      try {
        await fetchCwaDataset({ fetch: failedFetch, apiKey });
      } catch (error) {
        expect(error).toBeInstanceOf(CwaUpstreamError);
        expect(JSON.stringify(error)).not.toContain(apiKey);
        expect(String(error)).not.toContain(apiKey);
      }
    }
  );

  it("CWA 回傳非 JSON 時拒絕資料且不洩漏授權碼", async () => {
    const apiKey = "cwa-secret-do-not-leak";
    const invalidJsonFetch = vi.fn(
      async () =>
        new Response("not-json", {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
    );

    try {
      await fetchCwaDataset({ fetch: invalidJsonFetch, apiKey });
      expect.unreachable("非 JSON response 應拋出 CwaMappingError");
    } catch (error) {
      expect(error).toBeInstanceOf(CwaMappingError);
      expect(error).toMatchObject({ reason: "INVALID_RESPONSE" });
      expect(JSON.stringify(error)).not.toContain(apiKey);
      expect(String(error)).not.toContain(apiKey);
    }
  });

  it("拒絕不完整的 cache payload", () => {
    expect(() => parseCachedForecast({ schemaVersion: "legacy" })).toThrow(
      CwaMappingError
    );
  });
});
