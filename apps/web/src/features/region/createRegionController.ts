import {
  REGION_PREFERENCE_SCHEMA_VERSION,
  RegionPreferenceV1Schema,
  RegionSelectionSchema,
  type RegionPreferenceV1,
  type RegionSelection
} from "@sunshield/contracts";
import {
  DeviceGeolocationError,
  type DeviceGeolocationPort,
  type RegionPreferencePort
} from "@sunshield/platform";
import { shallowReadonly, shallowRef, type ShallowRef } from "vue";
import type {
  RegionDirectoryEntry,
  RegionResolution
} from "./TaiwanRegionResolver";

export type RegionPhase =
  | "idle"
  | "loading"
  | "locating"
  | "confirming"
  | "saving"
  | "success"
  | "error";

export type RegionError =
  | "permission_denied"
  | "position_unavailable"
  | "timeout"
  | "unsupported"
  | "outside_supported_area"
  | "boundary_ambiguous"
  | "invalid_region"
  | "storage_error"
  | null;

interface RegionResolverPort {
  resolve(
    longitude: number,
    latitude: number
  ): RegionResolution | Promise<RegionResolution>;
}

export interface RegionControllerDependencies {
  geolocation: DeviceGeolocationPort;
  resolver: RegionResolverPort;
  preferenceRepository: RegionPreferencePort;
  directory: readonly RegionDirectoryEntry[];
  boundaryDataVersion: string;
  refreshUv(): Promise<void>;
  now?: () => Date;
}

export interface RegionController {
  readonly phase: Readonly<ShallowRef<RegionPhase>>;
  readonly preference: Readonly<ShallowRef<RegionPreferenceV1 | null>>;
  readonly candidate: Readonly<ShallowRef<RegionSelection | null>>;
  readonly approximateAccuracyMeters: Readonly<ShallowRef<number | null>>;
  readonly directory: readonly RegionDirectoryEntry[];
  readonly error: Readonly<ShallowRef<RegionError>>;
  ensureLoaded(): Promise<void>;
  useCurrentPosition(): Promise<void>;
  confirmCandidate(): Promise<boolean>;
  saveManualRegion(regionCode: string): Promise<boolean>;
  skipRegion(): Promise<boolean>;
  clearError(): void;
  dispose(): void;
}

export function createRegionController(
  dependencies: RegionControllerDependencies
): RegionController {
  const getNow = dependencies.now ?? (() => new Date());
  const phaseState = shallowRef<RegionPhase>("idle");
  const preferenceState = shallowRef<RegionPreferenceV1 | null>(null);
  const candidateState = shallowRef<RegionSelection | null>(null);
  const accuracyState = shallowRef<number | null>(null);
  const errorState = shallowRef<RegionError>(null);
  const directoryByCode = new Map(
    dependencies.directory.map((entry) => [entry.regionCode, entry])
  );

  let loaded = false;
  let loadPromise: Promise<void> | null = null;
  let disposed = false;

  async function performLoad(): Promise<void> {
    phaseState.value = "loading";
    errorState.value = null;
    try {
      preferenceState.value =
        await dependencies.preferenceRepository.getPreference();
      loaded = true;
      phaseState.value = "idle";
    } catch {
      preferenceState.value = null;
      errorState.value = "storage_error";
      phaseState.value = "error";
    }
  }

  function ensureLoaded(): Promise<void> {
    if (disposed || loaded) return Promise.resolve();
    loadPromise ??= performLoad().finally(() => {
      loadPromise = null;
    });
    return loadPromise;
  }

  async function useCurrentPosition(): Promise<void> {
    if (
      disposed ||
      phaseState.value === "locating" ||
      phaseState.value === "saving"
    ) {
      return;
    }

    phaseState.value = "locating";
    errorState.value = null;
    candidateState.value = null;
    accuracyState.value = null;

    try {
      const position = await dependencies.geolocation.requestCurrentPosition();
      const resolution = await dependencies.resolver.resolve(
        position.longitude,
        position.latitude
      );

      if (resolution.kind !== "resolved") {
        errorState.value = resolution.kind;
        phaseState.value = "error";
        return;
      }

      candidateState.value = createSelection(
        resolution.region,
        "device_location"
      );
      accuracyState.value = Math.max(0, Math.round(position.accuracyMeters));
      phaseState.value = "confirming";
    } catch (error) {
      errorState.value =
        error instanceof DeviceGeolocationError
          ? error.code
          : "position_unavailable";
      phaseState.value = "error";
    }
  }

  async function confirmCandidate(): Promise<boolean> {
    const candidate = candidateState.value;
    if (candidate === null) return false;
    return saveSelectedPreference(candidate);
  }

  async function saveManualRegion(regionCode: string): Promise<boolean> {
    const entry = directoryByCode.get(regionCode);
    if (entry === undefined) {
      errorState.value = "invalid_region";
      phaseState.value = "error";
      return false;
    }
    return saveSelectedPreference(createSelection(entry, "manual"));
  }

  async function saveSelectedPreference(
    selection: RegionSelection
  ): Promise<boolean> {
    const preference = RegionPreferenceV1Schema.parse({
      schemaVersion: REGION_PREFERENCE_SCHEMA_VERSION,
      mode: "selected",
      selection
    });
    return persistPreference(preference);
  }

  async function skipRegion(): Promise<boolean> {
    const preference = RegionPreferenceV1Schema.parse({
      schemaVersion: REGION_PREFERENCE_SCHEMA_VERSION,
      mode: "skipped",
      skippedAt: getNow().toISOString()
    });
    return persistPreference(preference);
  }

  async function persistPreference(
    preference: RegionPreferenceV1
  ): Promise<boolean> {
    if (disposed || phaseState.value === "saving") return false;
    phaseState.value = "saving";
    errorState.value = null;

    try {
      await dependencies.preferenceRepository.savePreference(preference);
      preferenceState.value = preference;
      candidateState.value = null;
      accuracyState.value = null;
      await dependencies.refreshUv();
      phaseState.value = "success";
      loaded = true;
      return true;
    } catch {
      errorState.value = "storage_error";
      phaseState.value = "error";
      return false;
    }
  }

  function createSelection(
    entry: RegionDirectoryEntry,
    selectionMethod: RegionSelection["selectionMethod"]
  ): RegionSelection {
    return RegionSelectionSchema.parse({
      ...entry,
      boundaryDataVersion: dependencies.boundaryDataVersion,
      selectionMethod
    });
  }

  function clearError(): void {
    errorState.value = null;
    if (phaseState.value === "error") phaseState.value = "idle";
  }

  function dispose(): void {
    disposed = true;
  }

  return {
    phase: shallowReadonly(phaseState),
    preference: shallowReadonly(preferenceState),
    candidate: shallowReadonly(candidateState),
    approximateAccuracyMeters: shallowReadonly(accuracyState),
    directory: dependencies.directory,
    error: shallowReadonly(errorState),
    ensureLoaded,
    useCurrentPosition,
    confirmCandidate,
    saveManualRegion,
    skipRegion,
    clearError,
    dispose
  };
}
