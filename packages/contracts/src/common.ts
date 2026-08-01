import { z } from "zod";

export const UtcInstantSchema = z
  .string()
  .datetime({ offset: true })
  .refine((value) => value.endsWith("Z"), "時間必須正規化為 UTC（Z）");

export const NonEmptyIdSchema = z.string().trim().min(1).max(200);
export const ClientSequenceSchema = z.number().int().nonnegative();

export const BodyZoneCodeSchema = z.enum([
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
]);

export const BODY_ZONE_V3_ORDER = [
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
] as const;

export const SessionContextSchema = z.enum([
  "indoor_away",
  "indoor_window",
  "outdoor_general",
  "outdoor_exercise",
  "water_preparing",
  "water_active"
]);

export const SetupEntryModeSchema = z.enum([
  "reuse",
  "quick_preset",
  "self_select"
]);

export const PresetDecisionSchema = z.enum([
  "accepted",
  "adjusted",
  "not_shown"
]);

export const SessionEndedReasonSchema = z.enum([
  "user_ended",
  "replaced_by_new_session",
  "account_conflict_resolution"
]);

export const ShadeStatusSchema = z.enum(["none", "partial", "full", "unknown"]);
export const TrackingStatusSchema = z.enum(["active", "ended"]);
export const SkinExposureStatusSchema = z.enum([
  "exposed",
  "clothing_covered",
  "unknown"
]);
export const MethodCertaintySchema = z.enum([
  "confirmed",
  "none_reported",
  "unknown",
  "unrecorded"
]);
export const MethodComponentSchema = z.enum([
  "sunscreen",
  "other_topical",
  "clothing"
]);

export const CorrectionActionSchema = z.enum(["create", "replace", "void"]);

export const EventEnvelopeSchema = z.object({
  schemaVersion: z.string().min(1),
  id: NonEmptyIdSchema,
  sessionId: NonEmptyIdSchema,
  commandId: NonEmptyIdSchema,
  idempotencyKey: NonEmptyIdSchema,
  effectiveOccurredAt: UtcInstantSchema,
  clientCreatedAt: UtcInstantSchema,
  clientSequence: ClientSequenceSchema,
  localAppliedSequence: ClientSequenceSchema
});

export const CorrectableEventEnvelopeSchema = EventEnvelopeSchema.extend({
  correctionAction: CorrectionActionSchema.default("create"),
  correctionOfEventId: NonEmptyIdSchema.nullable().default(null)
}).superRefine((value, context) => {
  const needsTarget = value.correctionAction !== "create";
  if (needsTarget !== (value.correctionOfEventId !== null)) {
    context.addIssue({
      code: "custom",
      path: ["correctionOfEventId"],
      message: needsTarget
        ? "replace／void 必須指定 correctionOfEventId"
        : "create 不得指定 correctionOfEventId"
    });
  }
});

export type BodyZoneCode = z.infer<typeof BodyZoneCodeSchema>;
export type SessionContext = z.infer<typeof SessionContextSchema>;
export type TrackingStatus = z.infer<typeof TrackingStatusSchema>;
export type SkinExposureStatus = z.infer<typeof SkinExposureStatusSchema>;
export type MethodCertainty = z.infer<typeof MethodCertaintySchema>;
export type MethodComponent = z.infer<typeof MethodComponentSchema>;
export type SetupEntryMode = z.infer<typeof SetupEntryModeSchema>;
export type PresetDecision = z.infer<typeof PresetDecisionSchema>;
export type SessionEndedReason = z.infer<
  typeof SessionEndedReasonSchema
>;
