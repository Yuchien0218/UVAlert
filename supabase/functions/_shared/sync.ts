/**
 * Edge runtime 的同步資料邊界。
 *
 * Edge Function 部署是獨立 bundle，不能直接依賴 web workspace 的 alias；
 * 這裡保留與 packages/contracts/src/sync.ts 相同的公開版本與欄位規則，
 * 並在每個 handler 進入資料庫前再次驗證。若 contract 版本變更，兩處必須
 * 一起更新並由 contract／Edge tests 阻擋漏改。
 */

export const SYNC_SCHEMA_VERSION = "sync-v1" as const;
export const RECORD_KINDS = [
  "active_session",
  "product_catalog",
  "region_preference",
  "user_preferences"
] as const;

export type SyncRecordKind = (typeof RECORD_KINDS)[number];
export type SyncRecordKey = {
  recordKind: SyncRecordKind;
  recordId: string;
};
export type SyncRecord = SyncRecordKey & {
  schemaVersion: typeof SYNC_SCHEMA_VERSION;
  revision: number;
  payloadFingerprint: string;
  updatedAt: string;
  payload: Record<string, unknown>;
};
export type SyncTombstone = SyncRecordKey & {
  schemaVersion: typeof SYNC_SCHEMA_VERSION;
  revision: number;
  deletedAt: string;
};
export type SyncManifest = {
  schemaVersion: typeof SYNC_SCHEMA_VERSION;
  records: Array<{
    recordKind: SyncRecordKind;
    recordId: string;
    schemaVersion: typeof SYNC_SCHEMA_VERSION;
    revision: number;
    payloadFingerprint: string;
    updatedAt: string;
  }>;
  tombstones: SyncTombstone[];
  fetchedAt: string;
};

export type SyncReadRequest = {
  schemaVersion: typeof SYNC_SCHEMA_VERSION;
  recordKeys: SyncRecordKey[];
};
export type SyncReadResponse = {
  schemaVersion: typeof SYNC_SCHEMA_VERSION;
  records: SyncRecord[];
  tombstones: SyncTombstone[];
};
export type SyncCommitEntry = {
  record: SyncRecord;
  expectedRevision: number | null;
};
export type SyncCommitTombstoneEntry = {
  tombstone: SyncTombstone;
  expectedRevision: number | null;
};
export type SyncCommitRequest = {
  schemaVersion: typeof SYNC_SCHEMA_VERSION;
  idempotencyKey: string;
  records: SyncCommitEntry[];
  tombstones: SyncCommitTombstoneEntry[];
};
export type SyncDeleteRequest = {
  schemaVersion: typeof SYNC_SCHEMA_VERSION;
  idempotencyKey: string;
  records: Array<{ key: SyncRecordKey; expectedRevision: number }>;
};

export type SyncCommitResult = {
  schemaVersion: typeof SYNC_SCHEMA_VERSION;
  committedRecords: SyncManifest["records"];
  committedTombstones: SyncTombstone[];
  committedAt: string;
};
export type SyncDeleteResult = {
  schemaVersion: typeof SYNC_SCHEMA_VERSION;
  committedTombstones: SyncTombstone[];
  committedAt: string;
};

export type SyncRecordRow = {
  record_kind: SyncRecordKind;
  record_id: string;
  schema_version: string;
  revision: number | string;
  payload_fingerprint: string;
  payload: unknown;
  updated_at: string;
};
export type SyncTombstoneRow = {
  record_kind: SyncRecordKind;
  record_id: string;
  schema_version: string;
  revision: number | string;
  deleted_at: string;
};

export class SyncValidationError extends Error {
  readonly field: string | undefined;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "SyncValidationError";
    this.field = field;
  }
}

export function parseOwnedRecordKey(input: unknown): SyncRecordKey {
  const value = asObject(input, "record key");
  const recordKind = value.recordKind;
  const recordId = value.recordId;
  if (!isRecordKind(recordKind)) {
    throw new SyncValidationError("recordKind 不受支援", "recordKind");
  }
  assertId(recordId, "recordId");
  return { recordKind, recordId };
}

export function validateSyncRecord(input: unknown): SyncRecord {
  const value = asObject(input, "record");
  if (value.schemaVersion !== SYNC_SCHEMA_VERSION) {
    throw new SyncValidationError("sync schema version 不正確", "schemaVersion");
  }
  const key = parseOwnedRecordKey(value);
  const revision = assertPositiveInteger(value.revision, "revision");
  const payloadFingerprint = assertId(
    value.payloadFingerprint,
    "payloadFingerprint"
  );
  const updatedAt = assertUtcInstant(value.updatedAt, "updatedAt");
  const payload = asObject(value.payload, "payload");
  validatePayload(key, payload);
  return {
    ...key,
    schemaVersion: SYNC_SCHEMA_VERSION,
    revision,
    payloadFingerprint,
    updatedAt,
    payload
  };
}

