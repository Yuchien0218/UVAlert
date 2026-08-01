import type {
  FiveDayUvForecast,
  RegionSelection
} from "@sunshield/contracts";
import type {
  ConnectivityStatus,
  LifecyclePort,
  RegionPreferencePort,
  UvForecastApiPort,
  UvForecastSnapshotPort
} from "@sunshield/platform";
import {
  computed,
  shallowReadonly,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
  type ShallowRef
} from "vue";
import {
  getEveningCycleKey,
  isFixedEvening,
  selectUpcomingForecast
} from "./uvForecastRules";

export const EVENING_UV_DISMISSAL_STORAGE_KEY =
  "sunshield.evening-uv-dismissed-cycle";

export type UvForecastPhase =
  | "idle"
  | "loading"
  | "no_region"
  | "ready"
  | "cached"
  | "unavailable";

export type UvForecastError =
  | "offline"
  | "network_error"
  | "storage_error"
  | "no_usable_data"
  | null;

interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface IntervalScheduler {
  start(callback: () => void, intervalMs: number): unknown;
  stop(handle: unknown): void;
}

export interface UvForecastController {
  readonly phase: Readonly<ShallowRef<UvForecastPhase>>;
  readonly error: Readonly<ShallowRef<UvForecastError>>;
  readonly region: Readonly<ShallowRef<RegionSelection | null>>;
  readonly forecast: Readonly<
    ShallowRef<FiveDayUvForecast | null>
  >;
  readonly isEvening: ComputedRef<boolean>;
  readonly showEveningPrompt: ComputedRef<boolean>;
  ensureLoaded(): Promise<void>;
  refresh(): Promise<void>;
  dismissEveningPrompt(): void;
  dispose(): void;
}

export interface UvForecastControllerDependencies {
  regionPreference: RegionPreferencePort;
  api: UvForecastApiPort;
  snapshots: UvForecastSnapshotPort;
  connectivity: Readonly<Ref<ConnectivityStatus>>;
  lifecycle: LifecyclePort;
  now?: () => Date;
  storage?: KeyValueStorage;
  scheduler?: IntervalScheduler;
}

