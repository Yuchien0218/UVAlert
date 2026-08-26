import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  createGeneratedArtifacts,
  normalizeRegionFeature,
  selectOfficialShapefileBase,
  transformGeometryToWgs84,
  validateRegionFeatures
} from "./build-region-data.mjs";

const fixtureUrl = new URL(
  "./fixtures/sample-regions.geojson",
  import.meta.url
);

async function readFixture() {
  return JSON.parse(await readFile(fileURLToPath(fixtureUrl), "utf8"));
}

describe("region data build pipeline", () => {
  it("normalizes official properties and calculates a bounding box", async () => {
    const fixture = await readFixture();

    const feature = normalizeRegionFeature(fixture.features[0]);

    expect(feature.properties).toEqual({
      regionCode: "63000010",
      countyCode: "63000",
      countyName: "臺北市",
      townName: "松山區",
      displayName: "臺北市松山區",
      bbox: [121.5, 25, 121.6, 25.1]
    });
  });

  it("rejects duplicate official town codes", async () => {
    const fixture = await readFixture();
    const feature = normalizeRegionFeature(fixture.features[0]);

    expect(() => validateRegionFeatures([feature, feature])).toThrow(
      /duplicate regionCode 63000010/
    );
  });

  it("creates deterministically sorted boundaries, index, and manifest", async () => {
    const fixture = await readFixture();
    const features = fixture.features.map(normalizeRegionFeature);

    const first = createGeneratedArtifacts(features.reverse(), {
      sourceReleaseDate: "2025-03-18",
      generatedAt: "2026-08-01T00:00:00.000Z",
      simplificationTolerance: 0.00002
    });
    const second = createGeneratedArtifacts([...features].reverse(), {
      sourceReleaseDate: "2025-03-18",
      generatedAt: "2026-08-01T00:00:00.000Z",
      simplificationTolerance: 0.00002
    });

    expect(first).toEqual(second);
    expect(first.index.map((entry) => entry.regionCode)).toEqual([
      "09007010",
      "63000010"
    ]);
    expect(first.manifest.featureCount).toBe(2);
    expect(first.manifest.source.datasetId).toBe(7441);
  });

  it("selects the complete official TOWN_MOI layer from the archive", () => {
    expect(
      selectOfficialShapefileBase([
        "Town_Majia_Sanhe.shp",
        "Town_Majia_Sanhe.dbf",
        "TOWN_MOI_1140318.shp",
        "TOWN_MOI_1140318.dbf"
      ])
    ).toBe("TOWN_MOI_1140318");
  });

  it("transforms TWD97 geographic geometry to finite WGS84 coordinates", () => {
    const transformed = transformGeometryToWgs84({
      type: "Polygon",
      coordinates: [
        [
          [121.5, 25],
          [121.6, 25],
          [121.6, 25.1],
          [121.5, 25]
        ]
      ]
    });

    expect(transformed.coordinates[0][0][0]).toBeCloseTo(121.5, 5);
    expect(transformed.coordinates[0][0][1]).toBeCloseTo(25, 5);
  });
});