export function validateSyncTombstone(input: unknown): SyncTombstone {
  const value = asObject(input, "tombstone");
  if (value.schemaVersion !== SYNC_SCHEMA_VERSION) {
    throw new SyncValidationError("tombstone schema version 不正確", "schemaVersion");
  }
  const key = parseOwnedRecordKey(value);
  return {
    ...key,
    schemaVersion: SYNC_SCHEMA_VERSION,
    revision: assertPositiveInteger(value.revision, "revision"),
    deletedAt: assertUtcInstant(value.deletedAt, "deletedAt")
  };
}

export function parseSyncReadRequest(input: unknown): SyncReadRequest {
  const value = asObject(input, "request");
  assertSyncVersion(value);
  const rawKeys = asArray(value.recordKeys, "recordKeys");
  if (rawKeys.length > 1000) {
    throw new SyncValidationError("一次最多讀取 1000 筆資料", "recordKeys");
  }
  const recordKeys = rawKeys.map(parseOwnedRecordKey);
  assertUniqueKeys(recordKeys);
  return { schemaVersion: SYNC_SCHEMA_VERSION, recordKeys };
}

export function parseSyncCommitRequest(input: unknown): SyncCommitRequest {
  const value = asObject(input, "request");
  assertSyncVersion(value);
  const idempotencyKey = assertId(value.idempotencyKey, "idempotencyKey");
  if (idempotencyKey.length > 160) {
    throw new SyncValidationError("idempotencyKey 太長", "idempotencyKey");
  }
  const rawRecords = asArray(value.records, "records");
  const rawTombstones = asArray(value.tombstones, "tombstones");
  if (rawRecords.length > 1000 || rawTombstones.length > 1000) {
    throw new SyncValidationError("一次最多提交 1000 筆資料");
  }
  const records = rawRecords.map((entry) => {
    const row = asObject(entry, "records entry");
    const expectedRevision = parseExpectedRevision(row.expectedRevision);
    return {
      record: validateSyncRecord(row.record),
      expectedRevision
    };
  });
  const tombstones = rawTombstones.map((entry) => {
    const row = asObject(entry, "tombstones entry");
    return {
      tombstone: validateSyncTombstone(row.tombstone),
      expectedRevision: parseExpectedRevision(row.expectedRevision)
    };
  });
  assertUniqueKeys([
    ...records.map(({ record }) => ({
      recordKind: record.recordKind,
      recordId: record.recordId
    })),
    ...tombstones.map(({ tombstone }) => ({
      recordKind: tombstone.recordKind,
      recordId: tombstone.recordId
    }))
  ]);
  return { schemaVersion: SYNC_SCHEMA_VERSION, idempotencyKey, records, tombstones };
}

export function parseSyncDeleteRequest(input: unknown): SyncDeleteRequest {
  const value = asObject(input, "request");
  assertSyncVersion(value);
  const idempotencyKey = assertId(value.idempotencyKey, "idempotencyKey");
  const rows = asArray(value.records, "records");
  if (rows.length > 1000) {
    throw new SyncValidationError("一次最多刪除 1000 筆資料", "records");
  }
  const records = rows.map((entry) => {
    const row = asObject(entry, "records entry");
    return {
      key: parseOwnedRecordKey(row.key),
      expectedRevision: assertPositiveInteger(row.expectedRevision, "expectedRevision")
    };
  });
  assertUniqueKeys(records.map(({ key }) => key));
  return { schemaVersion: SYNC_SCHEMA_VERSION, idempotencyKey, records };
}

export function validateSyncCommitResult(input: unknown): SyncCommitResult {
  const value = asObject(input, "commit response");
  assertSyncVersion(value);
  if (!Array.isArray(value.committedRecords) || !Array.isArray(value.committedTombstones)) {
    throw new SyncValidationError("commit response 格式不正確");
  }
  const committedRecords = value.committedRecords.map((item) => {
    const row = asObject(item, "committed record");
    const key = parseOwnedRecordKey(row);
    return {
      ...key,
      schemaVersion: SYNC_SCHEMA_VERSION,
      revision: assertPositiveInteger(row.revision, "revision"),
      payloadFingerprint: assertId(row.payloadFingerprint, "payloadFingerprint"),
      updatedAt: assertUtcInstant(row.updatedAt, "updatedAt")
    };
  });
  const committedTombstones = value.committedTombstones.map(validateSyncTombstone);
  return {
    schemaVersion: SYNC_SCHEMA_VERSION,
    committedRecords,
    committedTombstones,
    committedAt: assertUtcInstant(value.committedAt, "committedAt")
  };
}

