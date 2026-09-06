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
  return { recordKind, recordId: assertId(recordId, "recordId") };
}

export function validateSyncRecord(input: unknown): SyncRecord {
  const value = asObject(input, "record");
  if (value.schemaVersion !== SYNC_SCHEMA_VERSION) {
    throw new SyncValidationError(
      "sync schema version 不正確",
      "schemaVersion"
    );
  }
  const key = parseOwnedRecordKey(value);
  const revision = assertPositiveInteger(value.revision, "revision");
  const payloadFingerprint = assertId(
    value.payloadFingerprint,
    "payloadFingerprint"
  );
  const updatedAt = assertUtcInstant(value.updatedAt, "updatedAt");
  const payload = parsePayload(key, asObject(value.payload, "payload"));
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
    throw new SyncValidationError(
      "tombstone schema version 不正確",
      "schemaVersion"
    );
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
  const records = Array.from(rawRecords, (entry) => {
    const row = asObject(entry, "records entry");
    // Client envelopes require UTC; database responses are normalized separately.
    utc(asObject(row.record, "record").updatedAt);
    const expectedRevision = parseExpectedRevision(row.expectedRevision);
    return {
      record: validateSyncRecord(row.record),
      expectedRevision
    };
  });
  const tombstones = Array.from(rawTombstones, (entry) => {
    const row = asObject(entry, "tombstones entry");
    utc(asObject(row.tombstone, "tombstone").deletedAt);
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
  return {
    schemaVersion: SYNC_SCHEMA_VERSION,
    idempotencyKey,
    records,
    tombstones
  };
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
      expectedRevision: assertPositiveInteger(
        row.expectedRevision,
        "expectedRevision"
      )
    };
  });
  assertUniqueKeys(records.map(({ key }) => key));
  return { schemaVersion: SYNC_SCHEMA_VERSION, idempotencyKey, records };
}

