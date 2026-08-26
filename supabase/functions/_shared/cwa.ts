/**
 * CWA F-D0047-091 的 server-only boundary。
 *
 * 這個檔案不放在 web workspace，避免 CWA 授權碼進入瀏覽器 bundle。
 * CWA 的 JSON 欄位在不同下載格式中可能是中文名稱或欄位代碼，因此
 * mapping 只接受已知欄位，最後仍由 browser contract 做第二次驗證。
 */

export const CWA_DATASET = "F-D0047-091" as const;
export const CWA_ENDPOINT =
  "https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091";
const DEFAULT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export type UvForecastPayload = {
  schemaVersion: "five-day-uv-v2";
  region: { regionCode: string; displayName: string };
  sourceKind: "forecast";
  sourceDataset: typeof CWA_DATASET;
  sourceDisplayName: string;
  issuedAt: string;
  fetchedAt: string;
  usableUntil: string;
  days: Array<{
    localDate: string;
    validFrom: string;
    validTo: string;
    uvi: number;
    riskLevel: "low" | "moderate" | "high" | "very_high" | "extreme";
    temperatureCelsius: number | null;
  }>;
};

export type CwaFetchResult = {
  status: number;
  etag: string | null;
  payload: unknown | null;
};

export class CwaMappingError extends Error {
  readonly reason:
    | "INVALID_RESPONSE"
    | "REGION_NOT_FOUND"
    | "UV_DATA_MISSING"
    | "INVALID_UVI"
    | "INVALID_TIME"
    | "FORECAST_EXPIRED";

  constructor(
    reason: CwaMappingError["reason"],
    message = "CWA 預報資料格式無法使用"
  ) {
    super(message);
    this.name = "CwaMappingError";
    this.reason = reason;
  }
}

export class CwaUpstreamError extends Error {
  readonly status: number;

  constructor(status: number) {
    super("CWA 預報服務暫時無法使用");
    this.name = "CwaUpstreamError";
    this.status = status;
  }
}

export function buildCwaRequestUrl(options: {
  endpoint?: string;
  apiKey: string;
}): string {
  if (options.apiKey.trim() === "") {
    throw new Error("CWA_API_KEY_MISSING");
  }
  const url = new URL(options.endpoint ?? CWA_ENDPOINT);
  url.searchParams.set("Authorization", options.apiKey);
  url.searchParams.set("format", "JSON");
  // Only request the two fields needed by UVAlert.  The region is selected
  // from the returned Geocode so a caller cannot make arbitrary location
  // names reach the upstream service.
  url.searchParams.set("elementName", "UVIndex,T");
  return url.toString();
}

export function parseRegionCode(value: string | null): string {
  const regionCode = value?.trim() ?? "";
  // Taiwan 368-town directory codes are eight digits.  The returned CWA
  // Geocode is checked again in mapCwaForecast, so a syntactically valid but
  // unsupported code still cannot produce a forecast.
  if (!/^\d{8}$/.test(regionCode) || /^0{8}$/.test(regionCode)) {
    throw new CwaMappingError("REGION_NOT_FOUND", "行政區代碼不受支援");
  }
  return regionCode;
}

export async function fetchCwaDataset(options: {
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
  endpoint?: string;
  apiKey: string;
  etag?: string | null;
}): Promise<CwaFetchResult> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.etag !== undefined && options.etag !== null) {
    headers["If-None-Match"] = options.etag;
  }
  let response: Response;
  try {
    response = await options.fetch(buildCwaRequestUrl(options), {
      method: "GET",
      headers,
      cache: "no-store"
    });
  } catch {
    throw new CwaUpstreamError(503);
  }
  if (response.status === 304) {
    return {
      status: 304,
      etag: response.headers.get("ETag"),
      payload: null
    };
  }
  if (!response.ok) throw new CwaUpstreamError(response.status);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new CwaMappingError("INVALID_RESPONSE");
  }
  return {
    status: response.status,
    etag: response.headers.get("ETag"),
    payload
  };
}

