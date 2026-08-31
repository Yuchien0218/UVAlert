import type {
  CommandResult,
  ApplicationEventV1,
  EndSessionCommandV1,
  FiveDayUvForecast,
  NationwideUvForecast,
  ProductLabelSnapshotV1,
  GearCategory,
  ProductCatalogRecordV1,
  RegionPreferenceV1,
  ReapplyCommandV1,
  ReportContextEventCommandV1,
  CorrectContextEventCommandV1,
  CorrectApplicationGroupCommandV1,
  ContextEventV1,
  ApplicationConfirmationGroupV1,
  ReducerClock,
  SessionEventStreamV1,
  SessionProjection,
  SetupDraftV1,
  StartSessionCommandV1,
  SyncRecordEnvelopeV1,
  SyncRecordKind,
  SyncTombstoneV1
} from "@sunshield/contracts";

export * from "./cloud";

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
  saveCurrentProductSnapshot(snapshot: ProductLabelSnapshotV1): Promise<void>;
  clearCurrentProductSnapshot(): Promise<void>;
}

export interface ReapplicationContext {
  session: SessionProjection;
  currentApplications: ApplicationEventV1[];
  products: ProductCatalogRecordV1[];
}

export interface ReapplicationRepositoryPort {
  getReapplicationContext(
    localVisitorId: string
  ): Promise<ReapplicationContext | null>;
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

/** S-10 更正表單需要的 target 描述。 */
export type CorrectionContext =
  | {
      kind: "context_event";
      session: SessionProjection;
      /**
       * `context_changed` 不在 S-10 更正範圍（它沒有受影響部位可調整），
       * 讀取側會直接回 null，所以這裡只會是帶部位的那三種。
       */
      event: CorrectableContextEvent;
      /** false 代表這筆已經被更正過，不得再建立第二個 successor。 */
      isLeaf: boolean;
      /** 更正入水時部位集合必須沿用，否則配對的離水會變孤兒。 */
      hasPairedWaterEnd: boolean;
    }
  | {
      kind: "application_group";
      session: SessionProjection;
      group: ApplicationConfirmationGroupV1;
      applications: ApplicationEventV1[];
      isLeaf: boolean;
      hasPairedWaterEnd: boolean;
    };

export type CorrectableContextEvent = Extract<
  ContextEventV1,
  { zoneInstanceIds: string[] }
>;

export interface EventCorrectionRepositoryPort {
  getCorrectionContext(
    localVisitorId: string,
    eventId: string
  ): Promise<CorrectionContext | null>;
  correctContextEvent(
    command: CorrectContextEventCommandV1,
    clock: ReducerClock
  ): Promise<CommandResult<SessionProjection>>;
  correctApplicationGroup(
    command: CorrectApplicationGroupCommandV1,
    clock: ReducerClock
  ): Promise<CommandResult<SessionProjection>>;
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
  /** 2026-08-30：純紀錄，不進 reducer。 */
  priceTwd?: number | null;
  /** 2026-08-30：純紀錄，不進 reducer。 */
  usageRating?: "good" | "ok" | "bad" | null;
  now: string;
}

/** S-19 本機資料管理的清單摘要。 */
export interface LocalDataSummary {
  productCount: number;
  hasActiveSession: boolean;
  endedSessionCount: number;
  hasSetupDraft: boolean;
  lastWeatherSnapshotAt: string | null;
  lastClockCalibrationAt: string | null;
}

export interface LocalDataPort {
  getSummary(): Promise<LocalDataSummary>;
  /**
   * 匯出本機資料。
   *
   * 排除金鑰、精確座標與裝置識別碼（S-19 2026-08-07 裁決）。
   * 匯出只產生資料，不負責下載——上傳與否由呼叫端決定，
   * 而 P0 的唯一去處是使用者自己的檔案系統。
   */
  exportData(exportedAt: string): Promise<unknown>;
  clearSetupDrafts(): Promise<void>;
  clearProductsAndHistory(): Promise<void>;
  clearAll(): Promise<void>;
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

export interface LocalSyncMetadata {
  recordKind: SyncRecordKind;
  recordId: string;
  localPayloadFingerprint: string | null;
  localRevision: number;
  cloudRevision: number | null;
  lastSyncedAt: string | null;
  tombstone: boolean;
  deletedAt: string | null;
}

export interface LocalSyncSnapshot {
  collectedAt: string;
  records: SyncRecordEnvelopeV1[];
  tombstones: SyncTombstoneV1[];
  metadata: LocalSyncMetadata[];
}

export interface LocalSyncPort {
  collectSyncSnapshot(): Promise<LocalSyncSnapshot>;
  getActiveSession(): Promise<SyncRecordEnvelopeV1 | null>;
  applySelectedRecords(records: SyncRecordEnvelopeV1[]): Promise<void>;
  applyTombstones(tombstones: SyncTombstoneV1[]): Promise<void>;
}

export interface DevicePosition {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

export type DeviceGeolocationErrorCode =
  "permission_denied" | "position_unavailable" | "timeout" | "unsupported";

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
  getFiveDayForecast(regionCode: string): Promise<FiveDayUvForecast>;
  /**
   * 全臺各縣市今日的 UV，供分布地圖使用。
   *
   * 與五日預報共用同一次上游抓取（見 contracts 的 NationwideUvForecast），
   * 所以呼叫它不會增加 CWA 的用量。
   */
  getNationwideForecast(): Promise<NationwideUvForecast>;
}

export interface UvForecastSnapshotPort {
  getLatestForecast(regionCode: string): Promise<FiveDayUvForecast | null>;
  saveForecast(forecast: FiveDayUvForecast): Promise<void>;
}

export type ConnectivityStatus = "online" | "offline";

export interface ConnectivityPort {
  getCurrentStatus(): ConnectivityStatus;
  subscribe(listener: (status: ConnectivityStatus) => void): () => void;
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
  subscribe(listener: (message: InvalidationMessage) => void): () => void;
}

/**
 * 通知權限狀態。
 *
 * `unsupported` 與 `denied` 不同：前者是平台沒有 Notification／Service Worker
 * （例如非安全來源、或不支援的瀏覽器），使用者無從授權；後者是使用者拒絕過，
 * 多數瀏覽器不允許程式再次詢問。兩者的畫面文案不一樣，所以不能合併。
 */
export type NotificationPermissionState =
  "granted" | "denied" | "default" | "unsupported";

export interface ScheduledNotification {
  /**
   * 排程識別碼。用同一個 id 重複排程會取代既有的那筆，
   * 因此部位到期時間被重算時不需要先取消再排。
   */
  id: string;
  /** 觸發的絕對時間（ISO 8601），與 `zoneDueAt` 同語意。 */
  dueAt: string;
  title: string;
  body: string;
  /**
   * 顯示後多久再提醒一次，`null` 表示只提醒一次。
   *
   * 重複跟單次提醒受同一個平台限制：只在分頁存活時有效，見
   * `canDeliverInBackground()`。同一個 id 的下一次 `schedule()`
   * （例如到期時間被重算）會取代整個重複鏈，不會兩者並存。
   */
  repeatMinutes: number | null;
}

/**
 * 本機通知端口。
 *
 * **這個端口只能在分頁存活時送達。** web 平台沒有可靠的背景排程機制——
 * Notification Triggers（`TimestampTrigger`）已被 Chrome 放棄且從未進 stable，
 * Safari 只支援 push 不支援本機通知。瀏覽器關閉或分頁被回收後，
 * 排程一律不會觸發。完整的落差分析與取捨見
 * `docs/decisions/2026-08-23-notification-decision.md`。
 *
 * 因此 `canDeliverInBackground()` 存在的目的，是讓畫面能誠實告訴使用者
 * 「你仍然需要自己回來查看」，而不是讓它假裝提醒一定會到。
 */
export interface NotificationPort {
  /** 平台是否具備 Notification 與 Service Worker。 */
  isSupported(): boolean;
  /**
   * 預先註冊 service worker。
   *
   * 不需要通知權限，也不排任何東西——只是讓 worker 在真正要顯示通知之前
   * 就已就緒。等到期當下才註冊會多一次網路往返，失敗時通知會靜默遺失。
   */
  ensureReady(): Promise<void>;
  getPermission(): NotificationPermissionState;
  /** 已是 `granted`／`denied`／`unsupported` 時直接回傳現值，不重複詢問。 */
  requestPermission(): Promise<NotificationPermissionState>;
  /** `dueAt` 已過期則立即觸發；權限不足時靜默略過，不丟例外。 */
  schedule(notification: ScheduledNotification): Promise<void>;
  cancel(id: string): Promise<void>;
  cancelAll(): Promise<void>;
  /**
   * 排程能否在分頁關閉後送達。
   *
   * 目前所有 web 平台都是 `false`。保留這個方法是為了在未來接上
   * Web Push 之後，畫面文案能自動跟著改，而不必回頭改判斷邏輯。
   */
  canDeliverInBackground(): boolean;
  /**
   * 立即顯示一則測試通知，讓使用者確認這台裝置目前收得到。
   * 權限不足或顯示失敗回傳 `false`，不丟例外。
   */
  sendTest(): Promise<boolean>;
}

/**
 * 使用者的通知偏好（目前只有再次提醒頻率）。
 *
 * 本機優先：不需要雲端同步也能讀寫，跟 `LocalSyncPort` 共用同一份
 * `UserPreferencesV1` 儲存位置，避免出現兩份互相漂移的偏好資料。
 */
export interface UserPreferencesPort {
  getReminderFrequencyMinutes(): Promise<number | null>;
  setReminderFrequencyMinutes(minutes: number | null): Promise<void>;
}