export function validateSyncCommitResult(input: unknown): SyncCommitResult {
  const value = asObject(input, "commit response");
  assertSyncVersion(value);
  if (
    !Array.isArray(value.committedRecords) ||
    !Array.isArray(value.committedTombstones)
  ) {
    throw new SyncValidationError("commit response 格式不正確");
  }
  const committedRecords = value.committedRecords.map((item) => {
    const row = asObject(item, "committed record");
    const key = parseOwnedRecordKey(row);
    return {
      ...key,
      schemaVersion: SYNC_SCHEMA_VERSION,
      revision: assertPositiveInteger(row.revision, "revision"),
      payloadFingerprint: assertId(
        row.payloadFingerprint,
        "payloadFingerprint"
      ),
      updatedAt: assertUtcInstant(row.updatedAt, "updatedAt")
    };
  });
  const committedTombstones = value.committedTombstones.map(
    validateSyncTombstone
  );
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
        payloadFingerprint: assertId(
          row.payload_fingerprint,
          "payloadFingerprint"
        ),
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
      .filter((row) =>
        selected.has(
          keyString({ recordKind: row.record_kind, recordId: row.record_id })
        )
      )
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
      .filter((row) =>
        selected.has(
          keyString({ recordKind: row.record_kind, recordId: row.record_id })
        )
      )
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

function parsePayload(
  key: SyncRecordKey,
  payload: Record<string, unknown>
): Record<string, unknown> {
  switch (key.recordKind) {
    case "active_session":
      validateActiveSession(key, payload);
      return activePayload(payload);
    case "product_catalog":
      if (
        payload.schemaVersion !== "1.1.0" ||
        payload.productId !== key.recordId
      ) {
        throw new SyncValidationError(
          "產品 record 與 payload 不一致",
          "payload"
        );
      }
      return productPayload(payload);
    case "region_preference":
      return (
        payload.mode === "selected"
          ? selectedRegionPayload
          : skippedRegionPayload
      )(payload);
    case "user_preferences":
      return preferencesPayload(payload);
  }
}

// A standalone, dependency-free Edge schema: Supabase bundles separately and
// cannot resolve web aliases. The canonical schemas use extensionless imports
// and bare `zod`; reusing them needs a separately verified deployment config.
// All canonical payload fields/refinements are mirrored below and guarded by
// the differential matrix. Edge intentionally rejects unknown keys (including
// ownerKey), duplicate keys and envelope/payload identity mismatches, whereas
// canonical Zod strips unknown keys and does not enforce the latter two rules.
type Rule = (value: unknown) => unknown;
type Shape = Record<string, Rule>;
const invalid = (): never => {
  throw new SyncValidationError("同步資料格式不正確", "payload");
};
const textRule =
  (min = 1, max = Infinity, trim = true): Rule =>
  (value) => {
    if (typeof value !== "string") return invalid();
    const result = trim ? value.trim() : value;
    return result.length >= min && result.length <= max ? result : invalid();
  };
const idRule = textRule(1, 200);
const choice =
  (...values: Array<string | number>): Rule =>
  (value) =>
    values.includes(value as string | number) ? value : invalid();
const numberRule =
  (min: number, max = Infinity, integer = true): Rule =>
  (value) =>
    typeof value === "number" &&
    Number.isFinite(value) &&
    (!integer || Number.isSafeInteger(value)) &&
    value >= min &&
    value <= max
      ? value
      : invalid();
const positive = numberRule(1);
const nonnegative = numberRule(0);
const nullable =
  (rule: Rule): Rule =>
  (value) =>
    value === null ? null : rule(value);
const defaulted =
  (rule: Rule, fallback: unknown = null): Rule =>
  (value) =>
    value === undefined ? fallback : rule(value);
const optionalNull = (rule: Rule): Rule => defaulted(nullable(rule));
const list =
  (rule: Rule, min = 0): Rule =>
  (value) =>
    Array.isArray(value) && value.length >= min
      ? Array.from(value, rule)
      : invalid();
const object =
  (shape: Shape, refinement?: (value: Record<string, unknown>) => boolean) =>
  (input: unknown): Record<string, unknown> => {
    if (
      !isObject(input) ||
      Object.keys(input).some((key) => !Object.hasOwn(shape, key))
    )
      return invalid();
    const value = Object.fromEntries(
      Object.entries(shape).map(([key, rule]) => [key, rule(input[key])])
    );
    if (refinement && !refinement(value)) return invalid();
    return value;
  };
const matches =
  (pattern: RegExp): Rule =>
  (value) =>
    typeof value === "string" && pattern.test(value) ? value : invalid();
// Validate the calendar as well as the time syntax; Date.parse alone accepts
// non-ISO strings and normalizes impossible calendar dates such as February 30.
const instant =
  (utcOnly: boolean): Rule =>
  (value) => {
    if (typeof value !== "string") return invalid();
    const match =
      /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(
        value
      );
    if (!match || (utcOnly && match[4] !== "Z")) return invalid();
    const year = Number(match[1]),
      month = Number(match[2]),
      day = Number(match[3]);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]!
      ? value
      : invalid();
  };
