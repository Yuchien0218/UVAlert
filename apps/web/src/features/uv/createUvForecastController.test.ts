import type {
  FiveDayUvForecast,
  RegionPreferenceV1,
  RegionSelection
} from "@sunshield/contracts";
import { REGION_PREFERENCE_SCHEMA_VERSION } from "@sunshield/contracts";
import type {
  LifecyclePort,
  RegionPreferencePort,
  UvForecastApiPort,
  UvForecastSnapshotPort
} from "@sunshield/platform";
import { makeFiveDayUvForecast } from "@sunshield/test-fixtures";
import { shallowRef } from "vue";
import { describe, expect, it, vi } from "vitest";
import {
  EVENING_UV_DISMISSAL_STORAGE_KEY,
  createUvForecastController
} from "./createUvForecastController";

class MemoryStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

class FakeLifecycle implements LifecyclePort {
  listener: (() => void) | null = null;

  subscribeForeground(listener: () => void): () => void {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }
}

const silentScheduler = {
  start: () => "timer",
  stop: () => undefined
};

function makeDependencies(options: {
  region?: RegionSelection | null;
  preference?: RegionPreferenceV1 | null;
  apiForecast?: FiveDayUvForecast;
  cachedForecast?: FiveDayUvForecast | null;
  apiFailure?: boolean;
}) {
  const api = {
    getFiveDayForecast: vi.fn(async () => {
      if (options.apiFailure) throw new Error("offline");
      return options.apiForecast ?? makeFiveDayUvForecast();
    })
  } satisfies UvForecastApiPort;
  const snapshots = {
    getLatestForecast: vi.fn(async () =>
      options.cachedForecast === undefined
        ? null
        : options.cachedForecast
    ),
    saveForecast: vi.fn(async () => undefined)
  } satisfies UvForecastSnapshotPort;
  const regionPreference = {
    getPreference: vi.fn(async () => {
      if (options.preference !== undefined) {
        return options.preference;
      }
      const region =
        options.region === undefined
          ? makeRegionSelection()
          : options.region;
      return region === null
        ? null
        : {
            schemaVersion: REGION_PREFERENCE_SCHEMA_VERSION,
            mode: "selected" as const,
            selection: region
          };
    }),
    savePreference: vi.fn(async () => undefined)
  } satisfies RegionPreferencePort;

  return {
    api,
    snapshots,
    regionPreference
  };
}

describe("createUvForecastController", () => {
  it("沒有地區時不呼叫 API，也不顯示晚間提示", async () => {
    const dependencies = makeDependencies({ region: null });
    const controller = createUvForecastController({
      ...dependencies,
      connectivity: shallowRef("online"),
      lifecycle: new FakeLifecycle(),
      now: () => new Date(2026, 6, 30, 20, 0),
      storage: new MemoryStorage(),
      scheduler: silentScheduler
    });

    await controller.ensureLoaded();

    expect(controller.phase.value).toBe("no_region");
    expect(controller.forecast.value).toBeNull();
    expect(controller.showEveningPrompt.value).toBe(false);
    expect(dependencies.api.getFiveDayForecast).not.toHaveBeenCalled();
    controller.dispose();
  });

  it("明確略過地區時不呼叫 API", async () => {
    const dependencies = makeDependencies({
      preference: {
        schemaVersion: REGION_PREFERENCE_SCHEMA_VERSION,
        mode: "skipped",
        skippedAt: "2026-08-01T00:00:00.000Z"
      }
    });
    const controller = createUvForecastController({
      ...dependencies,
      connectivity: shallowRef("online"),
      lifecycle: new FakeLifecycle(),
      now: () => new Date(2026, 7, 1, 20, 0),
      storage: new MemoryStorage(),
      scheduler: silentScheduler
    });

    await controller.ensureLoaded();

    expect(controller.phase.value).toBe("no_region");
    expect(controller.region.value).toBeNull();
    expect(dependencies.api.getFiveDayForecast).not.toHaveBeenCalled();
    controller.dispose();
  });

  it("refresh 會重新讀取已變更的地區偏好", async () => {
    const dependencies = makeDependencies({});
    dependencies.regionPreference.getPreference
      .mockResolvedValueOnce({
        schemaVersion: REGION_PREFERENCE_SCHEMA_VERSION,
        mode: "selected",
        selection: makeRegionSelection()
      })
      .mockResolvedValueOnce({
        schemaVersion: REGION_PREFERENCE_SCHEMA_VERSION,
        mode: "skipped",
        skippedAt: "2026-08-01T00:00:00.000Z"
      });
    const controller = createUvForecastController({
      ...dependencies,
      connectivity: shallowRef("online"),
      lifecycle: new FakeLifecycle(),
      now: () => new Date(2026, 6, 30, 20, 0),
      storage: new MemoryStorage(),
      scheduler: silentScheduler
    });

    await controller.ensureLoaded();
    await controller.refresh();

    expect(controller.phase.value).toBe("no_region");
    expect(controller.region.value).toBeNull();
    controller.dispose();
  });

  it("晚間取得五日預報後顯示一次，關閉後跨午夜不再出現", async () => {
    const storage = new MemoryStorage();
    const dependencies = makeDependencies({});
    const controller = createUvForecastController({
      ...dependencies,
      connectivity: shallowRef("online"),
      lifecycle: new FakeLifecycle(),
      now: () => new Date(2026, 6, 30, 20, 0),
      storage,
      scheduler: silentScheduler
    });

    await controller.ensureLoaded();

    expect(controller.phase.value).toBe("ready");
    expect(controller.forecast.value?.days).toHaveLength(5);
    expect(controller.showEveningPrompt.value).toBe(true);

    controller.dismissEveningPrompt();

    expect(controller.showEveningPrompt.value).toBe(false);
    expect(
      storage.getItem(EVENING_UV_DISMISSAL_STORAGE_KEY)
    ).toBe("2026-07-30");
    controller.dispose();
  });

  it("網路失敗時只使用仍有效的 IndexedDB 快照", async () => {
    const cachedForecast = makeFiveDayUvForecast();
    const dependencies = makeDependencies({
      apiFailure: true,
      cachedForecast
    });
    const controller = createUvForecastController({
      ...dependencies,
      connectivity: shallowRef("online"),
      lifecycle: new FakeLifecycle(),
      now: () => new Date("2026-07-30T12:00:00.000Z"),
      storage: new MemoryStorage(),
      scheduler: silentScheduler
    });

    await controller.ensureLoaded();

    expect(controller.phase.value).toBe("cached");
    expect(controller.error.value).toBe("network_error");
    expect(controller.forecast.value?.region.displayName).toBe(
      "臺北市中正區"
    );
    controller.dispose();
  });
});

function makeRegionSelection(): RegionSelection {
  return {
    regionCode: "63000050",
    displayName: "臺北市中正區",
    countyCode: "63000",
    countyName: "臺北市",
    townName: "中正區",
    boundaryDataVersion: "2025-03-18",
    selectionMethod: "manual"
  };
}
