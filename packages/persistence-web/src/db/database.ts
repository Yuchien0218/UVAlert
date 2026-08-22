import Dexie, { type Table } from "dexie";
import type {
  ActiveSessionLockRecord,
  ApplicationConfirmationGroupV1,
  ApplicationEventV1,
  ClientSequenceRecord,
  CommandReceiptRecord,
  ContextEventV1,
  FiveDayUvForecast,
  ProductSafetyEventV1,
  ProductCatalogRecordV1,
  ProtectionSessionRecord,
  SessionEndedEventV1,
  SessionStartedEventV1,
  SetupDraftV1,
  SyncRecordKind,
  ZoneIdentityLockRecord,
  ZoneMethodEventV1,
  ZoneProjection,
  ZoneTrackingEventV1
} from "@sunshield/contracts";

export const DEFAULT_DATABASE_NAME = "sunshield-advisor-p0";

export type WeatherSnapshotRecord = {
  id: string;
  regionId: string;
  sourceKind: string;
  fetchedAt: string;
  usableUntil: string;
  payload?: FiveDayUvForecast;
};

export type ClockCalibrationRecord = {
  calibrationRequestId: string;
  status: string;
  calibratedAtUtc: string;
};

export type ConsentRecord = {
  id: string;
  purpose: string;
  policyVersion: string;
  occurredAt: string;
};

export type LocalReminderPresentationPreferenceRecord = {
  deviceLocalId: string;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
};

export type AppMetadataRecord = {
  key: string;
  value: string;
};

export type CorrectionSuccessorRecord = {
  targetRef: string;
  successorId: string;
};

export type ProjectionChecksumRecord = {
  sessionId: string;
  revision: number;
  checksum: string;
};

export type SyncMetadataRecord = {
  recordKind: SyncRecordKind;
  recordId: string;
  localPayloadFingerprint: string | null;
  localRevision: number;
  cloudRevision: number | null;
  lastSyncedAt: string | null;
  tombstone: boolean;
  deletedAt: string | null;
};

export class SunshieldDatabase extends Dexie {
  SunscreenProducts!: Table<ProductCatalogRecordV1, string>;
  ProtectionSessions!: Table<ProtectionSessionRecord, string>;
  ProtectionZoneStates!: Table<ZoneProjection, [string, string]>;
  SessionStartedEvents!: Table<SessionStartedEventV1, string>;
  ZoneTrackingEvents!: Table<ZoneTrackingEventV1, string>;
  ZoneMethodEvents!: Table<ZoneMethodEventV1, string>;
  ApplicationConfirmationGroups!: Table<
    ApplicationConfirmationGroupV1,
    string
  >;
  ApplicationEvents!: Table<ApplicationEventV1, string>;
  ProductSafetyEvents!: Table<ProductSafetyEventV1, string>;
  ContextEvents!: Table<ContextEventV1, string>;
  SessionEndedEvents!: Table<SessionEndedEventV1, string>;
  WeatherSnapshots!: Table<WeatherSnapshotRecord, string>;
  ClockCalibration!: Table<ClockCalibrationRecord, string>;
  SetupDrafts!: Table<SetupDraftV1, string>;
  ConsentRecords!: Table<ConsentRecord, string>;
  LocalReminderPresentationPreferences!: Table<
    LocalReminderPresentationPreferenceRecord,
    string
  >;
  AppMetadata!: Table<AppMetadataRecord, string>;
  ActiveSessionLocks!: Table<ActiveSessionLockRecord, string>;
  ClientSequences!: Table<ClientSequenceRecord, [string, string]>;
  CommandReceipts!: Table<CommandReceiptRecord, string>;
  CorrectionSuccessors!: Table<CorrectionSuccessorRecord, string>;
  ZoneIdentityLocks!: Table<ZoneIdentityLockRecord, [string, string]>;
  ProjectionChecksums!: Table<ProjectionChecksumRecord, [string, number]>;
  SyncMetadata!: Table<SyncMetadataRecord, [SyncRecordKind, string]>;

  constructor(databaseName = DEFAULT_DATABASE_NAME) {
    super(databaseName);

    this.version(1).stores({
      SunscreenProducts:
        "&id, usageStatus, updatedAt, [usageStatus+updatedAt]",
      ProtectionSessions:
        "&id, ownerKey, overallStatus, startedAt, endedAt, revision",
      ProtectionZoneStates:
        "[sessionId+zoneInstanceId], sessionId, bodyZoneCode, timingStatus, zoneDueAt",
      SessionStartedEvents:
        "&id, sessionId, [sessionId+effectiveOccurredAt], idempotencyKey",
      ZoneTrackingEvents:
        "&id, sessionId, zoneInstanceId, correctionOfEventId",
      ZoneMethodEvents:
        "&id, sessionId, zoneInstanceId, correctionOfEventId",
      ApplicationConfirmationGroups:
        "&id, sessionId, correctionOfGroupId, appliedAt",
      ApplicationEvents:
        "&id, sessionId, applicationConfirmationId, *zoneInstanceIds, appliedAt",
      ProductSafetyEvents:
        "&id, sessionId, sourceProductId, productSnapshotFingerprint",
      ContextEvents:
        "&id, sessionId, contextType, activityIntervalId, correctionOfEventId",
      SessionEndedEvents: "&id, &sessionId, effectiveOccurredAt",
      WeatherSnapshots:
        "&id, regionId, sourceKind, fetchedAt, usableUntil",
      ClockCalibration:
        "&calibrationRequestId, status, calibratedAtUtc",
      SetupDrafts: "&id, localDraftFlowId, expiresAt, updatedAt",
      ConsentRecords: "&id, purpose, policyVersion, occurredAt",
      LocalReminderPresentationPreferences: "&deviceLocalId",
      AppMetadata: "&key",
      ActiveSessionLocks: "&ownerKey, &sessionId",
      ClientSequences: "[deviceLocalId+sessionId], lastSequence",
      CommandReceipts: "&idempotencyKey, sessionId, createdAt",
      CorrectionSuccessors: "&targetRef, successorId",
      ZoneIdentityLocks:
        "[sessionId+bodyZoneCode], zoneInstanceId",
      ProjectionChecksums: "[sessionId+revision]"
    });

    this.version(2).stores({
      SunscreenProducts:
        "&productId, status, updatedAt, [status+updatedAt]"
    });

    this.version(3).stores({
      SyncMetadata:
        "[recordKind+recordId], recordKind, recordId, cloudRevision, lastSyncedAt, tombstone"
    });
  }
}