const utc = instant(true);
const offsetInstant = instant(false);
const ids = list(idRule);
const nonemptyIds = list(idRule, 1);
const setupMode = choice("reuse", "quick_preset", "self_select");
const preset = choice("accepted", "adjusted", "not_shown");
const endedReason = choice(
  "user_ended",
  "replaced_by_new_session",
  "account_conflict_resolution"
);
const context = choice(
  "indoor_away",
  "indoor_window",
  "outdoor_general",
  "outdoor_exercise",
  "water_preparing",
  "water_active"
);
const shade = choice("none", "partial", "full", "unknown");
const ruleset = textRule(1, Infinity, false);
const snapshot = object(
  {
    snapshotVersion: choice("1.0.0"),
    identityStatus: choice("confirmed", "identity_unconfirmed"),
    expiryStatus: choice("not_expired", "expired", "unknown"),
    conditionStatus: choice(
      "no_issue_reported",
      "abnormal_reported",
      "discomfort_reported"
    ),
    sunscreenClaimStatus: choice("confirmed", "no_claim", "unknown"),
    ruleEligibilityAtApplication: choice(
      "eligible",
      "expired",
      "abnormal_reported",
      "discomfort_reported",
      "no_sunscreen_claim",
      "identity_unconfirmed"
    ),
    reapplicationIntervalStatus: choice(
      "explicit_minutes",
      "no_numeric_interval",
      "unknown"
    ),
    reapplicationIntervalMinutes: nullable(positive),
    preExposureWaitStatus: choice(
      "explicit_minutes",
      "no_instruction",
      "unknown"
    ),
    preExposureWaitMinutes: nullable(positive),
    waterResistanceStatus: choice(
      "40",
      "80",
      "not_water_resistant",
      "no_claim",
      "unknown"
    ),
    waterResistanceMinutes: nullable(choice(40, 80)),
    spf: optionalNull(numberRule(Number.MIN_VALUE, Infinity, false)),
    paGrade: optionalNull(textRule(1, 20)),
    capturedAt: offsetInstant
  },
  (value) => {
    const eligibility =
      value.identityStatus === "identity_unconfirmed"
        ? "identity_unconfirmed"
        : value.expiryStatus === "expired"
          ? "expired"
          : value.conditionStatus !== "no_issue_reported"
            ? value.conditionStatus
            : value.sunscreenClaimStatus !== "confirmed"
              ? "no_sunscreen_claim"
              : "eligible";
    const water =
      value.waterResistanceStatus === "40"
        ? 40
        : value.waterResistanceStatus === "80"
          ? 80
          : null;
    return (
      (value.reapplicationIntervalStatus === "explicit_minutes") ===
        (value.reapplicationIntervalMinutes !== null) &&
      (value.preExposureWaitStatus === "explicit_minutes") ===
        (value.preExposureWaitMinutes !== null) &&
      value.waterResistanceMinutes === water &&
      value.ruleEligibilityAtApplication === eligibility
    );
  }
);
const productPayload = object({
  schemaVersion: choice("1.1.0"),
  productId: textRule(),
  displayName: textRule(1, 80),
  gearCategory: choice("sunscreen", "clothing", "eyewear", "other_gear"),
  currentSnapshot: snapshot,
  snapshotFingerprint: textRule(),
  purchaseMonth: optionalNull(matches(/^\d{4}-(0[1-9]|1[0-2])$/)),
  expiryDate: optionalNull(matches(/^\d{4}-\d{2}-\d{2}$/)),
  note: optionalNull(textRule(0, 500)),
  priceTwd: optionalNull(nonnegative),
  usageRating: optionalNull(choice("good", "ok", "bad")),
  size: optionalNull(textRule(0, 20)),
  color: optionalNull(textRule(0, 20)),
  volume: optionalNull(textRule(0, 20)),
  formulation: optionalNull(choice("lotion", "gel", "cream", "spray", "stick")),
  protectionType: optionalNull(choice("physical", "chemical", "hybrid")),
  archivedAt: optionalNull(offsetInstant),
  createdAt: offsetInstant,
  updatedAt: offsetInstant,
  status: choice("active", "stopped")
});
const eventEnvelope: Shape = {
  schemaVersion: choice("1.0.0"),
  id: idRule,
  sessionId: idRule,
  commandId: idRule,
  idempotencyKey: idRule,
  effectiveOccurredAt: utc,
  clientCreatedAt: utc,
  clientSequence: nonnegative,
  localAppliedSequence: nonnegative
};
const correction: Shape = {
  correctionAction: defaulted(choice("create", "replace", "void"), "create"),
  correctionOfEventId: optionalNull(idRule)
};
const validCorrection = (value: Record<string, unknown>) =>
  (value.correctionAction !== "create") ===
  (value.correctionOfEventId !== null);
const correctable = (
  shape: Shape,
  refinement?: (value: Record<string, unknown>) => boolean
) =>
  object(
    { ...eventEnvelope, ...correction, ...shape },
    (value) => validCorrection(value) && (!refinement || refinement(value))
  );
