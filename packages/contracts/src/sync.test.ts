import { describe, expect, it } from "vitest";
import {
  SYNC_SCHEMA_VERSION,
  SyncRecordEnvelopeV1Schema,
  SyncTombstoneV1Schema
} from "./sync";

function makeActiveSessionRecord() {
  return {
    schemaVersion: SYNC_SCHEMA_VERSION,
    recordKind: "active_session" as const,
    recordId: "session-sync-fixture",
    revision: 3,
    payloadFingerprint: "active-session-fingerprint",
    updatedAt: "2026-07-29T11:00:00.000Z",
    payload: {
      session: {
        id: "session-sync-fixture",
        rulesetVersion: "ruleset-v1",
        setupEntryMode: "quick_preset" as const,
        presetDecision: "accepted" as const,
        suggestedPresetVersion: "BODY_ZONE_PRESET_V3@1",
        startedAt: "2026-07-29T10:00:00.000Z",
        endedAt: null,
        endedReason: null,
        overallStatus: "tracking" as const,
        sessionNextDueAt: null,
        primaryAction: {
          presentationType: "timed_ring" as const,
          variant: null,
          actionKind: "record_reapplication" as const,
          affectedZoneInstanceIds: ["zone-face"],
          actionAt: null,
          reasonCodes: ["GENERAL_INTERVAL_REACHED" as const],
          derivedFromEventRefs: ["session-started"]
        },
        derivedFromEventRefs: ["session-started"],
        revision: 1,
        updatedAt: "2026-07-29T11:00:00.000Z"
      },
      eventStream: {
        sessionStarted: {
          schemaVersion: "1.0.0",
          id: "session-started",
          sessionId: "session-sync-fixture",
          commandId: "start-command",
          idempotencyKey: "start-idempotency",
          effectiveOccurredAt: "2026-07-29T10:00:00.000Z",
          clientCreatedAt: "2026-07-29T10:00:00.000Z",
          clientSequence: 1,
          localAppliedSequence: 1,
          eventType: "session_started" as const,
          rulesetVersion: "ruleset-v1",
          bodyZoneSchemaVersion: "BODY_ZONE_V3",
          setupEntryMode: "quick_preset" as const,
          presetDecision: "accepted" as const,
          suggestedPresetVersion: "BODY_ZONE_PRESET_V3@1",
          effectiveStartedAt: "2026-07-29T10:00:00.000Z",
          initialContext: "outdoor_general" as const,
          initialShade: "none" as const,
          zoneInstanceIds: ["zone-face"]
        },
        zoneMethodEvents: [],
        zoneTrackingEvents: [],
        applicationConfirmationGroups: [],
        applicationEvents: [],
        productSafetyEvents: [],
        contextEvents: [],
        sessionEndedEvents: []
      }
    }
  };
}

function makeTombstone() {
  return {
    schemaVersion: SYNC_SCHEMA_VERSION,
    recordKind: "product_catalog" as const,
    recordId: "product-1",
    revision: 4,
    deletedAt: "2026-07-29T11:00:00.000Z"
  };
}

describe("sync contracts", () => {
  it("accepts an active session record with a per-record revision", () => {
    const parsed = SyncRecordEnvelopeV1Schema.parse(makeActiveSessionRecord());

    expect(parsed.recordKind).toBe("active_session");
    expect(parsed.revision).toBe(3);
  });

  it("rejects a payload whose record kind and payload schema disagree", () => {
    expect(() =>
      SyncRecordEnvelopeV1Schema.parse({
        recordKind: "region_preference",
        recordId: "region-1",
        schemaVersion: "sync-v1",
        revision: 1,
        payloadFingerprint: "fingerprint-1",
        updatedAt: "2026-07-29T10:00:00.000Z",
        payload: { schemaVersion: "not-a-region" }
      })
    ).toThrow();
  });

  it("accepts a tombstone without a payload", () => {
    expect(SyncTombstoneV1Schema.parse(makeTombstone())).toMatchObject({
      recordId: "product-1",
      revision: 4
    });
  });
});
