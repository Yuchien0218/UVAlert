import { describe, expect, it } from "vitest";
import {
  FiveDayUvForecastSchema,
  RegionPreferenceV1Schema,
  RegionReferenceSchema,
  RegionSelectionSchema
} from "./weather";

describe("region contracts", () => {
  it("accepts a compact region reference in a forecast response", () => {
    const forecast = FiveDayUvForecastSchema.parse({
      schemaVersion: "five-day-uv-v2",
      region: {
        regionCode: "63000010",
        displayName: "臺北市松山區"
      },
      sourceKind: "forecast",
      sourceDataset: "F-D0047-091",
      sourceDisplayName: "中央氣象署",
      issuedAt: "2026-08-01T00:00:00.000Z",
      fetchedAt: "2026-08-01T00:01:00.000Z",
      usableUntil: "2026-08-02T00:01:00.000Z",
      days: [
        {
          localDate: "2026-08-01",
          validFrom: "2026-08-01T00:00:00.000Z",
          validTo: "2026-08-02T00:00:00.000Z",
          uvi: 8,
          riskLevel: "very_high"
        }
      ]
    });

    expect(forecast.region.regionCode).toBe("63000010");
  });

  it("requires official administrative fields for a local selection", () => {
    expect(
      RegionSelectionSchema.safeParse({
        regionCode: "63000010",
        displayName: "臺北市松山區"
      }).success
    ).toBe(false);
  });

  it("represents a selected region with its resolution provenance", () => {
    const selection = RegionSelectionSchema.parse({
      regionCode: "63000010",
      displayName: "臺北市松山區",
      countyCode: "63000",
      countyName: "臺北市",
      townName: "松山區",
      boundaryDataVersion: "2025-03-18",
      selectionMethod: "device_location"
    });

    expect(selection.selectionMethod).toBe("device_location");
  });

  it("represents an explicit skip separately from no preference", () => {
    const preference = RegionPreferenceV1Schema.parse({
      schemaVersion: "region-preference-v1",
      mode: "skipped",
      skippedAt: "2026-08-01T00:00:00.000Z"
    });

    expect(preference.mode).toBe("skipped");
  });

  it("keeps the compact reference schema independent", () => {
    expect(
      RegionReferenceSchema.parse({
        regionCode: "63000010",
        displayName: "臺北市松山區"
      })
    ).toEqual({
      regionCode: "63000010",
      displayName: "臺北市松山區"
    });
  });
});
