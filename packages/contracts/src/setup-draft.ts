import { z } from "zod";
import {
  BodyZoneCodeSchema,
  MethodComponentSchema,
  NonEmptyIdSchema,
  PresetDecisionSchema,
  SessionContextSchema,
  SetupEntryModeSchema,
  ShadeStatusSchema,
  SkinExposureStatusSchema,
  UtcInstantSchema
} from "./common";
import { ProductLabelSnapshotV1Schema } from "./product";
import {
  BODY_ZONE_SCHEMA_VERSION,
  SETUP_DRAFT_SCHEMA_VERSION
} from "./versions";

export const SetupDraftStepSchema = z.enum([
  "context",
  "protection",
  "timing",
  "review"
]);

export const SetupDraftZoneV1Schema = z
  .object({
    draftZoneKey: NonEmptyIdSchema,
    bodyZoneCode: BodyZoneCodeSchema,
    customLabel: z.string().trim().min(1).max(80).nullable(),
    skinExposureStatus: SkinExposureStatusSchema,
    methodComponents: z.array(MethodComponentSchema).min(1)
  })
  .superRefine((zone, context) => {
    const components = new Set(zone.methodComponents);
    if (
      zone.skinExposureStatus === "exposed" &&
      (components.has("clothing") ||
        (!components.has("sunscreen") &&
          !components.has("other_topical")))
    ) {
      context.addIssue({
        code: "custom",
        path: ["methodComponents"],
        message: "外露部位必須確認防曬產品或其他外用產品"
      });
    }
    if (
      zone.skinExposureStatus === "clothing_covered" &&
      !components.has("clothing")
    ) {
      context.addIssue({
        code: "custom",
        path: ["methodComponents"],
        message: "衣物覆蓋部位必須包含 clothing"
      });
    }
    if (zone.skinExposureStatus === "unknown") {
      context.addIssue({
        code: "custom",
        path: ["skinExposureStatus"],
        message: "新設定流程不接受未知的外露狀態"
      });
    }
  });

export const SetupDraftApplicationV1Schema = z.object({
  draftApplicationKey: NonEmptyIdSchema,
  draftZoneKeys: z.array(NonEmptyIdSchema).min(1),
  sourceProductId: NonEmptyIdSchema.nullable(),
  productSnapshotFingerprint: NonEmptyIdSchema,
  productLabelSnapshot: ProductLabelSnapshotV1Schema
});

export const SetupDraftPendingTimingV1Schema = z.object({
  appliedAt: UtcInstantSchema,
  waterStart: z
    .object({
      confidence: z.enum(["confirmed", "unknown"]),
      activityStartedAt: UtcInstantSchema.nullable()
    })
    .nullable()
});

export const SetupDraftV1Schema = z
  .object({
    schemaVersion: z.literal(SETUP_DRAFT_SCHEMA_VERSION),
    id: NonEmptyIdSchema,
    localDraftFlowId: NonEmptyIdSchema,
    ownerKey: NonEmptyIdSchema,
    currentStep: SetupDraftStepSchema,
    bodyZoneSchemaVersion: z.literal(BODY_ZONE_SCHEMA_VERSION),
    setupEntryMode: SetupEntryModeSchema,
    suggestedPresetId: NonEmptyIdSchema.nullable(),
    suggestedPresetVersion: NonEmptyIdSchema.nullable(),
    presetDecision: PresetDecisionSchema.nullable(),
    initialContext: SessionContextSchema.nullable(),
    initialShade: ShadeStatusSchema.nullable(),
    zones: z.array(SetupDraftZoneV1Schema),
    applications: z.array(SetupDraftApplicationV1Schema),
    pendingTiming: SetupDraftPendingTimingV1Schema.nullable().default(null),
    createdAt: UtcInstantSchema,
    updatedAt: UtcInstantSchema,
    expiresAt: UtcInstantSchema
  })
  .superRefine((draft, context) => {
    const zoneKeys = new Set<string>();
    const standardCodes = new Set<string>();
    for (const [index, zone] of draft.zones.entries()) {
      if (zoneKeys.has(zone.draftZoneKey)) {
        context.addIssue({
          code: "custom",
          path: ["zones", index, "draftZoneKey"],
          message: "draftZoneKey 不得重複"
        });
      }
      zoneKeys.add(zone.draftZoneKey);

      if (
        zone.bodyZoneCode !== "custom" &&
        standardCodes.has(zone.bodyZoneCode)
      ) {
        context.addIssue({
          code: "custom",
          path: ["zones", index, "bodyZoneCode"],
          message: "草稿內的標準部位不得重複"
        });
      }
      standardCodes.add(zone.bodyZoneCode);
    }

    const assignedZoneKeys = new Set<string>();
    for (const [applicationIndex, application] of draft.applications.entries()) {
      for (const [zoneIndex, zoneKey] of application.draftZoneKeys.entries()) {
        if (!zoneKeys.has(zoneKey)) {
          context.addIssue({
            code: "custom",
            path: [
              "applications",
              applicationIndex,
              "draftZoneKeys",
              zoneIndex
            ],
            message: "產品草稿只能引用目前草稿中的部位"
          });
        }
        if (assignedZoneKeys.has(zoneKey)) {
          context.addIssue({
            code: "custom",
            path: [
              "applications",
              applicationIndex,
              "draftZoneKeys",
              zoneIndex
            ],
            message: "同一草稿部位不能同時指派給兩個產品"
          });
        }
        assignedZoneKeys.add(zoneKey);
      }
    }

    if (Date.parse(draft.expiresAt) <= Date.parse(draft.updatedAt)) {
      context.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message: "草稿到期時間必須晚於更新時間"
      });
    }
  });

export type SetupDraftStep = z.infer<typeof SetupDraftStepSchema>;
export type SetupDraftZoneV1 = z.infer<typeof SetupDraftZoneV1Schema>;
export type SetupDraftApplicationV1 = z.infer<
  typeof SetupDraftApplicationV1Schema
>;
export type SetupDraftPendingTimingV1 = z.infer<
  typeof SetupDraftPendingTimingV1Schema
>;
export type SetupDraftV1 = z.infer<typeof SetupDraftV1Schema>;
