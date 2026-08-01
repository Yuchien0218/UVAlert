import { describe, expect, it, vi } from "vitest";
import { LazyTaiwanRegionResolver } from "./LazyTaiwanRegionResolver";
import type { RegionBoundaryCollection } from "./TaiwanRegionResolver";

const collection: RegionBoundaryCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        regionCode: "A",
        countyCode: "A",
        countyName: "甲縣",
        townName: "甲區",
        displayName: "甲縣甲區",
        bbox: [120, 22, 121, 23]
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [120, 22],
            [121, 22],
            [121, 23],
            [120, 23],
            [120, 22]
          ]
        ]
      }
    }
  ]
};

describe("LazyTaiwanRegionResolver", () => {
  it("loads the large boundary asset only on first resolution", async () => {
    const loadBoundaries = vi.fn(async () => collection);
    const resolver = new LazyTaiwanRegionResolver(loadBoundaries);

    expect(loadBoundaries).not.toHaveBeenCalled();

    await resolver.resolve(120.5, 22.5);
    await resolver.resolve(120.5, 22.5);

    expect(loadBoundaries).toHaveBeenCalledOnce();
  });
});
