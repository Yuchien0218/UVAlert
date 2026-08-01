import { describe, expect, it } from "vitest";
import boundaries from "../../generated/region-boundaries.generated.json";
import {
  TaiwanRegionResolver,
  type RegionBoundaryCollection
} from "./TaiwanRegionResolver";

describe("official generated Taiwan region boundaries", () => {
  it("contains all 368 districts from the pinned source", () => {
    expect(boundaries.features).toHaveLength(368);
  });

  it("resolves a known point at Taipei City Hall to Xinyi District", () => {
    const resolver = new TaiwanRegionResolver(
      boundaries as unknown as RegionBoundaryCollection
    );

    expect(resolver.resolve(121.5645, 25.0375)).toEqual({
      kind: "resolved",
      region: {
        regionCode: "63000020",
        countyCode: "63000",
        countyName: "臺北市",
        townName: "信義區",
        displayName: "臺北市信義區"
      }
    });
  });
});
