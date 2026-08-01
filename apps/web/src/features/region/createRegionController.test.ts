import {
  DeviceGeolocationError,
  type DeviceGeolocationPort,
  type RegionPreferencePort
} from "@sunshield/platform";
import { describe, expect, it, vi } from "vitest";
import { createRegionController } from "./createRegionController";
import type {
  RegionDirectoryEntry,
  RegionResolution
} from "./TaiwanRegionResolver";

const taipei: RegionDirectoryEntry = {
  regionCode: "63000010",
  countyCode: "63000",
  countyName: "臺北市",
  townName: "松山區",
  displayName: "臺北市松山區"
};

function makeDependencies(options: {
  resolution?: RegionResolution;
  geolocationError?: DeviceGeolocationError;
  saveFailure?: boolean;
} = {}) {
  const geolocation = {
    requestCurrentPosition: vi.fn(async () => {
      if (options.geolocationError !== undefined) {
        throw options.geolocationError;
      }
      return {
        latitude: 25.05,
        longitude: 121.55,
        accuracyMeters: 23.6
      };
    })
  } satisfies DeviceGeolocationPort;
  const resolver = {
    resolve: vi.fn(
      () =>
        options.resolution ?? {
          kind: "resolved" as const,
          region: taipei
        }
    )
  };
  const preferenceRepository = {
    getPreference: vi.fn(async () => null),
    savePreference: vi.fn(async () => {
      if (options.saveFailure) throw new Error("storage failed");
    })
  } satisfies RegionPreferencePort;
  const refreshUv = vi.fn(async () => undefined);

  return {
    geolocation,
    resolver,
    preferenceRepository,
    refreshUv
  };
}

describe("createRegionController", () => {
  it("loads the preference without requesting device location", async () => {
    const dependencies = makeDependencies();
    const controller = createRegionController({
      ...dependencies,
      directory: [taipei],
      boundaryDataVersion: "2025-03-18"
    });

    await controller.ensureLoaded();

    expect(controller.phase.value).toBe("idle");
    expect(dependencies.geolocation.requestCurrentPosition).not.toHaveBeenCalled();
  });

  it("keeps coordinates function-local and exposes only a region candidate", async () => {
    const dependencies = makeDependencies();
    const controller = createRegionController({
      ...dependencies,
      directory: [taipei],
      boundaryDataVersion: "2025-03-18"
    });

    await controller.useCurrentPosition();

    expect(dependencies.resolver.resolve).toHaveBeenCalledWith(
      121.55,
      25.05
    );
    expect(controller.phase.value).toBe("confirming");
    expect(controller.candidate.value).toEqual({
      ...taipei,
      boundaryDataVersion: "2025-03-18",
      selectionMethod: "device_location"
    });
    expect(controller.approximateAccuracyMeters.value).toBe(24);
    expect(JSON.stringify(controller)).not.toMatch(
      /121\.55|25\.05|latitude|longitude/
    );
  });

  it.each([
    "permission_denied",
    "position_unavailable",
    "timeout",
    "unsupported"
  ] as const)("maps %s to a recoverable error", async (code) => {
    const dependencies = makeDependencies({
      geolocationError: new DeviceGeolocationError(code)
    });
    const controller = createRegionController({
      ...dependencies,
      directory: [taipei],
      boundaryDataVersion: "2025-03-18"
    });

    await controller.useCurrentPosition();

    expect(controller.phase.value).toBe("error");
    expect(controller.error.value).toBe(code);
  });

  it("does not guess when the point is outside supported boundaries", async () => {
    const dependencies = makeDependencies({
      resolution: { kind: "outside_supported_area" }
    });
    const controller = createRegionController({
      ...dependencies,
      directory: [taipei],
      boundaryDataVersion: "2025-03-18"
    });

    await controller.useCurrentPosition();

    expect(controller.error.value).toBe("outside_supported_area");
    expect(controller.candidate.value).toBeNull();
  });

  it("confirms a resolved candidate before saving and refreshing UV", async () => {
    const dependencies = makeDependencies();
    const controller = createRegionController({
      ...dependencies,
      directory: [taipei],
      boundaryDataVersion: "2025-03-18"
    });
    await controller.useCurrentPosition();

    await expect(controller.confirmCandidate()).resolves.toBe(true);

    expect(
      dependencies.preferenceRepository.savePreference
    ).toHaveBeenCalledWith({
      schemaVersion: "region-preference-v1",
      mode: "selected",
      selection: expect.objectContaining({
        regionCode: "63000010",
        selectionMethod: "device_location"
      })
    });
    expect(dependencies.refreshUv).toHaveBeenCalledOnce();
  });

  it("saves a manual district without calling geolocation", async () => {
    const dependencies = makeDependencies();
    const controller = createRegionController({
      ...dependencies,
      directory: [taipei],
      boundaryDataVersion: "2025-03-18"
    });

    await expect(
      controller.saveManualRegion("63000010")
    ).resolves.toBe(true);

    expect(dependencies.geolocation.requestCurrentPosition).not.toHaveBeenCalled();
    expect(
      dependencies.preferenceRepository.savePreference
    ).toHaveBeenCalledWith({
      schemaVersion: "region-preference-v1",
      mode: "selected",
      selection: expect.objectContaining({
        selectionMethod: "manual"
      })
    });
  });

  it("persists an explicit skipped preference", async () => {
    const dependencies = makeDependencies();
    const controller = createRegionController({
      ...dependencies,
      directory: [taipei],
      boundaryDataVersion: "2025-03-18",
      now: () => new Date("2026-08-01T05:00:00.000Z")
    });

    await expect(controller.skipRegion()).resolves.toBe(true);

    expect(
      dependencies.preferenceRepository.savePreference
    ).toHaveBeenCalledWith({
      schemaVersion: "region-preference-v1",
      mode: "skipped",
      skippedAt: "2026-08-01T05:00:00.000Z"
    });
  });

  it("keeps the previous preference when persistence fails", async () => {
    const dependencies = makeDependencies({ saveFailure: true });
    const controller = createRegionController({
      ...dependencies,
      directory: [taipei],
      boundaryDataVersion: "2025-03-18"
    });
    await controller.ensureLoaded();

    await expect(
      controller.saveManualRegion("63000010")
    ).resolves.toBe(false);

    expect(controller.preference.value).toBeNull();
    expect(controller.error.value).toBe("storage_error");
    expect(dependencies.refreshUv).not.toHaveBeenCalled();
  });
});