export function createUvForecastController(
  dependencies: UvForecastControllerDependencies
): UvForecastController {
  const getNow = dependencies.now ?? (() => new Date());
  const storage = dependencies.storage ?? globalThis.localStorage;
  const scheduler =
    dependencies.scheduler ?? createBrowserIntervalScheduler();

  const phaseState = shallowRef<UvForecastPhase>("idle");
  const errorState = shallowRef<UvForecastError>(null);
  const regionState = shallowRef<RegionSelection | null>(null);
  const forecastState =
    shallowRef<FiveDayUvForecast | null>(null);
  const currentTimeState = shallowRef(getNow());
  const dismissedCycleState = shallowRef(
    readDismissedCycle(storage)
  );
  const isEvening = computed(() =>
    isFixedEvening(currentTimeState.value)
  );
  const currentEveningCycle = computed(() =>
    getEveningCycleKey(currentTimeState.value)
  );
  const showEveningPrompt = computed(() => {
    const cycle = currentEveningCycle.value;
    return (
      cycle !== null &&
      forecastState.value !== null &&
      (phaseState.value === "ready" ||
        phaseState.value === "cached") &&
      dismissedCycleState.value !== cycle
    );
  });

  let loadPromise: Promise<void> | null = null;
  let disposed = false;

  const intervalHandle = scheduler.start(() => {
    currentTimeState.value = getNow();
  }, 60_000);

  const stopConnectivityWatch = watch(
    dependencies.connectivity,
    (status, previousStatus) => {
      if (
        status === "online" &&
        previousStatus === "offline" &&
        phaseState.value !== "idle"
      ) {
        void refresh();
      }
    }
  );

  const stopForeground = dependencies.lifecycle.subscribeForeground(
    () => {
      currentTimeState.value = getNow();
      const forecast = forecastState.value;
      if (
        phaseState.value === "idle" ||
        (forecast !== null &&
          Date.parse(forecast.usableUntil) <=
            currentTimeState.value.getTime())
      ) {
        void refresh();
      }
    }
  );

  async function performLoad(): Promise<void> {
    phaseState.value = "loading";
    errorState.value = null;

    let selectedRegion: RegionSelection | null;
    try {
      const preference =
        await dependencies.regionPreference.getPreference();
      selectedRegion =
        preference?.mode === "selected"
          ? preference.selection
          : null;
    } catch {
      regionState.value = null;
      forecastState.value = null;
      errorState.value = "storage_error";
      phaseState.value = "unavailable";
      return;
    }

    regionState.value = selectedRegion;
    if (selectedRegion === null) {
      forecastState.value = null;
      phaseState.value = "no_region";
      return;
    }

    const now = getNow();
    currentTimeState.value = now;

    let cachedForecast: FiveDayUvForecast | null = null;
    try {
      const stored = await dependencies.snapshots.getLatestForecast(
        selectedRegion.regionCode
      );
      cachedForecast =
        stored === null ? null : selectUpcomingForecast(stored, now);
    } catch {
      cachedForecast = null;
    }

    if (dependencies.connectivity.value === "online") {
      try {
        const response = await dependencies.api.getFiveDayForecast(
          selectedRegion.regionCode
        );
        const upcoming = selectUpcomingForecast(response, now);
        if (upcoming !== null) {
          forecastState.value = upcoming;
          phaseState.value = "ready";
          try {
            await dependencies.snapshots.saveForecast(response);
          } catch {
            // A live forecast remains usable for this page even if the
            // optional offline snapshot cannot be written.
          }
          return;
        }
        errorState.value = "no_usable_data";
      } catch {
        errorState.value = "network_error";
      }
    } else {
      errorState.value = "offline";
    }

    if (cachedForecast !== null) {
      forecastState.value = cachedForecast;
      phaseState.value = "cached";
      return;
    }

    forecastState.value = null;
    if (errorState.value === null) {
      errorState.value = "no_usable_data";
    }
    phaseState.value = "unavailable";
  }

  function runLoad(force: boolean): Promise<void> {
    if (disposed) return Promise.resolve();
    if (!force && phaseState.value !== "idle") {
      return loadPromise ?? Promise.resolve();
    }
    if (loadPromise !== null) return loadPromise;

    loadPromise = performLoad().finally(() => {
      loadPromise = null;
    });
    return loadPromise;
  }

  function ensureLoaded(): Promise<void> {
    return runLoad(false);
  }

  function refresh(): Promise<void> {
    return runLoad(true);
  }

  function dismissEveningPrompt(): void {
    const cycle = currentEveningCycle.value;
    if (cycle === null) return;
    dismissedCycleState.value = cycle;
    try {
      storage.setItem(EVENING_UV_DISMISSAL_STORAGE_KEY, cycle);
    } catch {
      // Dismissal still applies for this page when storage is blocked.
    }
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    scheduler.stop(intervalHandle);
    stopConnectivityWatch();
    stopForeground();
  }

  return {
    phase: shallowReadonly(phaseState),
    error: shallowReadonly(errorState),
    region: shallowReadonly(regionState),
    forecast: shallowReadonly(forecastState),
    isEvening,
    showEveningPrompt,
    ensureLoaded,
    refresh,
    dismissEveningPrompt,
    dispose
  };
}

function readDismissedCycle(storage: KeyValueStorage): string | null {
  try {
    return storage.getItem(EVENING_UV_DISMISSAL_STORAGE_KEY);
  } catch {
    return null;
  }
}

function createBrowserIntervalScheduler(): IntervalScheduler {
  return {
    start(callback, intervalMs): ReturnType<typeof setInterval> {
      return globalThis.setInterval(callback, intervalMs);
    },
    stop(handle): void {
      globalThis.clearInterval(
        handle as ReturnType<typeof setInterval>
      );
    }
  };
}
