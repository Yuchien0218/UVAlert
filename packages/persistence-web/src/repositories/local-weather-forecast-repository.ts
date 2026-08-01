import {
  FiveDayUvForecastSchema,
  type FiveDayUvForecast
} from "@sunshield/contracts";
import type { UvForecastSnapshotPort } from "@sunshield/platform";
import type {
  SunshieldDatabase,
  WeatherSnapshotRecord
} from "../db/database";

const FIVE_DAY_SOURCE_KIND = "five_day_uv_forecast";

export class LocalWeatherForecastRepository
  implements UvForecastSnapshotPort
{
  readonly #database: SunshieldDatabase;

  constructor(database: SunshieldDatabase) {
    this.#database = database;
  }

  async getLatestForecast(
    regionCode: string
  ): Promise<FiveDayUvForecast | null> {
    const records = await this.#database.WeatherSnapshots
      .where("regionId")
      .equals(regionCode)
      .toArray();

    records.sort((left, right) =>
      right.fetchedAt.localeCompare(left.fetchedAt)
    );

    for (const record of records) {
      if (
        record.sourceKind !== FIVE_DAY_SOURCE_KIND ||
        record.payload === undefined
      ) {
        continue;
      }
      const parsed = FiveDayUvForecastSchema.safeParse(record.payload);
      if (parsed.success) return parsed.data;
    }

    return null;
  }

  async saveForecast(forecast: FiveDayUvForecast): Promise<void> {
    const parsed = FiveDayUvForecastSchema.parse(forecast);
    const record: WeatherSnapshotRecord = {
      id: [
        FIVE_DAY_SOURCE_KIND,
        parsed.region.regionCode,
        parsed.fetchedAt
      ].join(":"),
      regionId: parsed.region.regionCode,
      sourceKind: FIVE_DAY_SOURCE_KIND,
      fetchedAt: parsed.fetchedAt,
      usableUntil: parsed.usableUntil,
      payload: parsed
    };

    await this.#database.WeatherSnapshots.put(record);
  }
}
