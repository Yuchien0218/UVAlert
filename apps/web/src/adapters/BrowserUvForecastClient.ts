import {
  FiveDayUvForecastSchema,
  NationwideUvForecastSchema,
  type FiveDayUvForecast,
  type NationwideUvForecast
} from "@sunshield/contracts";
import type { UvForecastApiPort } from "@sunshield/platform";
import { readConfiguredEnvironmentValue } from "./configuredEnvironment";

type FetchPort = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

const DEFAULT_API_BASE_URL = "/v1";

export function resolveUvForecastEndpoint(baseUrl?: string): string {
  const configuredBaseUrl =
    readConfiguredEnvironmentValue(baseUrl) ?? DEFAULT_API_BASE_URL;
  const normalizedBaseUrl = configuredBaseUrl.replace(/\/+$/, "");
  return /^https?:\/\//u.test(normalizedBaseUrl)
    ? `${normalizedBaseUrl}/uv-forecast`
    : `${normalizedBaseUrl}/uv/forecast`;
}

export class BrowserUvForecastClient implements UvForecastApiPort {
  readonly #fetch: FetchPort;
  readonly #endpoint: string;

  constructor(
    options: {
      fetch?: FetchPort;
      endpoint?: string;
    } = {}
  ) {
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.#endpoint =
      options.endpoint ??
      resolveUvForecastEndpoint(import.meta.env.VITE_API_BASE_URL);
  }

  async getFiveDayForecast(regionCode: string): Promise<FiveDayUvForecast> {
    const query = new URLSearchParams({ regionCode });
    const response = await this.#fetch(
      `${this.#endpoint}?${query.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(`UV_FORECAST_HTTP_${response.status}`);
    }

    return FiveDayUvForecastSchema.parse(await response.json());
  }

  /**
   * 全臺各縣市今日的 UV。
   *
   * 走同一個端點的 scope=nationwide，因為它與五日預報共用同一次上游抓取
   * ——分成兩個 function 會變成抓兩次同一份資料集。
   */
  async getNationwideForecast(): Promise<NationwideUvForecast> {
    const response = await this.#fetch(`${this.#endpoint}?scope=nationwide`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`UV_NATIONWIDE_HTTP_${response.status}`);
    }

    return NationwideUvForecastSchema.parse(await response.json());
  }
}
