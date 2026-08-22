import { z } from "zod";
import {
  BodyZoneCodeSchema,
  ClientSequenceSchema,
  MethodCertaintySchema,
  MethodComponentSchema,
  NonEmptyIdSchema,
  PresetDecisionSchema,
  SessionEndedReasonSchema,
  SessionContextSchema,
  SetupEntryModeSchema,
  ShadeStatusSchema,
  SkinExposureStatusSchema,
  UtcInstantSchema
} from "./common";
import { ProductLabelSnapshotV1Schema } from "./product";
import {
  BODY_ZONE_SCHEMA_VERSION,
  COMMAND_SCHEMA_VERSION
} from "./versions";

const CommandEnvelopeFields = {
  commandVersion: z.literal(COMMAND_SCHEMA_VERSION),
  commandId: NonEmptyIdSchema,
  idempotencyKey: NonEmptyIdSchema,
  owner: z.object({
    type: z.literal("guest"),
    localVisitorId: NonEmptyIdSchema
  }),
  deviceLocalId: NonEmptyIdSchema,
  sessionId: NonEmptyIdSchema,
  clientSequence: ClientSequenceSchema,
  clientCreatedAt: UtcInstantSchema
} as const;

export const StartZoneInputV1Schema = z.object({
  zoneInstanceId: NonEmptyIdSchema,
  trackingEventId: NonEmptyIdSchema,
  methodEventId: NonEmptyIdSchema,
  bodyZoneCode: BodyZoneCodeSchema,
  customLabel: z.string().trim().min(1).max(80).nullable().default(null),
  skinExposureStatus: SkinExposureStatusSchema,
  methodCertainty: MethodCertaintySchema,
  methodComponents: z.array(MethodComponentSchema)
});

export const StartApplicationInputV1Schema = z.object({
  eventId: NonEmptyIdSchema,
  zoneInstanceIds: z.array(NonEmptyIdSchema).min(1),
  sourceProductId: NonEmptyIdSchema.nullable(),
  productSnapshotFingerprint: NonEmptyIdSchema,
  productLabelSnapshot: ProductLabelSnapshotV1Schema
});

export const StartApplicationGroupInputV1Schema = z.object({
  groupId: NonEmptyIdSchema,
  appliedAt: UtcInstantSchema,
  applications: z.array(StartApplicationInputV1Schema).min(1)
});

