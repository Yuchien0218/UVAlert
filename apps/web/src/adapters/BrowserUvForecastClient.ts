import {
  FiveDayUvForecastSchema,
  type FiveDayUvForecast
} from "@sunshield/contracts";
import type { UvForecastApiPort } from "@sunshield/platform";

type FetchPort = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export class BrowserUvForecastClient implements UvForecastApiPort {
  readonly #fetch: FetchPort;
  readonly #endpoint: string;

  constructor(options: {
    fetch?: FetchPort;
    endpoint?: string;
  } = {}) {
    this.#fetch =
      options.fetch ?? globalThis.fetch.bind(globalThis);
    this.#endpoint = options.endpoint ?? "/v1/uv/forecast";
  }

  async getFiveDayForecast(
    regionCode: string
  ): Promise<FiveDayUvForecast> {
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
