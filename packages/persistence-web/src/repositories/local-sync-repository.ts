import {
  ActiveSessionSyncPayloadSchema,
  SyncRecordEnvelopeV1Schema,
  SyncTombstoneV1Schema,
  SYNC_SCHEMA_VERSION,
  UserPreferencesV1Schema,
  type SyncRecordEnvelopeV1,
  type SyncRecordKind,
  type SyncTombstoneV1,
  type UserPreferencesV1
} from "@sunshield/contracts";
import { ownerKeyFor, reduceSession } from "@sunshield/domain";
import type {
  LocalSyncMetadata,
  LocalSyncPort,
  LocalSyncSnapshot
} from "@sunshield/platform";
import {
  SunshieldDatabase,
  type SyncMetadataRecord
} from "../db/database";
import { LocalProductCatalogRepository } from "./local-product-catalog-repository";
import { LocalRegionPreferenceRepository } from "./local-region-preference-repository";

export const USER_PREFERENCES_METADATA_KEY = "userPreferencesV1";

const DEFAULT_USER_PREFERENCES: UserPreferencesV1 = {
  schemaVersion: "user-preferences-v1",
  reminderFrequencyMinutes: null,
  soundEnabled: false,
  vibrationEnabled: false
};

type SyncCandidate = {
  recordKind: SyncRecordKind;
  recordId: string;
  payload: unknown;
  updatedAt: string;
};

/**
 * IndexedDB 與雲端同步之間的唯一資料邊界。
 *
 * 這個 repository 只會收集目前仍有跨裝置價值的資料：進行中的
 * protection session、裝備主檔、行政區偏好與使用者偏好。歷史 session、
 * UV 快取、setup draft、裝置／訪客識別碼與瀏覽器權限都不會進入 snapshot。
 */
export class LocalSyncRepository implements LocalSyncPort {
  readonly #database: SunshieldDatabase;
  readonly #getLocalVisitorId: () => Promise<string>;
  readonly #now: () => string;

  constructor(options: {
    database: SunshieldDatabase;
    localVisitorId: string | (() => Promise<string>);
    now?: () => string;
  }) {
    this.#database = options.database;
    const localVisitorId = options.localVisitorId;
    this.#getLocalVisitorId =
      typeof localVisitorId === "function"
        ? localVisitorId
        : async () => localVisitorId;
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  async collectSyncSnapshot(): Promise<LocalSyncSnapshot> {
    const collectedAt = this.#now();
    const products = await new LocalProductCatalogRepository(
      this.#database
    ).listProducts(collectedAt);
    const regionPreference = await new LocalRegionPreferenceRepository(
      this.#database
    ).getPreference();
    const activeSession = await this.#readActiveSessionCandidate();
    const userPreferences = await this.#readUserPreferences();
    const previousRows = await this.#database.SyncMetadata.toArray();
    const previousByKey = new Map(
      previousRows.map((row) => [syncKey(row.recordKind, row.recordId), row])
    );

    const candidates: SyncCandidate[] = products.map((product) => ({
      recordKind: "product_catalog",
      recordId: product.productId,
      payload: product,
      updatedAt: product.updatedAt
    }));

    if (regionPreference !== null) {
      candidates.push({
        recordKind: "region_preference",
        recordId: "current",
        payload: regionPreference,
        updatedAt: collectedAt
      });
    }

    candidates.push({
      recordKind: "user_preferences",
      recordId: "current",
      payload: userPreferences,
      updatedAt: collectedAt
    });

    if (activeSession !== null) candidates.push(activeSession);

    const records: SyncRecordEnvelopeV1[] = [];
    const metadataRows: SyncMetadataRecord[] = [];
    const currentKeys = new Set<string>();

    for (const candidate of candidates) {
      const key = syncKey(candidate.recordKind, candidate.recordId);
      currentKeys.add(key);
      const previous = previousByKey.get(key);
      const payloadFingerprint = fingerprintPayload(candidate.payload);
      const localRevision =
        previous === undefined
          ? 1
          : previous.localPayloadFingerprint === payloadFingerprint &&
              !previous.tombstone
            ? previous.localRevision
            : previous.localRevision + 1;
      const parsed = SyncRecordEnvelopeV1Schema.parse({
        schemaVersion: SYNC_SCHEMA_VERSION,
        recordKind: candidate.recordKind,
        recordId: candidate.recordId,
        revision: localRevision,
        payloadFingerprint,
        updatedAt: candidate.updatedAt,
        payload: candidate.payload
      });
      records.push(parsed);
      metadataRows.push({
        recordKind: candidate.recordKind,
        recordId: candidate.recordId,
        localPayloadFingerprint: payloadFingerprint,
        localRevision,
        cloudRevision: previous?.cloudRevision ?? null,
        lastSyncedAt: previous?.lastSyncedAt ?? null,
        tombstone: false,
        deletedAt: null
      });
    }

    const tombstones: SyncTombstoneV1[] = [];
    for (const previous of previousRows) {
      const key = syncKey(previous.recordKind, previous.recordId);
      if (currentKeys.has(key) || previous.tombstone) continue;

      const revision = previous.localRevision + 1;
      const deletedAt = collectedAt;
      tombstones.push(
        SyncTombstoneV1Schema.parse({
          schemaVersion: SYNC_SCHEMA_VERSION,
          recordKind: previous.recordKind,
          recordId: previous.recordId,
          revision,
          deletedAt
        })
      );
      metadataRows.push({
        ...previous,
        localPayloadFingerprint: null,
        localRevision: revision,
        tombstone: true,
        deletedAt
      });
    }

    await this.#database.transaction(
      "rw",
      this.#database.SyncMetadata,
      async () => {
        await this.#database.SyncMetadata.bulkPut(metadataRows);
      }
    );

    return {
      collectedAt,
      records,
      tombstones,
      metadata: metadataRows.map(toLocalSyncMetadata)
    };
  }