export function validateSyncDeleteResult(input: unknown): SyncDeleteResult {
  const value = asObject(input, "delete response");
  assertSyncVersion(value);
  if (!Array.isArray(value.committedTombstones)) {
    throw new SyncValidationError("delete response 格式不正確");
  }
  return {
    schemaVersion: SYNC_SCHEMA_VERSION,
    committedTombstones: value.committedTombstones.map(validateSyncTombstone),
    committedAt: assertUtcInstant(value.committedAt, "committedAt")
  };
}

export function readManifestForUser(
  records: SyncRecordRow[],
  tombstones: SyncTombstoneRow[],
  fetchedAt: string
): SyncManifest {
  return {
    schemaVersion: SYNC_SCHEMA_VERSION,
    records: records.map((row) => {
      const key = parseOwnedRecordKey({
        recordKind: row.record_kind,
        recordId: row.record_id
      });
      if (row.schema_version !== SYNC_SCHEMA_VERSION) {
        throw new SyncValidationError("record schema version 不正確");
      }
      return {
        ...key,
        schemaVersion: SYNC_SCHEMA_VERSION,
        revision: numberRevision(row.revision),
        payloadFingerprint: assertId(row.payload_fingerprint, "payloadFingerprint"),
        updatedAt: assertUtcInstant(row.updated_at, "updatedAt")
      };
    }),
    tombstones: tombstones.map(toTombstone),
    fetchedAt: assertUtcInstant(fetchedAt, "fetchedAt")
  };
}

export function readSelectedRecords(
  records: SyncRecordRow[],
  tombstones: SyncTombstoneRow[],
  keys: SyncRecordKey[]
): SyncReadResponse {
  const selected = new Set(keys.map((key) => keyString(key)));
  return {
    schemaVersion: SYNC_SCHEMA_VERSION,
    records: records
      .filter((row) => selected.has(keyString({ recordKind: row.record_kind, recordId: row.record_id })))
      .map((row) =>
        validateSyncRecord({
          recordKind: row.record_kind,
          recordId: row.record_id,
          schemaVersion: SYNC_SCHEMA_VERSION,
          revision: numberRevision(row.revision),
          payloadFingerprint: row.payload_fingerprint,
          updatedAt: row.updated_at,
          payload: row.payload
        })
      ),
    tombstones: tombstones
      .filter((row) => selected.has(keyString({ recordKind: row.record_kind, recordId: row.record_id })))
      .map(toTombstone)
  };
}

export function buildConflict(options: {
  recordKey: SyncRecordKey;
  localRevision: number | null;
  remoteRevision: number | null;
  remoteSummary: SyncManifest["records"][number] | null;
  detectedAt: string;
}) {
  return {
    recordKey: options.recordKey,
    localRevision: options.localRevision,
    remoteRevision: options.remoteRevision,
    remoteSummary: options.remoteSummary,
    detectedAt: assertUtcInstant(options.detectedAt, "detectedAt")
  };
}

export function keyString(key: SyncRecordKey): string {
  return `${key.recordKind}:${key.recordId}`;
}

function validatePayload(key: SyncRecordKey, payload: Record<string, unknown>): void {
  switch (key.recordKind) {
    case "active_session":
      validateActiveSession(key, payload);
      return;
    case "product_catalog":
      if (payload.schemaVersion !== "1.1.0" || payload.productId !== key.recordId) {
        throw new SyncValidationError("產品 record 與 payload 不一致", "payload");
      }
      assertString(payload.displayName, "payload.displayName");
      if (!isOneOf(payload.gearCategory, ["sunscreen", "clothing", "eyewear", "other_gear"])) {
        throw new SyncValidationError("裝備品類不正確", "payload.gearCategory");
      }
      if (!isObject(payload.currentSnapshot)) {
        throw new SyncValidationError("產品缺少 currentSnapshot", "payload.currentSnapshot");
      }
      return;
    case "region_preference":
      if (payload.schemaVersion !== "region-preference-v1") {
        throw new SyncValidationError("行政區 preference schema 不正確", "payload.schemaVersion");
      }
      if (payload.mode === "selected") {
        const selection = asObject(payload.selection, "payload.selection");
        assertId(selection.regionCode, "payload.selection.regionCode");
        assertString(selection.displayName, "payload.selection.displayName");
      } else if (payload.mode === "skipped") {
        assertUtcInstant(payload.skippedAt, "payload.skippedAt");
      } else {
        throw new SyncValidationError("行政區 preference mode 不正確", "payload.mode");
      }
      return;
    case "user_preferences":
      if (payload.schemaVersion !== "user-preferences-v1") {
        throw new SyncValidationError("user preferences schema 不正確", "payload.schemaVersion");
      }
      if (
        payload.reminderFrequencyMinutes !== null &&
        !isPositiveIntegerWithin(payload.reminderFrequencyMinutes, 120)
      ) {
        throw new SyncValidationError("提醒頻率不正確", "payload.reminderFrequencyMinutes");
      }
      if (typeof payload.soundEnabled !== "boolean" || typeof payload.vibrationEnabled !== "boolean") {
        throw new SyncValidationError("提醒偏好格式不正確", "payload");
      }
      return;
  }
}

