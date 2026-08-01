import {
  LocalRegionPreferenceRepository,
  SunshieldDatabase
} from "@sunshield/persistence-web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRegionController } from "./createRegionController";

let database: SunshieldDatabase | null = null;

afterEach(async () => {
  if (database !== null) {
    const current = database;
    database = null;
    current.close();
    await current.delete();
  }
});

describe("region preference privacy integration", () => {
  it("persists only administrative identity and refreshes UV by preference", async () => {
    database = new SunshieldDatabase(
      `region-privacy-${crypto.randomUUID()}`
    );
    await database.open();
    const repository = new LocalRegionPreferenceRepository(database);
    const refreshUv = vi.fn(async () => undefined);
    const controller = createRegionController({
      geolocation: {
        requestCurrentPosition: async () => ({
          latitude: 25.0375,
          longitude: 121.5645,
          accuracyMeters: 12
        })
      },
      resolver: {
        resolve: () => ({
          kind: "resolved",
          region: {
            regionCode: "63000020",
            countyCode: "63000",
            countyName: "臺北市",
            townName: "信義區",
            displayName: "臺北市信義區"
          }
        })
      },
      preferenceRepository: repository,
      directory: [
        {
          regionCode: "63000020",
          countyCode: "63000",
          countyName: "臺北市",
          townName: "信義區",
          displayName: "臺北市信義區"
        }
      ],
      boundaryDataVersion: "2025-03-18",
      refreshUv,
      now: () => new Date("2026-08-01T06:00:00.000Z")
    });

    await controller.useCurrentPosition();
    await controller.confirmCandidate();

    const stored = await database.AppMetadata.get(
      "uvRegionPreferenceV1"
    );
    expect(stored).toBeDefined();
    expect(stored?.value).toContain("63000020");
    expect(stored?.value).not.toMatch(
      /121\.5645|25\.0375|latitude|longitude|coords/
    );
    expect(refreshUv).toHaveBeenCalledOnce();

    await controller.skipRegion();

    expect(await repository.getPreference()).toEqual({
      schemaVersion: "region-preference-v1",
      mode: "skipped",
      skippedAt: "2026-08-01T06:00:00.000Z"
    });
  });
});
