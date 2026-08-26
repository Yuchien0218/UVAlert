import { z } from "zod";
import {
  BodyZoneCodeSchema,
  CorrectableEventEnvelopeSchema,
  EventEnvelopeSchema,
  MethodCertaintySchema,
  MethodComponentSchema,
  NonEmptyIdSchema,
  PresetDecisionSchema,
  SessionEndedReasonSchema,
  SessionContextSchema,
  SetupEntryModeSchema,
  ShadeStatusSchema,
  SkinExposureStatusSchema,
  TrackingStatusSchema,
  UtcInstantSchema
} from "./common";
import { ProductLabelSnapshotV1Schema } from "./product";
import { BODY_ZONE_SCHEMA_VERSION, EVENT_SCHEMA_VERSION } from "./versions";

export const SessionStartedEventV1Schema = EventEnvelopeSchema.extend({
  schemaVersion: z.literal(EVENT_SCHEMA_VERSION),
  eventType: z.literal("session_started"),
  rulesetVersion: z.string().min(1),
  bodyZoneSchemaVersion: z.literal(BODY_ZONE_SCHEMA_VERSION),
  setupEntryMode: SetupEntryModeSchema,
  presetDecision: PresetDecisionSchema,
  suggestedPresetVersion: NonEmptyIdSchema.nullable(),
  effectiveStartedAt: UtcInstantSchema,
  initialContext: SessionContextSchema,
  initialShade: ShadeStatusSchema,
  zoneInstanceIds: z.array(NonEmptyIdSchema).min(1)
});

export const ZoneMethodEventV1Schema =
  CorrectableEventEnvelopeSchema.safeExtend({
    schemaVersion: z.literal(EVENT_SCHEMA_VERSION),
    eventType: z.literal("zone_method"),
    zoneInstanceId: NonEmptyIdSchema,
    bodyZoneCode: BodyZoneCodeSchema,
    customLabel: z.string().trim().min(1).max(80).nullable().default(null),
    skinExposureStatus: SkinExposureStatusSchema,
    methodCertainty: MethodCertaintySchema,
    methodComponents: z.array(MethodComponentSchema)
  });

export const ZoneTrackingEventV1Schema =
  CorrectableEventEnvelopeSchema.safeExtend({
    schemaVersion: z.literal(EVENT_SCHEMA_VERSION),
    eventType: z.literal("zone_tracking"),
    zoneInstanceId: NonEmptyIdSchema,
    trackingStatus: TrackingStatusSchema
  });

export const ApplicationConfirmationGroupV1Schema = EventEnvelopeSchema.extend({
  schemaVersion: z.literal(EVENT_SCHEMA_VERSION),
  eventType: z.literal("application_confirmation_group"),
  appliedAt: UtcInstantSchema,
  confirmedZoneInstanceIds: z.array(NonEmptyIdSchema).min(1),
  correctionAction: z.enum(["create", "replace", "void"]).default("create"),
  correctionOfGroupId: NonEmptyIdSchema.nullable().default(null)
}).superRefine((value, context) => {
  const needsTarget = value.correctionAction !== "create";
  if (needsTarget !== (value.correctionOfGroupId !== null)) {
    context.addIssue({
      code: "custom",
      path: ["correctionOfGroupId"],
      message: needsTarget
        ? "replace／void 必須指定 correctionOfGroupId"
        : "create 不得指定 correctionOfGroupId"
    });
  }
});

export const ApplicationEventV1Schema = EventEnvelopeSchema.extend({
  schemaVersion: z.literal(EVENT_SCHEMA_VERSION),
  eventType: z.literal("application_recorded"),
  applicationConfirmationId: NonEmptyIdSchema,
  zoneInstanceIds: z.array(NonEmptyIdSchema).min(1),
  appliedAt: UtcInstantSchema,
  sourceProductId: NonEmptyIdSchema.nullable(),
  productSnapshotFingerprint: NonEmptyIdSchema,
  productLabelSnapshot: ProductLabelSnapshotV1Schema
});

export const ProductSafetyEventV1Schema =
  CorrectableEventEnvelopeSchema.safeExtend({
    schemaVersion: z.literal(EVENT_SCHEMA_VERSION),
    eventType: z.literal("product_safety"),
    safetyKind: z.enum(["abnormal_reported", "discomfort_reported"]),
    sourceProductId: NonEmptyIdSchema.nullable(),
    productSnapshotFingerprint: NonEmptyIdSchema.nullable(),
    zoneInstanceIds: z.array(NonEmptyIdSchema).min(1)
  }).superRefine((value, context) => {
    if (
      value.sourceProductId === null &&
      value.productSnapshotFingerprint === null
    ) {
      context.addIssue({
        code: "custom",
        path: ["productSnapshotFingerprint"],
        message: "產品安全事件至少需要保存產品 ID 或 snapshot fingerprint"
      });
    }
  });

