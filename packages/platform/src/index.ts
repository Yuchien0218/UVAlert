import type {
  CommandResult,
  ApplicationEventV1,
  EndSessionCommandV1,
  FiveDayUvForecast,
  ProductLabelSnapshotV1,
  GearCategory,
  ProductCatalogRecordV1,
  RegionPreferenceV1,
  ReapplyCommandV1,
  ReportContextEventCommandV1,
  ReducerClock,
  SessionEventStreamV1,
  SessionProjection,
  SetupDraftV1,
  StartSessionCommandV1
} from "@sunshield/contracts";

export interface SessionRepositoryPort {
  open(): Promise<void>;
  getCurrentSession(localVisitorId: string): Promise<SessionProjection | null>;
}

/** S-07 最近事件清單的讀取端口；該清單是 S-10 更正流程的唯一入口。 */
export interface SessionEventStreamRepositoryPort {
  getCurrentSessionEventStream(
    localVisitorId: string
  ): Promise<SessionEventStreamV1 | null>;
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

export interface ReapplicationContext {
  session: SessionProjection;
  currentApplications: ApplicationEventV1[];
  products: ProductCatalogRecordV1[];
}

export interface ReapplicationRepositoryPort {
  getReapplicationContext(localVisitorId: string): Promise<ReapplicationContext | null>;
  reapply(
    command: ReapplyCommandV1,
    clock: ReducerClock
  ): Promise<CommandResult<SessionProjection>>;
}

export interface OpenWaterInterval {
  activityIntervalId: string;
  zoneInstanceIds: string[];
  startConfidence: "confirmed" | "unknown";
  activityStartedAt: string | null;
}

export interface ContextEventContext {
  session: SessionProjection;
  /** null 代表沒有可關閉的水上區間，此時不得顯示離水事件。 */
  openWaterInterval: OpenWaterInterval | null;
}

export interface ContextEventRepositoryPort {
  getContextEventContext(
    localVisitorId: string,
    trustedNow: string
  ): Promise<ContextEventContext | null>;
  reportContextEvent(
    command: ReportContextEventCommandV1,
    clock: ReducerClock
  ): Promise<CommandResult<SessionProjection>>;
}

export interface SaveProductInput {
  productId: string;
  displayName: string;
  gearCategory: GearCategory;
  snapshot: ProductLabelSnapshotV1;
  purchaseMonth?: string | null;
  expiryDate?: string | null;
  note?: string | null;
  now: string;
}

export interface ProductCatalogPort {
  /**
   * `now` 用來把已過到期日的紀錄推導成 expired 並就地修正 snapshot，
   * 因此讀取側也需要時鐘。
   */
  listProducts(now?: string): Promise<ProductCatalogRecordV1[]>;
  getProduct(
    productId: string,
    now?: string
  ): Promise<ProductCatalogRecordV1 | null>;
  saveProduct(input: SaveProductInput): Promise<ProductCatalogRecordV1>;
  stopProduct(productId: string, now: string): Promise<void>;
  /** 移至「過去紀錄」。 */
  archiveProduct(productId: string, now: string): Promise<void>;
  /** 從「過去紀錄」恢復；安全狀態被封鎖的產品不得走這條。 */
  restoreProduct(productId: string, now: string): Promise<void>;
  deleteProduct(productId: string): Promise<void>;
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
