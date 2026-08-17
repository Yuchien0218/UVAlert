import {
  planStartSession,
  type StartSessionPlan
} from "@sunshield/domain";
import {
  SYNC_SCHEMA_VERSION,
  SyncRecordEnvelopeV1Schema,
  SyncTombstoneV1Schema,
  type SyncRecordEnvelopeV1,
  type SyncTombstoneV1
} from "@sunshield/contracts";
import { makeClock, makeStartSessionCommand } from "./index";

function makeStartPlan(): StartSessionPlan {
  return planStartSession(
    makeStartSessionCommand({ idPrefix: "sync-fixture" }),
    makeClock()
  );
}

export function makeActiveSessionRecord(
  overrides: Partial<SyncRecordEnvelopeV1> = {}
): SyncRecordEnvelopeV1 {
  const plan = makeStartPlan();
  const { ownerKey: _ownerKey, ...cloudSession } = plan.session;
  return SyncRecordEnvelopeV1Schema.parse({
    schemaVersion: SYNC_SCHEMA_VERSION,
    recordKind: "active_session",
    recordId: plan.session.id,
    revision: 3,
    payloadFingerprint: "active-session-fingerprint",
    updatedAt: plan.session.updatedAt,
    payload: {
      session: cloudSession,
      eventStream: plan.stream
    },
    ...overrides
  });
}

export function makeTombstone(
  overrides: Partial<SyncTombstoneV1> = {}
): SyncTombstoneV1 {
  return SyncTombstoneV1Schema.parse({
    schemaVersion: SYNC_SCHEMA_VERSION,
    recordKind: "product_catalog",
    recordId: "product-1",
    revision: 4,
    deletedAt: "2026-07-29T11:00:00.000Z",
    ...overrides
  });
}
