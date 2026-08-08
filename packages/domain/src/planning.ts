import type {
  ApplicationConfirmationGroupV1,
  ApplicationEventV1,
  ContextEventV1,
  EndSessionCommandV1,
  ProtectionSessionRecord,
  ReapplyCommandV1,
  ReducerClock,
  ReportContextEventCommandV1,
  SessionEndedEventV1,
  SessionEventStreamV1,
  SessionProjection,
  StartSessionCommandV1,
  ZoneMethodEventV1,
  ZoneTrackingEventV1
} from "@sunshield/contracts";
import {
  ContextEventV1Schema,
  EVENT_SCHEMA_VERSION,
  ReapplyCommandV1Schema,
  ReportContextEventCommandV1Schema,
  StartSessionCommandV1Schema
} from "@sunshield/contracts";
import { DomainInvariantError } from "./errors";
import { reduceSession } from "./reducer";
import { validateWaterIntervals } from "./water";

export function ownerKeyFor(localVisitorId: string): string {
  return `guest:${localVisitorId}`;
}

function baseEvent(
  command: StartSessionCommandV1,
  id: string,
  effectiveOccurredAt: string
) {
  return {
    schemaVersion: EVENT_SCHEMA_VERSION,
    id,
    sessionId: command.sessionId,
    commandId: command.commandId,
    idempotencyKey: command.idempotencyKey,
    effectiveOccurredAt,
    clientCreatedAt: command.clientCreatedAt,
    clientSequence: command.clientSequence,
    localAppliedSequence: command.clientSequence
  } as const;
}

export type StartSessionPlan = {
  stream: SessionEventStreamV1;
  session: ProtectionSessionRecord;
  projection: SessionProjection;
  committedEventIds: string[];
};

export type ReapplicationPlan = {
  group: ApplicationConfirmationGroupV1;
  events: ApplicationEventV1[];
  stream: SessionEventStreamV1;
  session: ProtectionSessionRecord;
  projection: SessionProjection;
  committedEventIds: string[];
};

export function planReapplication(
  rawCommand: ReapplyCommandV1,
  currentStream: SessionEventStreamV1,
  currentSession: ProtectionSessionRecord,
  clock: ReducerClock
): ReapplicationPlan {
  const command = ReapplyCommandV1Schema.parse(rawCommand);
  const revision = currentSession.revision + 1;
  const eventBase = (id: string) => ({
    schemaVersion: EVENT_SCHEMA_VERSION,
    id,
    sessionId: command.sessionId,
    commandId: command.commandId,
    idempotencyKey: command.idempotencyKey,
    effectiveOccurredAt: command.payload.appliedAt,
    clientCreatedAt: command.clientCreatedAt,
    clientSequence: command.clientSequence,
    localAppliedSequence: command.clientSequence
  });
  const group: ApplicationConfirmationGroupV1 = {
    ...eventBase(command.payload.applicationConfirmationId),
    eventType: "application_confirmation_group",
    appliedAt: command.payload.appliedAt,
    confirmedZoneInstanceIds: command.payload.applications.flatMap(
      (application) => application.zoneInstanceIds
    ),
    correctionAction: "create",
    correctionOfGroupId: null
  };
  const events: ApplicationEventV1[] = command.payload.applications.map(
    (application) => ({
      ...eventBase(application.eventId),
      eventType: "application_recorded",
      applicationConfirmationId: group.id,
      zoneInstanceIds: application.zoneInstanceIds,
      appliedAt: command.payload.appliedAt,
      sourceProductId: application.sourceProductId,
      productSnapshotFingerprint: application.productSnapshotFingerprint,
      productLabelSnapshot: application.productLabelSnapshot
    })
  );
  const stream: SessionEventStreamV1 = {
    ...currentStream,
    applicationConfirmationGroups: [
      ...currentStream.applicationConfirmationGroups,
      group
    ],
    applicationEvents: [...currentStream.applicationEvents, ...events]
  };
  const projection = reduceSession({ stream, revision, clock });
  const session: ProtectionSessionRecord = {
    ...currentSession,
    overallStatus: projection.overallStatus,
    sessionNextDueAt: projection.sessionNextDueAt,
    primaryAction: projection.primaryAction,
    derivedFromEventRefs: projection.derivedFromEventRefs,
    revision,
    updatedAt: clock.trustedNow
  };
  return {
    group,
    events,
    stream,
    session,
    projection,
    committedEventIds: [group.id, ...events.map((event) => event.id)]
  };
}

