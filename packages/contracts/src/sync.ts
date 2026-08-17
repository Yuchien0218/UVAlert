import { z } from "zod";
import {
  NonEmptyIdSchema,
  UtcInstantSchema
} from "./common";
import { SessionEventStreamV1Schema } from "./events";
import {
  ProductCatalogRecordV1Schema,
} from "./product";
import type { ProductCatalogRecordV1 } from "./product";
import {
  ProtectionSessionRecordSchema,
} from "./records";
import type { ProtectionSessionRecord } from "./records";
import { RegionPreferenceV1Schema } from "./weather";

export const SYNC_SCHEMA_VERSION = "sync-v1" as const;
export const USER_PREFERENCES_SCHEMA_VERSION = "user-preferences-v1" as const;

export const SyncRecordKindSchema = z.enum([
  "active_session",
  "product_catalog",
  "region_preference",
  "user_preferences"
]);

export type SyncRecordKind = z.infer<typeof SyncRecordKindSchema>;

export const UserPreferencesV1Schema = z.object({
  schemaVersion: z.literal(USER_PREFERENCES_SCHEMA_VERSION),
  appearance: z.enum(["light", "dark", "system"]).default("system"),
  reminderFrequencyMinutes: z
    .number()
    .int()
    .min(1)
    .max(120)
    .nullable()
    .default(null),
  soundEnabled: z.boolean().default(false),
  vibrationEnabled: z.boolean().default(false)
});

export type UserPreferencesV1 = z.infer<typeof UserPreferencesV1Schema>;

/**
 * The local ownerKey contains a device-local visitor identifier. It is
 * deliberately omitted from the cloud envelope and reconstructed locally
 * after a successful download.
 */
export const CloudProtectionSessionRecordSchema =
  ProtectionSessionRecordSchema.omit({ ownerKey: true });

export const ActiveSessionSyncPayloadSchema = z.object({
  session: CloudProtectionSessionRecordSchema,
  eventStream: SessionEventStreamV1Schema
});

export type ActiveSessionSyncPayload = z.infer<
  typeof ActiveSessionSyncPayloadSchema
>;

const SyncRecordBaseSchema = z.object({
  schemaVersion: z.literal(SYNC_SCHEMA_VERSION),
  recordId: NonEmptyIdSchema,
  revision: z.number().int().positive(),
  payloadFingerprint: NonEmptyIdSchema,
  updatedAt: UtcInstantSchema
});

export const ActiveSessionSyncRecordSchema = SyncRecordBaseSchema.extend({
  recordKind: z.literal("active_session"),
  payload: ActiveSessionSyncPayloadSchema
});

export const ProductCatalogSyncRecordSchema = SyncRecordBaseSchema.extend({
  recordKind: z.literal("product_catalog"),
  payload: ProductCatalogRecordV1Schema
});

export const RegionPreferenceSyncRecordSchema = SyncRecordBaseSchema.extend({
  recordKind: z.literal("region_preference"),
  payload: RegionPreferenceV1Schema
});

export const UserPreferencesSyncRecordSchema = SyncRecordBaseSchema.extend({
  recordKind: z.literal("user_preferences"),
  payload: UserPreferencesV1Schema
});

export const SyncRecordEnvelopeV1Schema = z.discriminatedUnion("recordKind", [
  ActiveSessionSyncRecordSchema,
  ProductCatalogSyncRecordSchema,
  RegionPreferenceSyncRecordSchema,
  UserPreferencesSyncRecordSchema
]);

export type SyncRecordEnvelopeV1 = z.infer<
  typeof SyncRecordEnvelopeV1Schema
>;

export const SyncRecordKeySchema = z.object({
  recordKind: SyncRecordKindSchema,
  recordId: NonEmptyIdSchema
});

export type SyncRecordKey = z.infer<typeof SyncRecordKeySchema>;

export const SyncRecordSummaryV1Schema = SyncRecordKeySchema.extend({
  schemaVersion: z.literal(SYNC_SCHEMA_VERSION),
  revision: z.number().int().positive(),
  payloadFingerprint: NonEmptyIdSchema,
  updatedAt: UtcInstantSchema
});

export type SyncRecordSummaryV1 = z.infer<
  typeof SyncRecordSummaryV1Schema
>;

export const SyncTombstoneV1Schema = SyncRecordKeySchema.extend({
  schemaVersion: z.literal(SYNC_SCHEMA_VERSION),
  revision: z.number().int().positive(),
  deletedAt: UtcInstantSchema
});