const sessionStarted = object({
  ...eventEnvelope,
  eventType: choice("session_started"),
  rulesetVersion: ruleset,
  bodyZoneSchemaVersion: choice("BODY_ZONE_V3"),
  setupEntryMode: setupMode,
  presetDecision: preset,
  suggestedPresetVersion: nullable(idRule),
  effectiveStartedAt: utc,
  initialContext: context,
  initialShade: shade,
  zoneInstanceIds: nonemptyIds
});
const zoneMethod = correctable({
  eventType: choice("zone_method"),
  zoneInstanceId: idRule,
  bodyZoneCode: choice(
    "face_forehead",
    "face_nose_cheeks",
    "face_lower",
    "ears",
    "lips",
    "scalp",
    "neck_front",
    "neck_back",
    "shoulders",
    "torso_front",
    "torso_back",
    "arms",
    "hand_backs",
    "legs",
    "feet",
    "custom"
  ),
  customLabel: optionalNull(textRule(1, 80)),
  skinExposureStatus: choice("exposed", "clothing_covered", "unknown"),
  methodCertainty: choice(
    "confirmed",
    "none_reported",
    "unknown",
    "unrecorded"
  ),
  methodComponents: list(choice("sunscreen", "other_topical", "clothing"))
});
const zoneTracking = correctable({
  eventType: choice("zone_tracking"),
  zoneInstanceId: idRule,
  trackingStatus: choice("active", "ended")
});
const confirmationGroup = object(
  {
    ...eventEnvelope,
    eventType: choice("application_confirmation_group"),
    appliedAt: utc,
    confirmedZoneInstanceIds: nonemptyIds,
    correctionAction: defaulted(choice("create", "replace", "void"), "create"),
    correctionOfGroupId: optionalNull(idRule)
  },
  (value) =>
    (value.correctionAction !== "create") ===
    (value.correctionOfGroupId !== null)
);
const application = object({
  ...eventEnvelope,
  eventType: choice("application_recorded"),
  applicationConfirmationId: idRule,
  zoneInstanceIds: nonemptyIds,
  appliedAt: utc,
  sourceProductId: nullable(idRule),
  productSnapshotFingerprint: idRule,
  productLabelSnapshot: snapshot
});
const productSafety = correctable(
  {
    eventType: choice("product_safety"),
    safetyKind: choice("abnormal_reported", "discomfort_reported"),
    sourceProductId: nullable(idRule),
    productSnapshotFingerprint: nullable(idRule),
    zoneInstanceIds: nonemptyIds
  },
  (value) =>
    value.sourceProductId !== null || value.productSnapshotFingerprint !== null
);
const contextBase = { eventType: choice("context_event") };
const contextVariants: Record<string, Rule> = {
  context_changed: correctable({
    ...contextBase,
    contextType: choice("context_changed"),
    context,
    shade
  }),
  water_start: correctable(
    {
      ...contextBase,
      contextType: choice("water_start"),
      activityIntervalId: idRule,
      zoneInstanceIds: nonemptyIds,
      startConfidence: choice("confirmed", "unknown"),
      activityStartedAt: nullable(utc)
    },
    (value) =>
      (value.startConfidence === "confirmed") ===
        (value.activityStartedAt !== null) &&
      (value.activityStartedAt === null ||
        Date.parse(value.activityStartedAt as string) <=
          Date.parse(value.effectiveOccurredAt as string))
  ),
  water_end: correctable({
    ...contextBase,
    contextType: choice("water_end"),
    activityIntervalId: idRule,
    zoneInstanceIds: nonemptyIds,
    endedAt: utc
  })
};
const ordinaryCause = correctable({
  ...contextBase,
  contextType: choice("heavy_sweat", "towel", "friction", "hand_wash"),
  zoneInstanceIds: nonemptyIds
});
const contextEvent: Rule = (value) => {
  if (!isObject(value) || typeof value.contextType !== "string")
    return invalid();
  return (
    Object.hasOwn(contextVariants, value.contextType)
      ? contextVariants[value.contextType]!
      : ordinaryCause
  )(value);
};
const primaryAction = object({
  presentationType: choice("timed_ring", "due_card", "untimed_action_card"),
  variant: nullable(choice("label_wait", "multi_action", "neutral_physical")),
  actionKind: choice(
    "recalibrate_clock",
    "view_conservative_reminder",
    "view_ended_state",
    "switch_protection",
    "complete_protection_record",
    "confirm_protection_method",
    "view_protection_options",
    "resolve_water_start",
    "resolve_cause",
    "record_reapplication",
    "view_product_label",
    "report_context_event",
    "review_required_zones"
  ),
  affectedZoneInstanceIds: ids,
  actionAt: nullable(utc),
  reasonCodes: list(
    choice(
      "CLOCK_UNTRUSTED",
      "PRODUCT_EXPIRED",
      "PRODUCT_ABNORMAL_REPORTED",
      "PRODUCT_DISCOMFORT_REPORTED",
      "PRODUCT_NO_SUNSCREEN_CLAIM",
      "PRODUCT_IDENTITY_UNKNOWN",
      "METHOD_UNRECORDED",
      "METHOD_NONE_REPORTED",
      "METHOD_UNKNOWN",
      "WATER_START_UNKNOWN",
      "WATER_RESISTANCE_UNKNOWN",
      "WATER_ENDED",
      "HEAVY_SWEAT_REPORTED",
      "TOWEL_REPORTED",
      "FRICTION_REPORTED",
      "HAND_WASH_REPORTED",
      "GENERAL_INTERVAL_REACHED",
      "WATER_INTERVAL_REACHED",
      "LABEL_WAIT_ACTIVE",
      "CLOTHING_COVERED",
      "SESSION_ENDED"
    )
  ),
  derivedFromEventRefs: ids
});
const session = object({
  id: idRule,
  rulesetVersion: ruleset,
  setupEntryMode: setupMode,
  presetDecision: preset,
  suggestedPresetVersion: nullable(idRule),
  startedAt: utc,
  endedAt: (value) => (value === null ? null : invalid()),
  endedReason: optionalNull(endedReason),
  overallStatus: choice("tracking", "attention_required"),
  sessionNextDueAt: nullable(utc),
  primaryAction,
  derivedFromEventRefs: ids,
  revision: positive,
  updatedAt: utc
});
const activePayload = object({
  session,
  eventStream: object({
    sessionStarted,
    zoneMethodEvents: list(zoneMethod),
    zoneTrackingEvents: list(zoneTracking),
    applicationConfirmationGroups: list(confirmationGroup),
    applicationEvents: list(application),
    productSafetyEvents: list(productSafety),
    contextEvents: list(contextEvent),
    // All ended events are forbidden for an active session, including malformed ones.
    sessionEndedEvents: (value) =>
      Array.isArray(value) && value.length === 0 ? [] : invalid()
  })
});
const selectedRegionPayload = object({
  schemaVersion: choice("region-preference-v1"),
  mode: choice("selected"),
  selection: object({
    regionCode: idRule,
    displayName: textRule(1, 100),
    countyCode: idRule,
    countyName: textRule(1, 50),
    townName: textRule(1, 50),
    boundaryDataVersion: idRule,
    selectionMethod: choice("device_location", "manual")
  })
});
const skippedRegionPayload = object({
  schemaVersion: choice("region-preference-v1"),
  mode: choice("skipped"),
  skippedAt: utc
});
const booleanRule: Rule = (value) =>
  typeof value === "boolean" ? value : invalid();
