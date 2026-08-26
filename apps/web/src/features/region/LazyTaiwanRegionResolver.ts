import {
  TaiwanRegionResolver,
  type RegionBoundaryCollection,
  type RegionResolution
} from "./TaiwanRegionResolver";

type BoundaryLoader = () => Promise<RegionBoundaryCollection>;

export class LazyTaiwanRegionResolver {
  readonly #loadBoundaries: BoundaryLoader;
  #resolverPromise: Promise<TaiwanRegionResolver> | null = null;

  constructor(loadBoundaries: BoundaryLoader = loadGeneratedBoundaries) {
    this.#loadBoundaries = loadBoundaries;
  }

  async resolve(
    longitude: number,
    latitude: number
  ): Promise<RegionResolution> {
    const resolver = await this.#getResolver();
    return resolver.resolve(longitude, latitude);
  }

  #getResolver(): Promise<TaiwanRegionResolver> {
    if (this.#resolverPromise === null) {
      this.#resolverPromise = this.#loadBoundaries()
        .then((boundaries) => new TaiwanRegionResolver(boundaries))
        .catch((error: unknown) => {
          this.#resolverPromise = null;
          throw error;
        });
    }
    return this.#resolverPromise;
  }
}

async function loadGeneratedBoundaries(): Promise<RegionBoundaryCollection> {
  const module =
    await import("../../generated/region-boundaries.generated.json");
  return module.default as unknown as RegionBoundaryCollection;
}
