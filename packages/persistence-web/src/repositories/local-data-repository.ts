import type { LocalDataPort, LocalDataSummary } from "@sunshield/platform";
import type { SunshieldDatabase } from "../db/database";

export const LOCAL_DATA_EXPORT_FORMAT_VERSION = "1.0.0" as const;

/**
 * 絕不匯出的 AppMetadata 鍵。
 *
 * 這兩個是裝置識別碼，匯出檔案可能被轉寄或上傳到別處，
 * 帶著它們等於把這台裝置的身分一起送出去。
 */
const EXCLUDED_METADATA_KEYS = new Set(["localVisitorId", "deviceLocalId"]);

/** Session 記錄上的 ownerKey 是 `guest:${localVisitorId}`，同樣要拿掉。 */
function stripOwnerKey<T extends { ownerKey?: unknown }>(
  record: T
): Omit<T, "ownerKey"> {
  const { ownerKey: _ownerKey, ...rest } = record;
  return rest;
}

/**
 * 事件信封上的 `commandId` 與 `idempotencyKey` 是重放保護用的內部識別碼，
 * 對讀備份的人沒有意義。匯出檔裡寫著「不含金鑰與冪等紀錄」，
 * 就必須真的不含。
 */
function stripCommandIdentifiers<
  T extends { commandId?: unknown; idempotencyKey?: unknown }
>(event: T): Omit<T, "commandId" | "idempotencyKey"> {
  const {
    commandId: _commandId,
    idempotencyKey: _idempotencyKey,
    ...rest
  } = event;
  return rest;
}

export class LocalDataRepository implements LocalDataPort {
  readonly #database: SunshieldDatabase;
  readonly #createId: () => string;

  constructor(options: {
    database: SunshieldDatabase;
    createId: () => string;
  }) {
    this.#database = options.database;
    this.#createId = options.createId;
  }

  async getSummary(): Promise<LocalDataSummary> {
    const [
      productCount,
      activeSessionCount,
      endedSessionCount,
      draftCount,
      lastWeather,
      lastCalibration
    ] = await Promise.all([
      this.#database.SunscreenProducts.count(),
      this.#database.ActiveSessionLocks.count(),
      this.#database.SessionEndedEvents.count(),
      this.#database.SetupDrafts.count(),
      this.#database.WeatherSnapshots.orderBy("fetchedAt").last(),
      this.#database.ClockCalibration.orderBy("calibratedAtUtc").last()
    ]);

    return {
      productCount,
      hasActiveSession: activeSessionCount > 0,
      endedSessionCount,
      hasSetupDraft: draftCount > 0,
      lastWeatherSnapshotAt: lastWeather?.fetchedAt ?? null,
      lastClockCalibrationAt: lastCalibration?.calibratedAtUtc ?? null
    };
  }

  async exportData(exportedAt: string): Promise<unknown> {
    const [
      products,
      sessions,
      zoneStates,
      sessionStartedEvents,
      zoneTrackingEvents,
      zoneMethodEvents,
      applicationConfirmationGroups,
      applicationEvents,
      productSafetyEvents,
      contextEvents,
      sessionEndedEvents,
      reminderPreferences,
      metadata
    ] = await Promise.all([
      this.#database.SunscreenProducts.toArray(),
      this.#database.ProtectionSessions.toArray(),
      this.#database.ProtectionZoneStates.toArray(),
      this.#database.SessionStartedEvents.toArray(),
      this.#database.ZoneTrackingEvents.toArray(),
      this.#database.ZoneMethodEvents.toArray(),
      this.#database.ApplicationConfirmationGroups.toArray(),
      this.#database.ApplicationEvents.toArray(),
      this.#database.ProductSafetyEvents.toArray(),
      this.#database.ContextEvents.toArray(),
      this.#database.SessionEndedEvents.toArray(),
      this.#database.LocalReminderPresentationPreferences.toArray(),
      this.#database.AppMetadata.toArray()
    ]);

    return {
      formatVersion: LOCAL_DATA_EXPORT_FORMAT_VERSION,
      exportedAt,
      application: "UVAlert 防曬晴報員",
      notice:
        "這份檔案由你的裝置直接產生，沒有上傳、沒有經過後端。目前版本只支援匯出，尚不支援匯入還原。",
      excluded: [
        "裝置識別碼與訪客識別碼",
        "精確座標（只保留你選擇的鄉鎮層級地區）",
        "任何金鑰與冪等收據等內部紀錄"
      ],
      products,
      sessions: sessions.map(stripOwnerKey),
      zoneStates,
      events: {
        sessionStarted: sessionStartedEvents.map(stripCommandIdentifiers),
        zoneTracking: zoneTrackingEvents.map(stripCommandIdentifiers),
        zoneMethod: zoneMethodEvents.map(stripCommandIdentifiers),
        applicationConfirmationGroups:
          applicationConfirmationGroups.map(stripCommandIdentifiers),
        applications: applicationEvents.map(stripCommandIdentifiers),
        productSafety: productSafetyEvents.map(stripCommandIdentifiers),
        context: contextEvents.map(stripCommandIdentifiers),
        sessionEnded: sessionEndedEvents.map(stripCommandIdentifiers)
      },
      preferences: {
        // 鍵名帶 deviceLocalId，只留實際偏好值。
        reminderPresentation: reminderPreferences.map(
          ({ soundEnabled, vibrationEnabled }) => ({
            soundEnabled,
            vibrationEnabled
          })
        ),
        metadata: metadata
          .filter((entry) => !EXCLUDED_METADATA_KEYS.has(entry.key))
          .map((entry) => ({ key: entry.key, value: entry.value }))
      }
    };
  }

  async clearSetupDrafts(): Promise<void> {
    await this.#database.SetupDrafts.clear();
  }

  /**
   * 清除產品與已結束的歷史，但**不動進行中的提醒**。
   *
   * active Session 不可用一般刪除直接消失（S-19）；要結束它得走
   * 明確的結束提醒，或用「清除全部」並在確認中說明。
   */
  async clearProductsAndHistory(): Promise<void> {
    const lock = await this.#database.ActiveSessionLocks.toCollection().first();
    const activeSessionId = lock?.sessionId ?? null;

    const endedSessions = await this.#database.ProtectionSessions.filter(
      (session) => session.id !== activeSessionId
    ).toArray();
    const endedIds = new Set(endedSessions.map((session) => session.id));

    await this.#database.SunscreenProducts.clear();
    await this.#database.ProtectionSessions.bulkDelete([...endedIds]);

    const eventTables = [
      this.#database.SessionStartedEvents,
      this.#database.ZoneTrackingEvents,
      this.#database.ZoneMethodEvents,
      this.#database.ApplicationConfirmationGroups,
      this.#database.ApplicationEvents,
      this.#database.ProductSafetyEvents,
      this.#database.ContextEvents,
      this.#database.SessionEndedEvents
    ];
    for (const table of eventTables) {
      await table
        .filter((row: { sessionId?: string }) =>
          row.sessionId === undefined ? false : endedIds.has(row.sessionId)
        )
        .delete();
    }
    await this.#database.ProtectionZoneStates.filter((zone) =>
      endedIds.has(zone.sessionId)
    ).delete();
  }

  async clearAll(): Promise<void> {
    await Promise.all(this.#database.tables.map((table) => table.clear()));
    // 清完必須留下乾淨可用的必要 metadata，否則下一次啟動會處在
    // 半初始化狀態（S-19）。
    await this.#database.AppMetadata.bulkPut([
      { key: "localVisitorId", value: this.#createId() },
      { key: "deviceLocalId", value: this.#createId() }
    ]);
  }
}
