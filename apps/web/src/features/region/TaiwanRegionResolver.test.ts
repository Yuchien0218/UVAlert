import { describe, expect, it } from "vitest";
import {
  TaiwanRegionResolver,
  type RegionBoundaryFeature,
  type RegionBoundaryCollection
} from "./TaiwanRegionResolver";

const boundaries: RegionBoundaryCollection = {
  type: "FeatureCollection",
  features: [
    regionFeature("A", "Polygon", [
      [
        [120, 22],
        [121, 22],
        [121, 23],
        [120, 23],
        [120, 22]
      ],
      [
        [120.4, 22.4],
        [120.6, 22.4],
        [120.6, 22.6],
        [120.4, 22.6],
        [120.4, 22.4]
      ]
    ]),
    regionFeature("B", "MultiPolygon", [
      [
        [
          [122, 24],
          [123, 24],
          [123, 25],
          [122, 25],
          [122, 24]
        ]
      ]
    ])
  ]
};

describe("TaiwanRegionResolver", () => {
  it("resolves a point inside a polygon", () => {
    const resolver = new TaiwanRegionResolver(boundaries);

    expect(resolver.resolve(120.2, 22.2)).toEqual({
      kind: "resolved",
      region: expect.objectContaining({ regionCode: "A" })
    });
  });

  it("resolves a point inside a multipolygon island", () => {
    const resolver = new TaiwanRegionResolver(boundaries);

    expect(resolver.resolve(122.5, 24.5)).toEqual({
      kind: "resolved",
      region: expect.objectContaining({ regionCode: "B" })
    });
  });

  it("does not treat an interior hole as part of the district", () => {
    const resolver = new TaiwanRegionResolver(boundaries);

    expect(resolver.resolve(120.5, 22.5)).toEqual({
      kind: "outside_supported_area"
    });
  });

  it("returns outside for a point beyond the dataset bounding box", () => {
    const resolver = new TaiwanRegionResolver(boundaries);

    expect(resolver.resolve(10, 10)).toEqual({
      kind: "outside_supported_area"
    });
  });

  it("does not guess when two boundaries contain the same point", () => {
    const overlap: RegionBoundaryCollection = {
      type: "FeatureCollection",
      features: [boundaries.features[0]!, boundaries.features[0]!]
    };
    const resolver = new TaiwanRegionResolver(overlap);

    expect(resolver.resolve(120.2, 22.2)).toEqual({
      kind: "boundary_ambiguous",
      candidates: [
        expect.objectContaining({ regionCode: "A" }),
        expect.objectContaining({ regionCode: "A" })
      ]
    });
  });

  it("rejects non-finite coordinates", () => {
    const resolver = new TaiwanRegionResolver(boundaries);

    expect(() => resolver.resolve(Number.NaN, 22.2)).toThrow(
      /finite/
    );
  });
});

function regionFeature(
  regionCode: string,
  type: "Polygon" | "MultiPolygon",
  coordinates: unknown
): RegionBoundaryFeature {
  return {
    type: "Feature" as const,
    properties: {
      regionCode,
      countyCode: `county-${regionCode}`,
      countyName: `縣市${regionCode}`,
      townName: `行政區${regionCode}`,
      displayName: `縣市${regionCode}行政區${regionCode}`,
      bbox:
        regionCode === "A"
          ? ([120, 22, 121, 23] as const)
          : ([122, 24, 123, 25] as const)
    },
    geometry: {
      type,
      coordinates
    } as RegionBoundaryFeature["geometry"]
  };
}