function validateActiveSession(key: SyncRecordKey, payload: Record<string, unknown>): void {
  const session = asObject(payload.session, "payload.session");
  if (session.id !== key.recordId || !isObject(payload.eventStream)) {
    throw new SyncValidationError("active session payload 不一致", "payload");
  }
  if (Object.prototype.hasOwnProperty.call(session, "ownerKey")) {
    throw new SyncValidationError("active session 不得上傳 ownerKey", "payload.session.ownerKey");
  }
  if (session.endedAt !== null || session.overallStatus === "ended") {
    throw new SyncValidationError("active session 不得是已結束狀態", "payload.session.endedAt");
  }
  const stream = asObject(payload.eventStream, "payload.eventStream");
  const started = asObject(stream.sessionStarted, "payload.eventStream.sessionStarted");
  if (started.sessionId !== key.recordId) {
    throw new SyncValidationError("事件流 sessionId 不一致", "payload.eventStream.sessionStarted.sessionId");
  }
  if (!Array.isArray(stream.sessionEndedEvents) || stream.sessionEndedEvents.length > 0) {
    throw new SyncValidationError("active session 不得含有結束事件", "payload.eventStream.sessionEndedEvents");
  }
}

function toTombstone(row: SyncTombstoneRow): SyncTombstone {
  const key = parseOwnedRecordKey({ recordKind: row.record_kind, recordId: row.record_id });
  if (row.schema_version !== SYNC_SCHEMA_VERSION) {
    throw new SyncValidationError("tombstone schema version 不正確");
  }
  return {
    ...key,
    schemaVersion: SYNC_SCHEMA_VERSION,
    revision: numberRevision(row.revision),
    deletedAt: assertUtcInstant(row.deleted_at, "deletedAt")
  };
}

function assertSyncVersion(value: Record<string, unknown>): void {
  if (value.schemaVersion !== SYNC_SCHEMA_VERSION) {
    throw new SyncValidationError("sync schema version 不正確", "schemaVersion");
  }
}

function assertUniqueKeys(keys: SyncRecordKey[]): void {
  const values = keys.map(keyString);
  if (new Set(values).size !== values.length) {
    throw new SyncValidationError("request 不得包含重複 record key");
  }
}

function parseExpectedRevision(value: unknown): number | null {
  if (value === null) return null;
  return assertNonNegativeInteger(value, "expectedRevision");
}

function numberRevision(value: number | string): number {
  const number = typeof value === "string" ? Number(value) : value;
  return assertPositiveInteger(number, "revision");
}

function assertPositiveInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new SyncValidationError(`${field} 必須是正整數`, field);
  }
  return value;
}

function assertNonNegativeInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new SyncValidationError(`${field} 必須是非負整數`, field);
  }
  return value;
}

function isPositiveIntegerWithin(value: unknown, maximum: number): boolean {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value <= maximum;
}

function assertId(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > 200) {
    throw new SyncValidationError(`${field} 格式不正確`, field);
  }
  return value.trim();
}

function assertString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new SyncValidationError(`${field} 必須是非空文字`, field);
  }
  return value.trim();
}

function assertUtcInstant(value: unknown, field: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new SyncValidationError(`${field} 必須是 UTC 時間`, field);
  }
  return new Date(value).toISOString();
}

function asObject(value: unknown, field: string): Record<string, unknown> {
  if (!isObject(value)) throw new SyncValidationError(`${field} 必須是物件`, field);
  return value;
}

function asArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) throw new SyncValidationError(`${field} 必須是陣列`, field);
  return value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRecordKind(value: unknown): value is SyncRecordKind {
  return typeof value === "string" && (RECORD_KINDS as readonly string[]).includes(value);
}

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === "string" && values.includes(value as T);
}