  async getActiveSession(): Promise<SyncRecordEnvelopeV1 | null> {
    const snapshot = await this.collectSyncSnapshot();
    return (
      snapshot.records.find(
        (record) => record.recordKind === "active_session"
      ) ?? null
    );
  }

  async applySelectedRecords(
    inputRecords: SyncRecordEnvelopeV1[]
  ): Promise<void> {
    const records = inputRecords.map((record) =>
      SyncRecordEnvelopeV1Schema.parse(record)
    );
    assertUniqueKeys(records.map((record) => syncKey(record.recordKind, record.recordId)));
    if (records.filter((record) => record.recordKind === "active_session").length > 1) {
      throw new Error("同步資料最多只能包含一個進行中的 Session");
    }
    const syncedAt = this.#now();
    const localVisitorId = await this.#getLocalVisitorId();

    await this.#database.transaction(
      "rw",
      [
        this.#database.SunscreenProducts,
        this.#database.ProtectionSessions,
        this.#database.ProtectionZoneStates,
        this.#database.SessionStartedEvents,
        this.#database.ZoneTrackingEvents,
        this.#database.ZoneMethodEvents,
        this.#database.ApplicationConfirmationGroups,
        this.#database.ApplicationEvents,
        this.#database.ProductSafetyEvents,
        this.#database.ContextEvents,
        this.#database.SessionEndedEvents,
        this.#database.ActiveSessionLocks,
        this.#database.ClientSequences,
        this.#database.CommandReceipts,
        this.#database.ZoneIdentityLocks,
        this.#database.ProjectionChecksums,
        this.#database.AppMetadata,
        this.#database.SyncMetadata
      ],
      async () => {
        for (const record of records) {
          switch (record.recordKind) {
            case "active_session":
              await this.#replaceActiveSession(
                record.payload,
                syncedAt,
                localVisitorId
              );
              break;
            case "product_catalog":
              await this.#database.SunscreenProducts.put(record.payload);
              break;
            case "region_preference":
              await this.#database.AppMetadata.put({
                key: "uvRegionPreferenceV1",
                value: JSON.stringify(record.payload)
              });
              break;
            case "user_preferences":
              await this.#database.AppMetadata.put({
                key: USER_PREFERENCES_METADATA_KEY,
                value: JSON.stringify(record.payload)
              });
              break;
          }

          await this.#database.SyncMetadata.put({
            recordKind: record.recordKind,
            recordId: record.recordId,
            localPayloadFingerprint: fingerprintPayload(record.payload),
            localRevision: record.revision,
            cloudRevision: record.revision,
            lastSyncedAt: syncedAt,
            tombstone: false,
            deletedAt: null
          });
        }
      }
    );
  }

  async applyTombstones(inputTombstones: SyncTombstoneV1[]): Promise<void> {
    const tombstones = inputTombstones.map((tombstone) =>
      SyncTombstoneV1Schema.parse(tombstone)
    );
    assertUniqueKeys(
      tombstones.map((tombstone) =>
        syncKey(tombstone.recordKind, tombstone.recordId)
      )
    );
    const syncedAt = this.#now();
    const localVisitorId = await this.#getLocalVisitorId();

    await this.#database.transaction(
      "rw",
      [
        this.#database.SunscreenProducts,
        this.#database.ProtectionSessions,
        this.#database.ProtectionZoneStates,
        this.#database.SessionStartedEvents,
        this.#database.ZoneTrackingEvents,
        this.#database.ZoneMethodEvents,
        this.#database.ApplicationConfirmationGroups,
        this.#database.ApplicationEvents,
        this.#database.ProductSafetyEvents,
        this.#database.ContextEvents,
        this.#database.SessionEndedEvents,
        this.#database.ActiveSessionLocks,
        this.#database.ClientSequences,
        this.#database.CommandReceipts,
        this.#database.ZoneIdentityLocks,
        this.#database.ProjectionChecksums,
        this.#database.AppMetadata,
        this.#database.SyncMetadata
      ],
      async () => {
        for (const tombstone of tombstones) {
          switch (tombstone.recordKind) {
            case "active_session": {
              const lock = await this.#database.ActiveSessionLocks.get(
                ownerKeyFor(localVisitorId)
              );
              if (lock?.sessionId === tombstone.recordId) {
                await this.#deleteSessionData(tombstone.recordId);
              }
              break;
            }
            case "product_catalog":
              await this.#database.SunscreenProducts.delete(
                tombstone.recordId
              );
              break;
            case "region_preference":
              await this.#database.AppMetadata.delete(
                "uvRegionPreferenceV1"
              );
              break;
            case "user_preferences":
              await this.#database.AppMetadata.delete(
                USER_PREFERENCES_METADATA_KEY
              );
              break;
          }

          const previous = await this.#database.SyncMetadata.get([
            tombstone.recordKind,
            tombstone.recordId
          ]);
          await this.#database.SyncMetadata.put({
            recordKind: tombstone.recordKind,
            recordId: tombstone.recordId,
            localPayloadFingerprint: null,
            localRevision: Math.max(
              previous?.localRevision ?? 0,
              tombstone.revision
            ),
            cloudRevision: tombstone.revision,
            lastSyncedAt: syncedAt,
            tombstone: true,
            deletedAt: tombstone.deletedAt
          });
        }
      }
    );
  }

  async #readUserPreferences(): Promise<UserPreferencesV1> {
    const stored = await this.#database.AppMetadata.get(
      USER_PREFERENCES_METADATA_KEY
    );
    if (stored === undefined) return DEFAULT_USER_PREFERENCES;
    try {
      const parsed = UserPreferencesV1Schema.safeParse(
        JSON.parse(stored.value)
      );
      return parsed.success ? parsed.data : DEFAULT_USER_PREFERENCES;
    } catch {
      return DEFAULT_USER_PREFERENCES;
    }
  }

  async #readActiveSessionCandidate(): Promise<SyncCandidate | null> {
    const localVisitorId = await this.#getLocalVisitorId();
    const lock = await this.#database.ActiveSessionLocks.get(
      ownerKeyFor(localVisitorId)
    );
    if (lock === undefined) return null;
    const session = await this.#database.ProtectionSessions.get(lock.sessionId);
    if (session === undefined || session.endedAt !== null) return null;

    const [
      sessionStartedEvents,
      zoneMethodEvents,
      zoneTrackingEvents,
      applicationConfirmationGroups,
      applicationEvents,
      productSafetyEvents,
      contextEvents,
      sessionEndedEvents
    ] = await Promise.all([
      this.#database.SessionStartedEvents.where("sessionId")
        .equals(session.id)
        .toArray(),
      this.#database.ZoneMethodEvents.where("sessionId")
        .equals(session.id)
        .toArray(),
      this.#database.ZoneTrackingEvents.where("sessionId")
        .equals(session.id)
        .toArray(),
      this.#database.ApplicationConfirmationGroups.where("sessionId")
        .equals(session.id)
        .toArray(),
      this.#database.ApplicationEvents.where("sessionId")
        .equals(session.id)
        .toArray(),
      this.#database.ProductSafetyEvents.where("sessionId")
        .equals(session.id)
        .toArray(),
      this.#database.ContextEvents.where("sessionId")
        .equals(session.id)
        .toArray(),
      this.#database.SessionEndedEvents.where("sessionId")
        .equals(session.id)
        .toArray()
    ]);
    const sessionStarted = sessionStartedEvents[0];
    if (sessionStarted === undefined || sessionStartedEvents.length !== 1) {
      throw new Error("目前 Session 的起始事件資料不完整，無法同步");
    }

    const { ownerKey: _ownerKey, ...cloudSession } = session;
    const payload = ActiveSessionSyncPayloadSchema.parse({
      session: cloudSession,
      eventStream: {
        sessionStarted,
        zoneMethodEvents,
        zoneTrackingEvents,
        applicationConfirmationGroups,
        applicationEvents,
        productSafetyEvents,
        contextEvents,
        sessionEndedEvents
      }
    });
    return {
      recordKind: "active_session",
      recordId: session.id,
      payload,
      updatedAt: session.updatedAt
    };
  }

  async #replaceActiveSession(
    rawPayload: unknown,
    syncedAt: string,
    localVisitorId: string
  ): Promise<void> {
    const payload = ActiveSessionSyncPayloadSchema.parse(rawPayload);
    await this.#clearActiveSessions();

    const session = {
      ...payload.session,
      ownerKey: ownerKeyFor(localVisitorId)
    };
    const projection = reduceSession({
      stream: payload.eventStream,
      revision: session.revision,
      clock: {
        status: "trusted",
        connectivity: "online",
        trustedNow: syncedAt
      }
    });
    await this.#database.ProtectionSessions.put(session);
    await this.#database.SessionStartedEvents.put(
      payload.eventStream.sessionStarted
    );
    await this.#database.ZoneMethodEvents.bulkPut(
      payload.eventStream.zoneMethodEvents
    );
    await this.#database.ZoneTrackingEvents.bulkPut(
      payload.eventStream.zoneTrackingEvents
    );
    await this.#database.ApplicationConfirmationGroups.bulkPut(
      payload.eventStream.applicationConfirmationGroups
    );
    await this.#database.ApplicationEvents.bulkPut(
      payload.eventStream.applicationEvents
    );
    await this.#database.ProductSafetyEvents.bulkPut(
      payload.eventStream.productSafetyEvents
    );
    await this.#database.ContextEvents.bulkPut(
      payload.eventStream.contextEvents
    );
    await this.#database.SessionEndedEvents.bulkPut(
      payload.eventStream.sessionEndedEvents
    );
    await this.#database.ProtectionZoneStates.bulkPut(projection.zones);
    await this.#database.ActiveSessionLocks.put({
      ownerKey: ownerKeyFor(localVisitorId),
      sessionId: session.id,
      createdAt: syncedAt
    });
  }

  async #clearActiveSessions(): Promise<void> {
    const locks = await this.#database.ActiveSessionLocks.toArray();
    for (const lock of locks) {
      await this.#deleteSessionData(lock.sessionId);
    }
  }

  async #deleteSessionData(sessionId: string): Promise<void> {
    await Promise.all([
      this.#database.ProtectionSessions.delete(sessionId),
      this.#database.ProtectionZoneStates.where("sessionId")
        .equals(sessionId)
        .delete(),
      this.#database.SessionStartedEvents.where("sessionId")
        .equals(sessionId)
        .delete(),
      this.#database.ZoneTrackingEvents.where("sessionId")
        .equals(sessionId)
        .delete(),
      this.#database.ZoneMethodEvents.where("sessionId")
        .equals(sessionId)
        .delete(),
      this.#database.ApplicationConfirmationGroups.where("sessionId")
        .equals(sessionId)
        .delete(),
      this.#database.ApplicationEvents.where("sessionId")
        .equals(sessionId)
        .delete(),
      this.#database.ProductSafetyEvents.where("sessionId")
        .equals(sessionId)
        .delete(),
      this.#database.ContextEvents.where("sessionId")
        .equals(sessionId)
        .delete(),
      this.#database.SessionEndedEvents.where("sessionId")
        .equals(sessionId)
        .delete(),
      this.#database.ClientSequences
        .filter((row) => row.sessionId === sessionId)
        .delete(),
      this.#database.CommandReceipts
        .filter((row) => row.sessionId === sessionId)
        .delete(),
      this.#database.ZoneIdentityLocks
        .filter((row) => row.sessionId === sessionId)
        .delete(),
      this.#database.ProjectionChecksums
        .filter((row) => row.sessionId === sessionId)
        .delete()
    ]);
    await this.#database.ActiveSessionLocks
      .where("sessionId")
      .equals(sessionId)
      .delete();
  }
}

function syncKey(recordKind: SyncRecordKind, recordId: string): string {
  return `${recordKind}:${recordId}`;
}

function assertUniqueKeys(keys: string[]): void {
  if (new Set(keys).size !== keys.length) {
    throw new Error("同步資料不得包含重複的 record key");
  }
}

function toLocalSyncMetadata(row: SyncMetadataRecord): LocalSyncMetadata {
  return { ...row };
}

function fingerprintPayload(payload: unknown): string {
  const source = JSON.stringify(payload);
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `payload-v1-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
