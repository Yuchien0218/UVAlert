import { describe, expect, it, vi } from "vitest";
import { CwaUpstreamError } from "../_shared/cwa";
import {
  createForecastHandler,
  type ForecastCacheRow,
  type ForecastHandlerDependencies
} from "./handler";

const regionCode = "65000010";
const now = new Date("2026-08-17T00:00:00.000Z");

function makeForecast() {
  return {
    schemaVersion: "five-day-uv-v2" as const,
    region: { regionCode, displayName: "新北市萬里區" },
    sourceKind: "forecast" as const,
    sourceDataset: "F-D0047-091" as const,
    sourceDisplayName: "中央氣象署區域預報",
    issuedAt: "2026-08-16T17:00:00.000Z",
    fetchedAt: now.toISOString(),
    usableUntil: "2026-08-17T06:00:00.000Z",
    days: [
      {
        localDate: "2026-08-17",
        validFrom: "2026-08-16T22:00:00.000Z",
        validTo: "2026-08-17T10:00:00.000Z",
        uvi: 8,
        riskLevel: "very_high" as const,
        temperatureCelsius: 30
      }
    ]
  };
}

function makeCacheRow(
  overrides: Partial<ForecastCacheRow> = {}
): ForecastCacheRow {
  const forecast = makeForecast();
  return {
    region_code: regionCode,
    schema_version: forecast.schemaVersion,
    source_dataset: forecast.sourceDataset,
    payload: forecast,
    fetched_at: forecast.fetchedAt,
    usable_until: forecast.usableUntil,
    etag: "etag-cached",
    ...overrides
  };
}