export type SyncTombstoneV1 = z.infer<typeof SyncTombstoneV1Schema>;

export const SyncManifestV1Schema = z.object({
  schemaVersion: z.literal(SYNC_SCHEMA_VERSION),
  records: z.array(SyncRecordSummaryV1Schema).max(1000),
  tombstones: z.array(SyncTombstoneV1Schema).max(1000),
  fetchedAt: UtcInstantSchema
});

export type SyncManifestV1 = z.infer<typeof SyncManifestV1Schema>;

export const SyncReadRequestV1Schema = z.object({
  schemaVersion: z.literal(SYNC_SCHEMA_VERSION),
  recordKeys: z.array(SyncRecordKeySchema).max(1000)
});

export type SyncReadRequestV1 = z.infer<typeof SyncReadRequestV1Schema>;

export const SyncReadResponseV1Schema = z.object({
  schemaVersion: z.literal(SYNC_SCHEMA_VERSION),
  records: z.array(SyncRecordEnvelopeV1Schema).max(1000),
  tombstones: z.array(SyncTombstoneV1Schema).max(1000)
});

export type SyncReadResponseV1 = z.infer<typeof SyncReadResponseV1Schema>;

export const SyncCommitRecordV1Schema = z.object({
  record: SyncRecordEnvelopeV1Schema,
  expectedRevision: z.number().int().nonnegative().nullable()
});

export type SyncCommitRecordV1 = z.infer<
  typeof SyncCommitRecordV1Schema
>;

export const SyncCommitTombstoneV1Schema = z.object({
  tombstone: SyncTombstoneV1Schema,
  expectedRevision: z.number().int().nonnegative().nullable()
});

export type SyncCommitTombstoneV1 = z.infer<
  typeof SyncCommitTombstoneV1Schema
>;

export const SyncCommitRequestV1Schema = z.object({
  schemaVersion: z.literal(SYNC_SCHEMA_VERSION),
  idempotencyKey: NonEmptyIdSchema.max(160),
  records: z.array(SyncCommitRecordV1Schema).max(1000),
  tombstones: z.array(SyncCommitTombstoneV1Schema).max(1000)
});

export type SyncCommitRequestV1 = z.infer<
  typeof SyncCommitRequestV1Schema
>;

export const SyncCommitResultV1Schema = z.object({
  schemaVersion: z.literal(SYNC_SCHEMA_VERSION),
  committedRecords: z.array(SyncRecordSummaryV1Schema).max(1000),
  committedTombstones: z.array(SyncTombstoneV1Schema).max(1000),
  committedAt: UtcInstantSchema
});

export type SyncCommitResultV1 = z.infer<typeof SyncCommitResultV1Schema>;

export const SyncDeleteRequestV1Schema = z.object({
  schemaVersion: z.literal(SYNC_SCHEMA_VERSION),
  idempotencyKey: NonEmptyIdSchema.max(160),
  records: z.array(
    z.object({
      key: SyncRecordKeySchema,
      expectedRevision: z.number().int().positive()
    })
  ).max(1000)
});

export type SyncDeleteRequestV1 = z.infer<typeof SyncDeleteRequestV1Schema>;

export const SyncDeleteResultV1Schema = z.object({
  schemaVersion: z.literal(SYNC_SCHEMA_VERSION),
  committedTombstones: z.array(SyncTombstoneV1Schema).max(1000),
  committedAt: UtcInstantSchema
});

export type SyncDeleteResultV1 = z.infer<typeof SyncDeleteResultV1Schema>;

export const SyncConflictV1Schema = z.object({
  recordKey: SyncRecordKeySchema,
  localRevision: z.number().int().nonnegative().nullable(),
  remoteRevision: z.number().int().positive().nullable(),
  remoteSummary: SyncRecordSummaryV1Schema.nullable(),
  detectedAt: UtcInstantSchema
});

export type SyncConflictV1 = z.infer<typeof SyncConflictV1Schema>;

export type CloudSyncPayload =
  | ActiveSessionSyncPayload
  | ProductCatalogRecordV1
  | z.infer<typeof RegionPreferenceV1Schema>
  | UserPreferencesV1;

export type CloudProtectionSessionRecord = Omit<
  ProtectionSessionRecord,
  "ownerKey"
>;