export type ContextEventPlan = {
  event: ContextEventV1;
  stream: SessionEventStreamV1;
  session: ProtectionSessionRecord;
  projection: SessionProjection;
  committedEventIds: string[];
};

/**
 * S-09 回報狀況。
 *
 * 水上區間的合法性交給 `validateWaterIntervals` 在合併後的事件流上重驗，
 * 而不是只看這一筆命令：重疊起點與孤兒離水都只有放進既有事件流才看得出來。
 * 契約層的 superRefine 已擋掉結構性錯誤（未來時間、起點晚於事件）。
 */
export function planContextEvent(
  rawCommand: ReportContextEventCommandV1,
  currentStream: SessionEventStreamV1,
  currentSession: ProtectionSessionRecord,
  clock: ReducerClock
): ContextEventPlan {
  const command = ReportContextEventCommandV1Schema.parse(rawCommand);
  const { detail, effectiveOccurredAt } = command.payload;

  if (Date.parse(effectiveOccurredAt) > Date.parse(clock.trustedNow)) {
    throw new DomainInvariantError(
      "FUTURE_EVENT",
      "事件發生時間不得位於未來"
    );
  }

  const revision = currentSession.revision + 1;
  const envelope = {
    schemaVersion: EVENT_SCHEMA_VERSION,
    id: command.payload.eventId,
    sessionId: command.sessionId,
    commandId: command.commandId,
    idempotencyKey: command.idempotencyKey,
    effectiveOccurredAt,
    clientCreatedAt: command.clientCreatedAt,
    clientSequence: command.clientSequence,
    localAppliedSequence: command.clientSequence,
    eventType: "context_event",
    correctionAction: "create",
    correctionOfEventId: null
  } as const;

  const event = ContextEventV1Schema.parse({ ...envelope, ...detail });
  const contextEvents = [...currentStream.contextEvents, event];

  // 併入後才驗證，孤兒離水與重疊區間都會在這裡被擋下。
  validateWaterIntervals(contextEvents, clock.trustedNow);

  const stream: SessionEventStreamV1 = { ...currentStream, contextEvents };
  const projection = reduceSession({ stream, revision, clock });
  const session: ProtectionSessionRecord = {
    ...currentSession,
    overallStatus: projection.overallStatus,
    sessionNextDueAt: projection.sessionNextDueAt,
    primaryAction: projection.primaryAction,
    derivedFromEventRefs: projection.derivedFromEventRefs,
    revision,
    updatedAt: clock.trustedNow
  };

  return {
    event,
    stream,
    session,
    projection,
    committedEventIds: [event.id]
  };
}