function makeCwaResponse() {
  return {
    records: {
      datasetInfo: { IssueTime: "2026-08-17T01:00:00+08:00" },
      locations: [
        {
          location: [
            {
              LocationName: "新北市萬里區",
              Geocode: regionCode,
              WeatherElement: [
                {
                  ElementName: "紫外線指數",
                  Time: [
                    {
                      StartTime: "2026-08-17T06:00:00+08:00",
                      EndTime: "2026-08-17T18:00:00+08:00",
                      ElementValue: [{ UVIndex: 8 }]
                    }
                  ]
                },
                {
                  ElementName: "平均溫度",
                  Time: [
                    {
                      StartTime: "2026-08-17T06:00:00+08:00",
                      EndTime: "2026-08-17T18:00:00+08:00",
                      ElementValue: [{ Temperature: 30 }]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  };
}

function makeDependencies(
  overrides: Partial<ForecastHandlerDependencies> = {}
) {
  return {
    readCache: vi.fn(async () => null),
    writeCache: vi.fn(async () => undefined),
    fetchUpstream: vi.fn(async () => ({
      status: 200,
      etag: "etag-new",
      payload: makeCwaResponse()
    })),
    readSecret: vi.fn(() => "cwa-secret"),
    now: vi.fn(() => now),
    ...overrides
  } satisfies ForecastHandlerDependencies;
}

function makeRequest(method = "GET") {
  return new Request(`https://api.test/uv-forecast?regionCode=${regionCode}`, {
    method
  });
}

describe("uv forecast request handler", () => {
  it("OPTIONS 回傳 204，不讀取 secret 或 cache", async () => {
    const dependencies = makeDependencies();
    const response = await createForecastHandler(dependencies)(
      makeRequest("OPTIONS")
    );

    expect(response.status).toBe(204);
    expect(dependencies.readSecret).not.toHaveBeenCalled();
    expect(dependencies.readCache).not.toHaveBeenCalled();
  });

  it("拒絕非 GET request", async () => {
    const response = await createForecastHandler(makeDependencies())(
      makeRequest("POST")
    );

    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" }
    });
  });

  it("拒絕不受支援的行政區代碼", async () => {
    const response = await createForecastHandler(makeDependencies())(
      new Request("https://api.test/uv-forecast?regionCode=00000000")
    );

    expect(response.status).toBe(422);
  });

  it("缺少 CWA secret 時回傳受控設定錯誤", async () => {
    const dependencies = makeDependencies({
      readSecret: vi.fn(() => undefined)
    });
    const response = await createForecastHandler(dependencies)(makeRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "SERVER_ERROR",
        message: "UV 預報服務尚未完成設定"
      }
    });
    expect(dependencies.readCache).not.toHaveBeenCalled();
  });

  it("有效 cache 直接回傳且不呼叫 CWA", async () => {
    const dependencies = makeDependencies({
      readCache: vi.fn(async () => makeCacheRow())
    });
    const response = await createForecastHandler(dependencies)(makeRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(makeForecast());
    expect(dependencies.fetchUpstream).not.toHaveBeenCalled();
    expect(dependencies.writeCache).not.toHaveBeenCalled();
  });

  it("cache miss 取得 CWA、寫入 cache 並回傳", async () => {
    const dependencies = makeDependencies();
    const response = await createForecastHandler(dependencies)(makeRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      region: { regionCode, displayName: "新北市萬里區" },
      sourceDataset: "F-D0047-091",
      days: [{ uvi: 8, temperatureCelsius: 30 }]
    });
    expect(dependencies.fetchUpstream).toHaveBeenCalledWith({
      apiKey: "cwa-secret",
      etag: null
    });
    expect(dependencies.writeCache).toHaveBeenCalledOnce();
  });

  it("cache 讀取失敗時不呼叫 CWA 並回傳 500", async () => {
    const dependencies = makeDependencies({
      readCache: vi.fn(async () => {
        throw new Error("database unavailable");
      })
    });
    const response = await createForecastHandler(dependencies)(makeRequest());

    expect(response.status).toBe(500);
    expect(dependencies.fetchUpstream).not.toHaveBeenCalled();
  });

  it("CWA 304 時更新有效 cache 的取得與可用時間", async () => {
    const dependencies = makeDependencies({
      readCache: vi.fn(async () =>
        makeCacheRow({ usable_until: "2026-08-16T23:59:59.000Z" })
      ),
      fetchUpstream: vi.fn(async () => ({
        status: 304,
        etag: "etag-cached",
        payload: null
      }))
    });
    const response = await createForecastHandler(dependencies)(makeRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      fetchedAt: "2026-08-17T00:00:00.000Z",
      usableUntil: "2026-08-17T06:00:00.000Z"
    });
    expect(dependencies.writeCache).toHaveBeenCalledOnce();
  });

  it("CWA 304 但 cache 格式錯誤時回傳 503", async () => {
    const dependencies = makeDependencies({
      readCache: vi.fn(async () =>
        makeCacheRow({
          payload: { schemaVersion: "legacy" },
          usable_until: "2026-08-16T23:59:59.000Z"
        })
      ),
      fetchUpstream: vi.fn(async () => ({
        status: 304,
        etag: "etag-cached",
        payload: null
      }))
    });
    const response = await createForecastHandler(dependencies)(makeRequest());

    expect(response.status).toBe(503);
    expect(dependencies.writeCache).not.toHaveBeenCalled();
  });

  it("CWA 上游錯誤時回傳 503", async () => {
    const dependencies = makeDependencies({
      fetchUpstream: vi.fn(async () => {
        throw new CwaUpstreamError(429);
      })
    });
    const response = await createForecastHandler(dependencies)(makeRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "UPSTREAM_UNAVAILABLE" }
    });
  });

  it.each([
    [{ records: { locations: [{ location: [] }] } }, 422],
    [{ invalid: "response" }, 503]
  ])("CWA mapping 錯誤不寫 cache，回傳 %i", async (payload, status) => {
    const dependencies = makeDependencies({
      fetchUpstream: vi.fn(async () => ({
        status: 200,
        etag: null,
        payload
      }))
    });
    const response = await createForecastHandler(dependencies)(makeRequest());

    expect(response.status).toBe(status);
    expect(dependencies.writeCache).not.toHaveBeenCalled();
  });

  it("cache 寫入失敗仍回傳已驗證的 CWA 預報", async () => {
    const dependencies = makeDependencies({
      writeCache: vi.fn(async () => {
        throw new Error("database unavailable");
      })
    });
    const response = await createForecastHandler(dependencies)(makeRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      region: { regionCode },
      days: [{ uvi: 8 }]
    });
  });
});