const preferencesPayload = object({
  schemaVersion: choice("user-preferences-v1"),
  reminderFrequencyMinutes: optionalNull(numberRule(1, 120)),
  soundEnabled: defaulted(booleanRule, false),
  vibrationEnabled: defaulted(booleanRule, false)
});

function validateActiveSession(
  key: SyncRecordKey,
  payload: Record<string, unknown>
): void {
  const session = asObject(payload.session, "payload.session");
  if (session.id !== key.recordId || !isObject(payload.eventStream)) {
    throw new SyncValidationError("active session payload 不一致", "payload");
  }
  if (Object.prototype.hasOwnProperty.call(session, "ownerKey")) {
    throw new SyncValidationError(
      "active session 不得上傳 ownerKey",
      "payload.session.ownerKey"
    );
  }
  if (session.endedAt !== null || session.overallStatus === "ended") {
    throw new SyncValidationError(
      "active session 不得是已結束狀態",
      "payload.session.endedAt"
    );
  }
  const stream = asObject(payload.eventStream, "payload.eventStream");
  const started = asObject(
    stream.sessionStarted,
    "payload.eventStream.sessionStarted"
  );
  if (started.sessionId !== key.recordId) {
    throw new SyncValidationError(
      "事件流 sessionId 不一致",
      "payload.eventStream.sessionStarted.sessionId"
    );
  }
  if (
    !Array.isArray(stream.sessionEndedEvents) ||
    stream.sessionEndedEvents.length > 0
  ) {
    throw new SyncValidationError(
      "active session 不得含有結束事件",
      "payload.eventStream.sessionEndedEvents"
    );
  }
}

function toTombstone(row: SyncTombstoneRow): SyncTombstone {
  const key = parseOwnedRecordKey({
    recordKind: row.record_kind,
    recordId: row.record_id
  });
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
    throw new SyncValidationError(
      "sync schema version 不正確",
      "schemaVersion"
    );
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

function assertId(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.trim().length > 200
  ) {
    throw new SyncValidationError(`${field} 格式不正確`, field);
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
  if (!isObject(value))
    throw new SyncValidationError(`${field} 必須是物件`, field);
  return value;
}

function asArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value))
    throw new SyncValidationError(`${field} 必須是陣列`, field);
  return value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRecordKind(value: unknown): value is SyncRecordKind {
  return (
    typeof value === "string" &&
    (RECORD_KINDS as readonly string[]).includes(value)
  );
}
