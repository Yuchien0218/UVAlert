import type {
  CommandResult,
  EndSessionCommandV1,
  FiveDayUvForecast,
  ProductLabelSnapshotV1,
  RegionPreferenceV1,
  ReducerClock,
  SessionProjection,
  SetupDraftV1,
  StartSessionCommandV1
} from "@sunshield/contracts";

export interface SessionRepositoryPort {
  open(): Promise<void>;
  getCurrentSession(localVisitorId: string): Promise<SessionProjection | null>;
}

export interface LocalIdentityPort {
  getOrCreateLocalVisitorId(): Promise<string>;
}

export interface DeviceIdentityPort {
  getOrCreateDeviceLocalId(): Promise<string>;
}

export interface SessionCommandRepositoryPort {
  startSession(
    command: StartSessionCommandV1,
    clock: ReducerClock
  ): Promise<CommandResult<SessionProjection>>;
}

export interface SessionEndRepositoryPort {
  endSession(
    command: EndSessionCommandV1,
    clock: ReducerClock
  ): Promise<CommandResult<SessionProjection>>;
}

export interface SetupDraftRepositoryPort {
  getActiveDraft(
    ownerKey: string,
    trustedNow: string
  ): Promise<SetupDraftV1 | null>;
  saveDraft(draft: SetupDraftV1): Promise<void>;
  deleteDraft(draftId: string): Promise<void>;
}

export interface ProductSettingsPort {
  getCurrentProductSnapshot(): Promise<ProductLabelSnapshotV1 | null>;
  saveCurrentProductSnapshot(
    snapshot: ProductLabelSnapshotV1
  ): Promise<void>;
  clearCurrentProductSnapshot(): Promise<void>;
}

export interface RegionPreferencePort {
  getPreference(): Promise<RegionPreferenceV1 | null>;
  savePreference(preference: RegionPreferenceV1): Promise<void>;
}

export interface DevicePosition {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

export type DeviceGeolocationErrorCode =
  | "permission_denied"
  | "position_unavailable"
  | "timeout"
  | "unsupported";

export class DeviceGeolocationError extends Error {
  readonly code: DeviceGeolocationErrorCode;

  constructor(code: DeviceGeolocationErrorCode) {
    super(code);
    this.name = "DeviceGeolocationError";
    this.code = code;
  }
}

export interface DeviceGeolocationPort {
  requestCurrentPosition(): Promise<DevicePosition>;
}

export interface UvForecastApiPort {
  getFiveDayForecast(
    regionCode: string
  ): Promise<FiveDayUvForecast>;
}

export interface UvForecastSnapshotPort {
  getLatestForecast(
    regionCode: string
  ): Promise<FiveDayUvForecast | null>;
  saveForecast(forecast: FiveDayUvForecast): Promise<void>;
}

export type ConnectivityStatus = "online" | "offline";

export interface ConnectivityPort {
  getCurrentStatus(): ConnectivityStatus;
  subscribe(
    listener: (status: ConnectivityStatus) => void
  ): () => void;
}

export interface LifecyclePort {
  subscribeForeground(listener: () => void): () => void;
}

export type InvalidationMessage = {
  kind: "data-committed" | "data-cleared";
  sourceContextId: string;
  sessionId?: string;
  revision?: number;
};

export interface CrossContextPort {
  subscribe(
    listener: (message: InvalidationMessage) => void
  ): () => void;
}