const ContextEventBaseSchema = CorrectableEventEnvelopeSchema.safeExtend({
  schemaVersion: z.literal(EVENT_SCHEMA_VERSION),
  eventType: z.literal("context_event")
});

export const ContextChangedEventV1Schema = ContextEventBaseSchema.safeExtend({
  contextType: z.literal("context_changed"),
  context: SessionContextSchema,
  shade: ShadeStatusSchema
});

export const WaterStartEventV1Schema = ContextEventBaseSchema.safeExtend({
  contextType: z.literal("water_start"),
  activityIntervalId: NonEmptyIdSchema,
  zoneInstanceIds: z.array(NonEmptyIdSchema).min(1),
  startConfidence: z.enum(["confirmed", "unknown"]),
  activityStartedAt: UtcInstantSchema.nullable()
}).superRefine((value, context) => {
  const hasConfirmedStart = value.startConfidence === "confirmed";
  if (hasConfirmedStart !== (value.activityStartedAt !== null)) {
    context.addIssue({
      code: "custom",
      path: ["activityStartedAt"],
      message: "confirmed 必須有起點；unknown 起點必須為 null"
    });
  }
  if (
    value.activityStartedAt !== null &&
    Date.parse(value.activityStartedAt) > Date.parse(value.effectiveOccurredAt)
  ) {
    context.addIssue({
      code: "custom",
      path: ["activityStartedAt"],
      message: "水上活動起點不得晚於事件發生時間"
    });
  }
});

export const WaterEndEventV1Schema = ContextEventBaseSchema.safeExtend({
  contextType: z.literal("water_end"),
  activityIntervalId: NonEmptyIdSchema,
  zoneInstanceIds: z.array(NonEmptyIdSchema).min(1),
  endedAt: UtcInstantSchema
});

export const OrdinaryCauseEventV1Schema = ContextEventBaseSchema.safeExtend({
  contextType: z.enum(["heavy_sweat", "towel", "friction", "hand_wash"]),
  zoneInstanceIds: z.array(NonEmptyIdSchema).min(1)
});

export const ContextEventV1Schema = z.union([
  ContextChangedEventV1Schema,
  WaterStartEventV1Schema,
  WaterEndEventV1Schema,
  OrdinaryCauseEventV1Schema
]);

export const SessionEndedEventV1Schema = EventEnvelopeSchema.extend({
  schemaVersion: z.literal(EVENT_SCHEMA_VERSION),
  eventType: z.literal("session_ended"),
  endedAt: UtcInstantSchema,
  endedReason: SessionEndedReasonSchema.default("user_ended")
});

export const AnySessionEventV1Schema = z.union([
  SessionStartedEventV1Schema,
  ZoneMethodEventV1Schema,
  ZoneTrackingEventV1Schema,
  ApplicationEventV1Schema,
  ProductSafetyEventV1Schema,
  ContextEventV1Schema,
  SessionEndedEventV1Schema
]);

export const SessionEventStreamV1Schema = z.object({
  sessionStarted: SessionStartedEventV1Schema,
  zoneMethodEvents: z.array(ZoneMethodEventV1Schema),
  zoneTrackingEvents: z.array(ZoneTrackingEventV1Schema),
  applicationConfirmationGroups: z.array(ApplicationConfirmationGroupV1Schema),
  applicationEvents: z.array(ApplicationEventV1Schema),
  productSafetyEvents: z.array(ProductSafetyEventV1Schema),
  contextEvents: z.array(ContextEventV1Schema),
  sessionEndedEvents: z.array(SessionEndedEventV1Schema)
});

export type SessionStartedEventV1 = z.infer<typeof SessionStartedEventV1Schema>;
export type ZoneMethodEventV1 = z.infer<typeof ZoneMethodEventV1Schema>;
export type ZoneTrackingEventV1 = z.infer<typeof ZoneTrackingEventV1Schema>;
export type ApplicationConfirmationGroupV1 = z.infer<
  typeof ApplicationConfirmationGroupV1Schema
>;
export type ApplicationEventV1 = z.infer<typeof ApplicationEventV1Schema>;
export type ProductSafetyEventV1 = z.infer<typeof ProductSafetyEventV1Schema>;
export type ContextEventV1 = z.infer<typeof ContextEventV1Schema>;
export type WaterStartEventV1 = z.infer<typeof WaterStartEventV1Schema>;
export type WaterEndEventV1 = z.infer<typeof WaterEndEventV1Schema>;
export type SessionEndedEventV1 = z.infer<typeof SessionEndedEventV1Schema>;
export type SessionEventStreamV1 = z.infer<typeof SessionEventStreamV1Schema>;
