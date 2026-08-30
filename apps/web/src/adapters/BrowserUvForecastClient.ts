import {
  FiveDayUvForecastSchema,
  type FiveDayUvForecast
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
}
