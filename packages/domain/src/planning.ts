import type {
  ApplicationConfirmationGroupV1,
  ApplicationEventV1,
  ContextEventV1,
  EndSessionCommandV1,
  ProtectionSessionRecord,
  ReducerClock,
  SessionEndedEventV1,
  SessionEventStreamV1,
  SessionProjection,
  StartSessionCommandV1,
  ZoneMethodEventV1,
  ZoneTrackingEventV1
} from "@sunshield/contracts";
import {
  EVENT_SCHEMA_VERSION,
  StartSessionCommandV1Schema
} from "@sunshield/contracts";
import { reduceSession } from "./reducer";

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