export function mapCwaForecast(
  input: unknown,
  options: {
    regionCode: string;
    fetchedAt: string;
    now?: string;
    usableUntil?: string;
  }
): UvForecastPayload {
  const fetchedAt = normalizeInstant(options.fetchedAt, "fetchedAt");
  const now = normalizeInstant(options.now ?? fetchedAt, "now");
  const root = asObject(input, "CWA response");
  const records = asObject(root.records, "CWA records");
  const locations = asArray(records.locations, "CWA locations");
  const container =
    locations[0] === undefined
      ? null
      : asObject(locations[0], "CWA locations[0]");
  const rawLocations =
    container === null ? [] : asArray(container.location, "CWA location");
  const location = rawLocations
    .map((item) => asObject(item, "CWA location item"))
    .find(
      (item) =>
        String(item.Geocode ?? item.geocode ?? "") === options.regionCode
    );
  if (location === undefined) {
    throw new CwaMappingError(
      "REGION_NOT_FOUND",
      "找不到所選行政區的 CWA 預報"
    );
  }

  const elements = asArray(
    location.WeatherElement ?? location.weatherElement,
    "CWA weatherElement"
  ).map((item) => asObject(item, "CWA weatherElement item"));
  const uvElement = elements.find((element) =>
    ["紫外線指數", "UVIndex", "uvIndex"].includes(
      String(element.ElementName ?? element.elementName ?? "")
    )
  );
  if (uvElement === undefined) {
    throw new CwaMappingError("UV_DATA_MISSING", "CWA 回應沒有紫外線指數");
  }
  const uvTimes = asArray(uvElement.Time ?? uvElement.time, "CWA UV times").map(
    (item) => asObject(item, "CWA UV time")
  );
  const temperatureElement = elements.find((element) =>
    ["平均溫度", "T", "Temperature", "temperature"].includes(
      String(element.ElementName ?? element.elementName ?? "")
    )
  );
  const temperatureTimes =
    temperatureElement === undefined
      ? []
      : asArray(
          temperatureElement.Time ?? temperatureElement.time,
          "CWA temperature times"
        ).map((item) => asObject(item, "CWA temperature time"));

  const daysByDate = new Map<string, UvForecastPayload["days"][number]>();
  for (const time of uvTimes) {
    const startSource = readString(time.StartTime ?? time.startTime);
    const endSource = readString(time.EndTime ?? time.endTime);
    if (startSource === null || endSource === null) continue;
    const validFrom = normalizeInstant(startSource, "startTime");
    const validTo = normalizeInstant(endSource, "endTime");
    if (Date.parse(validTo) <= Date.parse(validFrom)) {
      throw new CwaMappingError("INVALID_TIME");
    }
    if (Date.parse(validTo) <= Date.parse(now)) continue;
    const value = readElementValue(time, [
      "UVIndex",
      "uvIndex",
      "value",
      "Value"
    ]);
    const uvi = parseUvi(value);
    if (uvi === null) continue;
    const localDate = startSource.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
      throw new CwaMappingError("INVALID_TIME");
    }
    const candidate = {
      localDate,
      validFrom,
      validTo,
      uvi,
      riskLevel: riskLevelFor(uvi),
      temperatureCelsius: readTemperature(
        temperatureTimes,
        startSource,
        endSource
      )
    } satisfies UvForecastPayload["days"][number];
    const existing = daysByDate.get(localDate);
    if (existing === undefined || candidate.uvi > existing.uvi) {
      daysByDate.set(localDate, candidate);
    }
  }

  const days = [...daysByDate.values()]
    .sort(
      (left, right) => Date.parse(left.validFrom) - Date.parse(right.validFrom)
    )
    .slice(0, 5);
  if (days.length === 0) {
    throw new CwaMappingError("FORECAST_EXPIRED", "CWA 預報已沒有可使用時段");
  }

  const datasetInfo = asObject(
    records.datasetInfo ?? records.DatasetInfo ?? {},
    "CWA datasetInfo"
  );
  const issuedAtSource = readString(
    datasetInfo.IssueTime ??
      datasetInfo.issueTime ??
      datasetInfo.Update ??
      datasetInfo.update
  );
  const displayName = readString(
    location.LocationName ?? location.locationName
  );
  if (displayName === null) {
    throw new CwaMappingError("INVALID_RESPONSE", "CWA 回應缺少行政區名稱");
  }
  const usableUntil = normalizeInstant(
    options.usableUntil ??
      new Date(Date.parse(fetchedAt) + DEFAULT_CACHE_TTL_MS).toISOString(),
    "usableUntil"
  );
  if (Date.parse(usableUntil) <= Date.parse(fetchedAt)) {
    throw new CwaMappingError("INVALID_TIME");
  }
  return {
    schemaVersion: "five-day-uv-v2",
    region: { regionCode: options.regionCode, displayName },
    sourceKind: "forecast",
    sourceDataset: CWA_DATASET,
    sourceDisplayName: "中央氣象署區域預報",
    issuedAt:
      issuedAtSource === null
        ? fetchedAt
        : normalizeInstant(issuedAtSource, "issuedAt"),
    fetchedAt,
    usableUntil,
    days
  };
}

