import { z } from "zod";
import {
  BodyZoneCodeSchema,
  MethodCertaintySchema,
  MethodComponentSchema,
  NonEmptyIdSchema,
  SkinExposureStatusSchema,
  TrackingStatusSchema,
  UtcInstantSchema
} from "./common";
import { ProductEligibilitySchema } from "./product";

export const ReasonCodeSchema = z.enum([
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
]);

export const ActionKindSchema = z.enum([
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
]);

export const PrimaryActionSchema = z.object({
  presentationType: z.enum(["timed_ring", "due_card", "untimed_action_card"]),
  variant: z
    .enum(["label_wait", "multi_action", "neutral_physical"])
    .nullable(),
  actionKind: ActionKindSchema,
  affectedZoneInstanceIds: z.array(NonEmptyIdSchema),
  actionAt: UtcInstantSchema.nullable(),
  reasonCodes: z.array(ReasonCodeSchema),
  derivedFromEventRefs: z.array(NonEmptyIdSchema)
});

export const ZoneProjectionSchema = z.object({
  sessionId: NonEmptyIdSchema,
  zoneInstanceId: NonEmptyIdSchema,
  bodyZoneCode: BodyZoneCodeSchema,
  customLabel: z.string().nullable(),
  trackingStatus: TrackingStatusSchema,
  skinExposureStatus: SkinExposureStatusSchema,
  methodCertainty: MethodCertaintySchema,
  methodComponents: z.array(MethodComponentSchema),
  currentActivationSequence: z.number().int().nonnegative(),
  currentApplicationId: NonEmptyIdSchema.nullable(),
  currentApplicationEligibility: ProductEligibilitySchema.nullable(),
  activeProductSafetyBlock: z.boolean(),
  recordStatus: z.enum([
    "sunscreen_recorded",
    "physical_method_reported",
    "mixed",
    "none_reported",
    "unknown",
    "unrecorded"
  ]),
  timingStatus: z.enum([
    "tracking",
    "reapply_soon",
    "reapply_due",
    "label_wait",
    "untimed_action",
    "not_applicable"
  ]),
  activeLabelReadyAt: UtcInstantSchema.nullable(),
  generalDueAt: UtcInstantSchema.nullable(),
  activeWaterDeadline: UtcInstantSchema.nullable(),
  eventTriggeredDeadline: UtcInstantSchema.nullable(),
  zoneDueAt: UtcInstantSchema.nullable(),
  zoneTimerStartedAt: UtcInstantSchema.nullable().default(null),
  zoneNextActionAt: UtcInstantSchema.nullable(),
  activeCauseRefs: z.array(NonEmptyIdSchema),
  activeRuleIds: z.array(z.string().min(1)),
  reasonCodes: z.array(ReasonCodeSchema),
  derivedFromEventRefs: z.array(NonEmptyIdSchema)
});

export const SessionProjectionSchema = z.object({
  sessionId: NonEmptyIdSchema,
  rulesetVersion: z.string().min(1),
  revision: z.number().int().positive(),
  overallStatus: z.enum(["tracking", "attention_required", "ended"]),
  sessionNextDueAt: UtcInstantSchema.nullable(),
  zones: z.array(ZoneProjectionSchema),
  primaryAction: PrimaryActionSchema,
  derivedFromEventRefs: z.array(NonEmptyIdSchema)
});

export const ReducerClockSchema = z.object({
  status: z.enum(["trusted", "clock_untrusted"]),
  trustedNow: UtcInstantSchema,
  connectivity: z.enum(["online", "offline"])
});

export type ReasonCode = z.infer<typeof ReasonCodeSchema>;
export type ActionKind = z.infer<typeof ActionKindSchema>;
export type PrimaryAction = z.infer<typeof PrimaryActionSchema>;
export type ZoneProjection = z.infer<typeof ZoneProjectionSchema>;
export type SessionProjection = z.infer<typeof SessionProjectionSchema>;
export type ReducerClock = z.infer<typeof ReducerClockSchema>;