export const StartWaterInputV1Schema = z
  .object({
    eventId: NonEmptyIdSchema,
    activityIntervalId: NonEmptyIdSchema,
    zoneInstanceIds: z.array(NonEmptyIdSchema).min(1),
    startConfidence: z.enum(["confirmed", "unknown"]),
    activityStartedAt: UtcInstantSchema.nullable(),
    effectiveOccurredAt: UtcInstantSchema
  })
  .superRefine((value, context) => {
    const confirmed = value.startConfidence === "confirmed";
    if (confirmed !== (value.activityStartedAt !== null)) {
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

export const StartSessionCommandV1Schema = z
  .object({
    ...CommandEnvelopeFields,
    commandType: z.literal("start_session"),
    payload: z.object({
      sessionStartedEventId: NonEmptyIdSchema,
      rulesetVersion: z.string().min(1),
      bodyZoneSchemaVersion: z.literal(BODY_ZONE_SCHEMA_VERSION),
      setupEntryMode: SetupEntryModeSchema,
      presetDecision: PresetDecisionSchema,
      suggestedPresetVersion: NonEmptyIdSchema.nullable(),
      effectiveStartedAt: UtcInstantSchema,
      initialContext: SessionContextSchema,
      initialShade: ShadeStatusSchema,
      zones: z.array(StartZoneInputV1Schema).min(1),
      applicationGroup: StartApplicationGroupInputV1Schema.nullable(),
      waterStart: StartWaterInputV1Schema.nullable()
    })
  })
  .superRefine((command, context) => {
    const { zones, applicationGroup, waterStart, initialContext } =
      command.payload;
    const zoneIds = new Set<string>();
    const standardCodes = new Set<string>();

    for (const [index, zone] of zones.entries()) {
      if (zoneIds.has(zone.zoneInstanceId)) {
        context.addIssue({
          code: "custom",
          path: ["payload", "zones", index, "zoneInstanceId"],
          message: "zoneInstanceId 不得重複"
        });
      }
      zoneIds.add(zone.zoneInstanceId);

      if (zone.bodyZoneCode !== "custom") {
        if (standardCodes.has(zone.bodyZoneCode)) {
          context.addIssue({
            code: "custom",
            path: ["payload", "zones", index, "bodyZoneCode"],
            message: "同一 Session 的標準部位不得重複"
          });
        }
        standardCodes.add(zone.bodyZoneCode);
      }

      if (zone.methodCertainty !== "confirmed") {
        context.addIssue({
          code: "custom",
          path: ["payload", "zones", index, "methodCertainty"],
          message: "P0 StartSession 只接受 confirmed 方法"
        });
      }
      if (zone.methodComponents.length === 0) {
        context.addIssue({
          code: "custom",
          path: ["payload", "zones", index, "methodComponents"],
          message: "confirmed 方法必須至少有一個 component"
        });
      }

      const components = new Set(zone.methodComponents);
      if (
        zone.skinExposureStatus === "exposed" &&
        (components.has("clothing") ||
          (!components.has("sunscreen") &&
            !components.has("other_topical")))
      ) {
        context.addIssue({
          code: "custom",
          path: ["payload", "zones", index, "methodComponents"],
          message: "exposed 只能使用 sunscreen／other_topical 的合法組合"
        });
      }
      if (
        zone.skinExposureStatus === "clothing_covered" &&
        !components.has("clothing")
      ) {
        context.addIssue({
          code: "custom",
          path: ["payload", "zones", index, "methodComponents"],
          message: "clothing_covered 必須包含 clothing"
        });
      }
      if (zone.skinExposureStatus === "unknown") {
        context.addIssue({
          code: "custom",
          path: ["payload", "zones", index, "skinExposureStatus"],
          message: "P0 StartSession 不接受 unknown exposure"
        });
      }
    }

    const topicalZoneIds = new Set(
      zones
        .filter((zone) =>
          zone.methodComponents.some(
            (component) =>
              component === "sunscreen" || component === "other_topical"
          )
        )
        .map((zone) => zone.zoneInstanceId)
    );

    if ((applicationGroup === null) !== (topicalZoneIds.size === 0)) {
      context.addIssue({
        code: "custom",
        path: ["payload", "applicationGroup"],
        message:
          topicalZoneIds.size === 0
            ? "沒有 topical 方法時不得建立 Application"
            : "所有 topical 部位都必須被 Application group 完整覆蓋"
      });
    }

    if (applicationGroup !== null) {
      const assigned = new Set<string>();
      for (const [applicationIndex, application] of applicationGroup.applications.entries()) {
        for (const [zoneIndex, zoneId] of application.zoneInstanceIds.entries()) {
          if (!topicalZoneIds.has(zoneId)) {
            context.addIssue({
              code: "custom",
              path: [
                "payload",
                "applicationGroup",
                "applications",
                applicationIndex,
                "zoneInstanceIds",
                zoneIndex
              ],
              message: "Application 只能包含已確認使用 topical 的部位"
            });
          }
          if (assigned.has(zoneId)) {
            context.addIssue({
              code: "custom",
              path: [
                "payload",
                "applicationGroup",
                "applications",
                applicationIndex,
                "zoneInstanceIds",
                zoneIndex
              ],
              message: "同一 confirmation group 內的部位集合必須互斥"
            });
          }
          assigned.add(zoneId);
        }
      }
      const missing = [...topicalZoneIds].filter((id) => !assigned.has(id));
      if (missing.length > 0) {
        context.addIssue({
          code: "custom",
          path: ["payload", "applicationGroup"],
          message: `Application group 未覆蓋部位：${missing.join(", ")}`
        });
      }
    }

    if (initialContext === "water_active" && waterStart === null) {
      context.addIssue({
        code: "custom",
        path: ["payload", "waterStart"],
        message: "water_active 必須同時建立 water_start"
      });
    }
    if (initialContext !== "water_active" && waterStart !== null) {
      context.addIssue({
        code: "custom",
        path: ["payload", "waterStart"],
        message: "非 water_active 不得建立 water_start"
      });
    }
    if (waterStart !== null) {
      const waterEligibleZones = new Set(
        zones
          .filter(
            (zone) =>
              zone.skinExposureStatus === "exposed" &&
              zone.methodComponents.includes("sunscreen")
          )
          .map((zone) => zone.zoneInstanceId)
      );
      for (const [index, zoneId] of waterStart.zoneInstanceIds.entries()) {
        if (!waterEligibleZones.has(zoneId)) {
          context.addIssue({
            code: "custom",
            path: ["payload", "waterStart", "zoneInstanceIds", index],
            message: "water_start 只能包含外露且方法含 sunscreen 的部位"
          });
        }
      }
    }

    const eventIds: Array<{ value: string; path: PropertyKey[] }> = [
      {
        value: command.payload.sessionStartedEventId,
        path: ["payload", "sessionStartedEventId"]
      },
      ...zones.flatMap((zone, index) => [
        {
          value: zone.trackingEventId,
          path: ["payload", "zones", index, "trackingEventId"]
        },
        {
          value: zone.methodEventId,
          path: ["payload", "zones", index, "methodEventId"]
        }
      ]),
      ...(applicationGroup === null
        ? []
        : [
            {
              value: applicationGroup.groupId,
              path: ["payload", "applicationGroup", "groupId"]
            },
            ...applicationGroup.applications.map((application, index) => ({
              value: application.eventId,
              path: [
                "payload",
                "applicationGroup",
                "applications",
                index,
                "eventId"
              ]
            }))
          ]),
      ...(waterStart === null
        ? []
        : [
            {
              value: waterStart.eventId,
              path: ["payload", "waterStart", "eventId"]
            }
          ])
    ];
    const seenEventIds = new Set<string>();
    for (const eventId of eventIds) {
      if (seenEventIds.has(eventId.value)) {
        context.addIssue({
          code: "custom",
          path: eventId.path,
          message: "同一 command 內的 event／group ID 不得重複"
        });
      }
      seenEventIds.add(eventId.value);
    }
  });

export const EndSessionCommandV1Schema = z.object({
  ...CommandEnvelopeFields,
  commandType: z.literal("end_session"),
  expectedRevision: z.number().int().positive(),
  payload: z.object({
    sessionEndedEventId: NonEmptyIdSchema,
    effectiveOccurredAt: UtcInstantSchema,
    endedReason: SessionEndedReasonSchema.default("user_ended")
  })
});

/**
 * S-09 回報狀況。
 *
 * 涵蓋會縮短或改變目前防護狀態的事件：四種一般原因、入水與離水。
 * `context_changed` 與產品不適另循其他路徑，不在本命令範圍。
 *
 * 安全性約束在 `superRefine` 與 `planContextEvent` 兩層：
 * 契約層擋掉結構性錯誤（未來時間、起點晚於事件），
 * 規劃層再依既有事件流擋掉重疊區間與孤兒離水。
 */
/**
 * 回報狀況事件的內容。S-09 建立與 S-10 更正共用同一組定義，
 * 兩邊各留一份遲早會漂移。
 */
export const ContextEventDetailInputV1Schema = z.discriminatedUnion(
  "contextType",
  [
    z.object({
      contextType: z.enum([
        "heavy_sweat",
        "towel",
        "friction",
        "hand_wash"
      ]),
      zoneInstanceIds: z.array(NonEmptyIdSchema).min(1)
    }),
    z.object({
      contextType: z.literal("water_start"),
      activityIntervalId: NonEmptyIdSchema,
      zoneInstanceIds: z.array(NonEmptyIdSchema).min(1),
      startConfidence: z.enum(["confirmed", "unknown"]),
      activityStartedAt: UtcInstantSchema.nullable()
    }),
    z.object({
      contextType: z.literal("water_end"),
      activityIntervalId: NonEmptyIdSchema,
      zoneInstanceIds: z.array(NonEmptyIdSchema).min(1),
      endedAt: UtcInstantSchema
    })
  ]
);

export const ReportContextEventCommandV1Schema = z
  .object({
    ...CommandEnvelopeFields,
    commandType: z.literal("report_context_event"),
    expectedRevision: z.number().int().positive(),
    payload: z.object({
      eventId: NonEmptyIdSchema,
      /** 使用者自陳的實際發生時間；不得晚於可信現在。 */
      effectiveOccurredAt: UtcInstantSchema,
      detail: ContextEventDetailInputV1Schema
    })
  })
  .superRefine((command, context) => {
    const { detail, effectiveOccurredAt } = command.payload;

    const zoneIds = new Set<string>();
    for (const [index, zoneId] of detail.zoneInstanceIds.entries()) {
      if (zoneIds.has(zoneId)) {
        context.addIssue({
          code: "custom",
          path: ["payload", "detail", "zoneInstanceIds", index],
          message: "同一事件內每個部位只能出現一次"
        });
      }
      zoneIds.add(zoneId);
    }

    if (detail.contextType === "water_start") {
      const hasConfirmedStart = detail.startConfidence === "confirmed";
      if (hasConfirmedStart !== (detail.activityStartedAt !== null)) {
        context.addIssue({
          code: "custom",
          path: ["payload", "detail", "activityStartedAt"],
          message: "confirmed 必須有起點；unknown 起點必須為 null"
        });
      }
      if (
        detail.activityStartedAt !== null &&
        Date.parse(detail.activityStartedAt) >
          Date.parse(effectiveOccurredAt)
      ) {
        context.addIssue({
          code: "custom",
          path: ["payload", "detail", "activityStartedAt"],
          message: "水上活動起點不得晚於事件發生時間"
        });
      }
    }

    if (
      detail.contextType === "water_end" &&
      Date.parse(detail.endedAt) > Date.parse(effectiveOccurredAt)
    ) {
      context.addIssue({
        code: "custom",
        path: ["payload", "detail", "endedAt"],
        message: "離水時間不得晚於事件發生時間"
      });
    }
  });

export const ReapplyApplicationInputV1Schema = z.object({
  eventId: NonEmptyIdSchema,
  zoneInstanceIds: z.array(NonEmptyIdSchema).min(1),
  sourceProductId: NonEmptyIdSchema.nullable(),
  productSnapshotFingerprint: NonEmptyIdSchema,
  productLabelSnapshot: ProductLabelSnapshotV1Schema
});

export const ReapplyCommandV1Schema = z
  .object({
    ...CommandEnvelopeFields,
    commandType: z.literal("record_reapplication"),
    expectedRevision: z.number().int().positive(),
    payload: z.object({
      applicationConfirmationId: NonEmptyIdSchema,
      appliedAt: UtcInstantSchema,
      applications: z.array(ReapplyApplicationInputV1Schema).min(1)
    })
  })
  .superRefine((command, context) => {
    const zoneIds = new Set<string>();
    const eventIds = new Set<string>();
    for (const [applicationIndex, application] of command.payload.applications.entries()) {
      if (application.eventId === command.payload.applicationConfirmationId) {
        context.addIssue({
          code: "custom",
          path: ["payload", "applications", applicationIndex, "eventId"],
          message: "Application event ID 不得等於 confirmation group ID"
        });
      }
      if (eventIds.has(application.eventId)) {
        context.addIssue({
          code: "custom",
          path: ["payload", "applications", applicationIndex, "eventId"],
          message: "同一 command 的 Application event ID 不得重複"
        });
      }
      eventIds.add(application.eventId);
      for (const [zoneIndex, zoneId] of application.zoneInstanceIds.entries()) {
        if (zoneIds.has(zoneId)) {
          context.addIssue({
            code: "custom",
            path: ["payload", "applications", applicationIndex, "zoneInstanceIds", zoneIndex],
            message: "同一補擦確認內每個部位只能出現一次"
          });
        }
        zoneIds.add(zoneId);
      }
    }
  });

export type StartSessionCommandV1 = z.infer<
  typeof StartSessionCommandV1Schema
>;
/**
 * S-10 更正最近事件。
 *
 * 不直接編輯或刪除原事件：一律建立 `replace`／`void` 後繼事件，
 * 由 reducer 的 correction leaf 解析決定哪一版有效。
 * 「target 必須是目前唯一有效 leaf」這條在領域層檢查，契約層看不到事件流。
 */
export const CorrectionActionInputSchema = z.enum(["replace", "void"]);

export const CorrectContextEventCommandV1Schema = z
  .object({
    ...CommandEnvelopeFields,
    commandType: z.literal("correct_context_event"),
    expectedRevision: z.number().int().positive(),
    payload: z.object({
      /** 後繼事件的 id。 */
      correctionEventId: NonEmptyIdSchema,
      targetEventId: NonEmptyIdSchema,
      action: CorrectionActionInputSchema,
      effectiveOccurredAt: UtcInstantSchema,
      /**
       * `void` 時仍需帶內容：事件 schema 要求 `zoneInstanceIds` 至少一項，
       * 沿用 target 原值即可。作廢與否由 `action` 決定，不是靠內容留白。
       */
      detail: ContextEventDetailInputV1Schema
    })
  })
  .superRefine((command, context) => {
    const { correctionEventId, targetEventId, detail } = command.payload;

    if (correctionEventId === targetEventId) {
      context.addIssue({
        code: "custom",
        path: ["payload", "correctionEventId"],
        message: "後繼事件 id 不得等於被更正的事件 id"
      });
    }

    const zoneIds = new Set<string>();
    for (const [index, zoneId] of detail.zoneInstanceIds.entries()) {
      if (zoneIds.has(zoneId)) {
        context.addIssue({
          code: "custom",
          path: ["payload", "detail", "zoneInstanceIds", index],
          message: "同一事件內每個部位只能出現一次"
        });
      }
      zoneIds.add(zoneId);
    }
  });

export const CorrectApplicationGroupCommandV1Schema = z
  .object({
    ...CommandEnvelopeFields,
    commandType: z.literal("correct_application_group"),
    expectedRevision: z.number().int().positive(),
    payload: z.object({
      correctionGroupId: NonEmptyIdSchema,
      targetGroupId: NonEmptyIdSchema,
      action: CorrectionActionInputSchema,
      appliedAt: UtcInstantSchema,
      /**
       * `replace` 必須帶完整的一組；`void` 必須為空。
       *
       * reducer 依 `applicationConfirmationId` 過濾 application 事件，
       * 所以取代一個群組等於重發整組——只換群組不換底下的紀錄，
       * 那次補擦的部位會整批消失。
       */
      applications: z.array(ReapplyApplicationInputV1Schema)
    })
  })
  .superRefine((command, context) => {
    const { action, applications, correctionGroupId, targetGroupId } =
      command.payload;

    if (correctionGroupId === targetGroupId) {
      context.addIssue({
        code: "custom",
        path: ["payload", "correctionGroupId"],
        message: "後繼群組 id 不得等於被更正的群組 id"
      });
    }

    if (action === "replace" && applications.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["payload", "applications"],
        message: "replace 必須帶完整的補擦紀錄，否則該次補擦的部位會全部消失"
      });
    }
    if (action === "void" && applications.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["payload", "applications"],
        message: "void 不得附帶補擦紀錄"
      });
    }

    const zoneIds = new Set<string>();
    const eventIds = new Set<string>();
    for (const [applicationIndex, application] of applications.entries()) {
      if (
        application.eventId === correctionGroupId ||
        eventIds.has(application.eventId)
      ) {
        context.addIssue({
          code: "custom",
          path: ["payload", "applications", applicationIndex, "eventId"],
          message: "Application event ID 不得重複或等於群組 ID"
        });
      }
      eventIds.add(application.eventId);
      for (const [zoneIndex, zoneId] of application.zoneInstanceIds.entries()) {
        if (zoneIds.has(zoneId)) {
          context.addIssue({
            code: "custom",
            path: [
              "payload",
              "applications",
              applicationIndex,
              "zoneInstanceIds",
              zoneIndex
            ],
            message: "同一補擦確認內每個部位只能出現一次"
          });
        }
        zoneIds.add(zoneId);
      }
    }
  });

export type EndSessionCommandV1 = z.infer<typeof EndSessionCommandV1Schema>;
export type ReapplyCommandV1 = z.infer<typeof ReapplyCommandV1Schema>;
export type ReportContextEventCommandV1 = z.infer<
  typeof ReportContextEventCommandV1Schema
>;
export type ContextEventDetailInputV1 = z.infer<
  typeof ContextEventDetailInputV1Schema
>;
export type CorrectContextEventCommandV1 = z.infer<
  typeof CorrectContextEventCommandV1Schema
>;
export type CorrectApplicationGroupCommandV1 = z.infer<
  typeof CorrectApplicationGroupCommandV1Schema
>;
