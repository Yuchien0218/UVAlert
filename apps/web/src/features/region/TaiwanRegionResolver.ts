import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import type {
  Feature,
  MultiPolygon,
  Polygon
} from "geojson";

export interface RegionDirectoryEntry {
  regionCode: string;
  countyCode: string;
  countyName: string;
  townName: string;
  displayName: string;
}

export interface RegionBoundaryProperties
  extends RegionDirectoryEntry {
  bbox: readonly [number, number, number, number];
}

export type RegionBoundaryFeature = Feature<
  Polygon | MultiPolygon,
  RegionBoundaryProperties
>;

export interface RegionBoundaryCollection {
  type: "FeatureCollection";
  features: readonly RegionBoundaryFeature[];
}

export type RegionResolution =
  | { kind: "resolved"; region: RegionDirectoryEntry }
  | { kind: "outside_supported_area" }
  | {
      kind: "boundary_ambiguous";
      candidates: readonly RegionDirectoryEntry[];
    };

export class TaiwanRegionResolver {
  readonly #features: readonly RegionBoundaryFeature[];
  readonly #globalBoundingBox: readonly [
    number,
    number,
    number,
    number
  ];

  constructor(collection: RegionBoundaryCollection) {
    if (collection.features.length === 0) {
      throw new Error("Region boundary collection cannot be empty");
    }
    this.#features = collection.features;
    this.#globalBoundingBox = calculateGlobalBoundingBox(
      collection.features
    );
  }

  resolve(longitude: number, latitude: number): RegionResolution {
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      throw new Error("Region resolution coordinates must be finite");
    }
    if (!containsPoint(this.#globalBoundingBox, longitude, latitude)) {
      return { kind: "outside_supported_area" };
    }

    const matches = this.#features
      .filter((feature) =>
        containsPoint(feature.properties.bbox, longitude, latitude)
      )
      .filter((feature) =>
        booleanPointInPolygon([longitude, latitude], feature)
      )
      .map(({ properties }) => toDirectoryEntry(properties));

    if (matches.length === 0) {
      return { kind: "outside_supported_area" };
    }
    if (matches.length > 1) {
      return { kind: "boundary_ambiguous", candidates: matches };
    }

    return { kind: "resolved", region: matches[0]! };
  }
}

function calculateGlobalBoundingBox(
  features: readonly RegionBoundaryFeature[]
): readonly [number, number, number, number] {
  return features.reduce<[number, number, number, number]>(
    (bounds, feature) => [
      Math.min(bounds[0], feature.properties.bbox[0]),
      Math.min(bounds[1], feature.properties.bbox[1]),
      Math.max(bounds[2], feature.properties.bbox[2]),
      Math.max(bounds[3], feature.properties.bbox[3])
    ],
    [Infinity, Infinity, -Infinity, -Infinity]
  );
}

function containsPoint(
  bbox: readonly [number, number, number, number],
  longitude: number,
  latitude: number
): boolean {
  return (
    longitude >= bbox[0] &&
    longitude <= bbox[2] &&
    latitude >= bbox[1] &&
    latitude <= bbox[3]
  );
}

function toDirectoryEntry(
  properties: RegionBoundaryProperties
): RegionDirectoryEntry {
  return {
    regionCode: properties.regionCode,
    countyCode: properties.countyCode,
    countyName: properties.countyName,
    townName: properties.townName,
    displayName: properties.displayName
  };
}