export function planStartSession(
  rawCommand: StartSessionCommandV1,
  clock: ReducerClock
): StartSessionPlan {
  const command = StartSessionCommandV1Schema.parse(rawCommand);
  const payload = command.payload;
  const sessionStarted = {
    ...baseEvent(
      command,
      payload.sessionStartedEventId,
      payload.effectiveStartedAt
    ),
    eventType: "session_started" as const,
    rulesetVersion: payload.rulesetVersion,
    bodyZoneSchemaVersion: payload.bodyZoneSchemaVersion,
    setupEntryMode: payload.setupEntryMode,
    presetDecision: payload.presetDecision,
    suggestedPresetVersion: payload.suggestedPresetVersion,
    effectiveStartedAt: payload.effectiveStartedAt,
    initialContext: payload.initialContext,
    initialShade: payload.initialShade,
    zoneInstanceIds: payload.zones.map((zone) => zone.zoneInstanceId)
  };

  const zoneMethodEvents: ZoneMethodEventV1[] = payload.zones.map((zone) => ({
    ...baseEvent(command, zone.methodEventId, payload.effectiveStartedAt),
    eventType: "zone_method",
    zoneInstanceId: zone.zoneInstanceId,
    bodyZoneCode: zone.bodyZoneCode,
    customLabel: zone.customLabel,
    skinExposureStatus: zone.skinExposureStatus,
    methodCertainty: zone.methodCertainty,
    methodComponents: zone.methodComponents,
    correctionAction: "create",
    correctionOfEventId: null
  }));
  const zoneTrackingEvents: ZoneTrackingEventV1[] = payload.zones.map(
    (zone) => ({
      ...baseEvent(command, zone.trackingEventId, payload.effectiveStartedAt),
      eventType: "zone_tracking",
      zoneInstanceId: zone.zoneInstanceId,
      trackingStatus: "active",
      correctionAction: "create",
      correctionOfEventId: null
    })
  );

  const applicationConfirmationGroups: ApplicationConfirmationGroupV1[] =
    payload.applicationGroup === null
      ? []
      : [
          {
            ...baseEvent(
              command,
              payload.applicationGroup.groupId,
              payload.applicationGroup.appliedAt
            ),
            eventType: "application_confirmation_group",
            appliedAt: payload.applicationGroup.appliedAt,
            confirmedZoneInstanceIds:
              payload.applicationGroup.applications.flatMap(
                (application) => application.zoneInstanceIds
              ),
            correctionAction: "create",
            correctionOfGroupId: null
          }
        ];
  const applicationEvents: ApplicationEventV1[] =
    payload.applicationGroup?.applications.map((application) => ({
      ...baseEvent(
        command,
        application.eventId,
        payload.applicationGroup!.appliedAt
      ),
      eventType: "application_recorded",
      applicationConfirmationId: payload.applicationGroup!.groupId,
      zoneInstanceIds: application.zoneInstanceIds,
      appliedAt: payload.applicationGroup!.appliedAt,
      sourceProductId: application.sourceProductId,
      productSnapshotFingerprint: application.productSnapshotFingerprint,
      productLabelSnapshot: application.productLabelSnapshot
    })) ?? [];

  const contextEvents: ContextEventV1[] =
    payload.waterStart === null
      ? []
      : [
          {
            ...baseEvent(
              command,
              payload.waterStart.eventId,
              payload.waterStart.effectiveOccurredAt
            ),
            eventType: "context_event",
            contextType: "water_start",
            activityIntervalId: payload.waterStart.activityIntervalId,
            zoneInstanceIds: payload.waterStart.zoneInstanceIds,
            startConfidence: payload.waterStart.startConfidence,
            activityStartedAt: payload.waterStart.activityStartedAt,
            correctionAction: "create",
            correctionOfEventId: null
          }
        ];

  const stream: SessionEventStreamV1 = {
    sessionStarted,
    zoneMethodEvents,
    zoneTrackingEvents,
    applicationConfirmationGroups,
    applicationEvents,
    productSafetyEvents: [],
    contextEvents,
    sessionEndedEvents: []
  };
  const projection = reduceSession({ stream, revision: 1, clock });
  const session: ProtectionSessionRecord = {
    id: command.sessionId,
    ownerKey: ownerKeyFor(command.owner.localVisitorId),
    rulesetVersion: payload.rulesetVersion,
    setupEntryMode: payload.setupEntryMode,
    presetDecision: payload.presetDecision,
    suggestedPresetVersion: payload.suggestedPresetVersion,
    startedAt: payload.effectiveStartedAt,
    endedAt: null,
    endedReason: null,
    overallStatus: projection.overallStatus,
    sessionNextDueAt: projection.sessionNextDueAt,
    primaryAction: projection.primaryAction,
    derivedFromEventRefs: projection.derivedFromEventRefs,
    revision: 1,
    updatedAt: clock.trustedNow
  };

  return {
    stream,
    session,
    projection,
    committedEventIds: [
      sessionStarted.id,
      ...zoneMethodEvents.map((event) => event.id),
      ...zoneTrackingEvents.map((event) => event.id),
      ...applicationConfirmationGroups.map((group) => group.id),
      ...applicationEvents.map((event) => event.id),
      ...contextEvents.map((event) => event.id)
    ]
  };
}

export function makeSessionEndedEvent(
  command: EndSessionCommandV1
): SessionEndedEventV1 {
  return {
    schemaVersion: EVENT_SCHEMA_VERSION,
    id: command.payload.sessionEndedEventId,
    sessionId: command.sessionId,
    commandId: command.commandId,
    idempotencyKey: command.idempotencyKey,
    effectiveOccurredAt: command.payload.effectiveOccurredAt,
    clientCreatedAt: command.clientCreatedAt,
    clientSequence: command.clientSequence,
    localAppliedSequence: command.clientSequence,
    eventType: "session_ended",
    endedAt: command.payload.effectiveOccurredAt,
    endedReason: command.payload.endedReason
  };
}