export function parseCachedForecast(input: unknown): UvForecastPayload {
  const value = asObject(input, "cached forecast");
  if (
    value.schemaVersion !== "five-day-uv-v2" ||
    value.sourceDataset !== CWA_DATASET
  ) {
    throw new CwaMappingError("INVALID_RESPONSE");
  }
  const region = asObject(value.region, "cached region");
  const days = asArray(value.days, "cached days");
  const parsedDays = days.map((item) => {
    const day = asObject(item, "cached day");
    const uvi = day.uvi;
    if (typeof uvi !== "number" || !Number.isInteger(uvi) || uvi < 0) {
      throw new CwaMappingError("INVALID_UVI");
    }
    const temperature = day.temperatureCelsius;
    if (
      temperature !== null &&
      (typeof temperature !== "number" || !Number.isFinite(temperature))
    ) {
      throw new CwaMappingError("INVALID_RESPONSE");
    }
    return {
      localDate: assertDate(day.localDate),
      validFrom: normalizeInstant(day.validFrom, "validFrom"),
      validTo: normalizeInstant(day.validTo, "validTo"),
      uvi,
      riskLevel: riskLevelFor(uvi),
      temperatureCelsius: temperature as number | null
    } satisfies UvForecastPayload["days"][number];
  });
  if (parsedDays.length < 1 || parsedDays.length > 5) {
    throw new CwaMappingError("INVALID_RESPONSE");
  }
  return {
    schemaVersion: "five-day-uv-v2",
    region: {
      regionCode: assertNonEmptyString(region.regionCode),
      displayName: assertNonEmptyString(region.displayName)
    },
    sourceKind: "forecast",
    sourceDataset: CWA_DATASET,
    sourceDisplayName: assertNonEmptyString(value.sourceDisplayName),
    issuedAt: normalizeInstant(value.issuedAt, "issuedAt"),
    fetchedAt: normalizeInstant(value.fetchedAt, "fetchedAt"),
    usableUntil: normalizeInstant(value.usableUntil, "usableUntil"),
    days: parsedDays
  };
}

function readTemperature(
  times: Record<string, unknown>[],
  start: string,
  end: string
): number | null {
  const match = times.find((time) =>
    time.StartTime === start || time.startTime === start
      ? time.EndTime === end || time.endTime === end
      : false
  );
  if (match === undefined) return null;
  const value = readElementValue(match, [
    "Temperature",
    "temperature",
    "value",
    "Value"
  ]);
  if (value === null || value === "" || value === "--") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readElementValue(
  time: Record<string, unknown>,
  keys: string[]
): unknown {
  const raw = time.ElementValue ?? time.elementValue;
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (isObject(first)) {
      for (const key of keys) if (first[key] !== undefined) return first[key];
    }
  } else if (isObject(raw)) {
    for (const key of keys) if (raw[key] !== undefined) return raw[key];
  }
  for (const key of keys) if (time[key] !== undefined) return time[key];
  return null;
}

function parseUvi(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "--" ||
    value === "-99"
  ) {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    throw new CwaMappingError("INVALID_UVI", "CWA 回應含有非法紫外線指數");
  }
  return parsed;
}

function riskLevelFor(
  uvi: number
): UvForecastPayload["days"][number]["riskLevel"] {
  if (uvi <= 2) return "low";
  if (uvi <= 5) return "moderate";
  if (uvi <= 7) return "high";
  if (uvi <= 10) return "very_high";
  return "extreme";
}

function normalizeInstant(value: unknown, field: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new CwaMappingError("INVALID_TIME", `${field} 不是有效時間`);
  }
  return new Date(value).toISOString();
}

function assertDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new CwaMappingError("INVALID_TIME");
  }
  return value;
}

function assertNonEmptyString(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new CwaMappingError("INVALID_RESPONSE");
  }
  return value.trim();
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function asObject(value: unknown, field: string): Record<string, unknown> {
  if (!isObject(value))
    throw new CwaMappingError("INVALID_RESPONSE", `${field} 格式不正確`);
  return value;
}

function asArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value))
    throw new CwaMappingError("INVALID_RESPONSE", `${field} 格式不正確`);
  return value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
