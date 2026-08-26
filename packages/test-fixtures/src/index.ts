import type {
  EndSessionCommandV1,
  FiveDayUvForecast,
  ProductLabelSnapshotV1,
  ReducerClock,
  StartSessionCommandV1
} from "@sunshield/contracts";
import {
  BODY_ZONE_SCHEMA_VERSION,
  COMMAND_SCHEMA_VERSION,
  DEFAULT_RULESET_VERSION,
  FIVE_DAY_UV_FORECAST_SCHEMA_VERSION,
  FiveDayUvForecastSchema,
  PRODUCT_LABEL_SNAPSHOT_VERSION,
  ProductLabelSnapshotV1Schema,
  StartSessionCommandV1Schema
} from "@sunshield/contracts";

export * from "./sync";

export function makeClock(
  trustedNow = "2026-07-29T11:00:00.000Z",
  overrides: Partial<ReducerClock> = {}
): ReducerClock {
  return {
    status: "trusted",
    connectivity: "online",
    trustedNow,
    ...overrides
  };
}

export function makeProductSnapshot(
  overrides: Partial<ProductLabelSnapshotV1> = {}
): ProductLabelSnapshotV1 {
  const snapshot = {
    snapshotVersion: PRODUCT_LABEL_SNAPSHOT_VERSION,
    identityStatus: "confirmed",
    expiryStatus: "not_expired",
    conditionStatus: "no_issue_reported",
    sunscreenClaimStatus: "confirmed",
    ruleEligibilityAtApplication: "eligible",
    reapplicationIntervalStatus: "no_numeric_interval",
    reapplicationIntervalMinutes: null,
    preExposureWaitStatus: "no_instruction",
    preExposureWaitMinutes: null,
    waterResistanceStatus: "unknown",
    waterResistanceMinutes: null,
    spf: null,
    paGrade: null,
    capturedAt: "2026-07-29T09:00:00.000Z",
    ...overrides
  };

  if (
    !Object.prototype.hasOwnProperty.call(
      overrides,
      "ruleEligibilityAtApplication"
    )
  ) {
    snapshot.ruleEligibilityAtApplication =
      snapshot.identityStatus === "identity_unconfirmed"
        ? "identity_unconfirmed"
        : snapshot.expiryStatus === "expired"
          ? "expired"
          : snapshot.conditionStatus === "abnormal_reported"
            ? "abnormal_reported"
            : snapshot.conditionStatus === "discomfort_reported"
              ? "discomfort_reported"
              : snapshot.sunscreenClaimStatus !== "confirmed"
                ? "no_sunscreen_claim"
                : "eligible";
  }
  return ProductLabelSnapshotV1Schema.parse(snapshot);
}

type StartZone = StartSessionCommandV1["payload"]["zones"][number];
type StartApplicationGroup =
  StartSessionCommandV1["payload"]["applicationGroup"];
type StartWater = StartSessionCommandV1["payload"]["waterStart"];

export function makeStartSessionCommand(
  options: {
    idPrefix?: string;
    sessionId?: string;
    commandId?: string;
    idempotencyKey?: string;
    clientSequence?: number;
    clientCreatedAt?: string;
    effectiveStartedAt?: string;
    appliedAt?: string;
    initialContext?: StartSessionCommandV1["payload"]["initialContext"];
    zones?: StartZone[];
    applicationGroup?: StartApplicationGroup | undefined;
    waterStart?: StartWater | undefined;
    snapshot?: ProductLabelSnapshotV1;
  } = {}
): StartSessionCommandV1 {
  const prefix = options.idPrefix ?? "fixture";
  const zones = options.zones ?? [
    {
      zoneInstanceId: `${prefix}-zone-face`,
      trackingEventId: `${prefix}-tracking-face`,
      methodEventId: `${prefix}-method-face`,
      bodyZoneCode: "face_forehead",
      customLabel: null,
      skinExposureStatus: "exposed",
      methodCertainty: "confirmed",
      methodComponents: ["sunscreen"]
    }
  ];
  const topicalZoneIds = zones
    .filter((zone) =>
      zone.methodComponents.some(
        (component) =>
          component === "sunscreen" || component === "other_topical"
      )
    )
    .map((zone) => zone.zoneInstanceId);
  const applicationGroup =
    options.applicationGroup !== undefined
      ? options.applicationGroup
      : topicalZoneIds.length === 0
        ? null
        : {
            groupId: `${prefix}-application-group`,
            appliedAt: options.appliedAt ?? "2026-07-29T10:00:00.000Z",
            applications: [
              {
                eventId: `${prefix}-application`,
                zoneInstanceIds: topicalZoneIds,
                sourceProductId: `${prefix}-product-a`,
                productSnapshotFingerprint: `${prefix}-snapshot-a`,
                productLabelSnapshot: options.snapshot ?? makeProductSnapshot()
              }
            ]
          };
  const initialContext =
    options.initialContext ??
    (options.waterStart !== undefined && options.waterStart !== null
      ? "water_active"
      : "outdoor_general");

  return StartSessionCommandV1Schema.parse({
    commandVersion: COMMAND_SCHEMA_VERSION,
    commandType: "start_session",
    commandId: options.commandId ?? `${prefix}-start-command`,
    idempotencyKey: options.idempotencyKey ?? `${prefix}-start-idempotency`,
    owner: {
      type: "guest",
      localVisitorId: "visitor-1"
    },
    deviceLocalId: "device-1",
    sessionId: options.sessionId ?? `${prefix}-session`,
    clientSequence: options.clientSequence ?? 1,
    clientCreatedAt: options.clientCreatedAt ?? "2026-07-29T10:00:00.000Z",
    payload: {
      sessionStartedEventId: `${prefix}-session-started`,
      rulesetVersion: DEFAULT_RULESET_VERSION,
      bodyZoneSchemaVersion: BODY_ZONE_SCHEMA_VERSION,
      setupEntryMode: "quick_preset",
      presetDecision: "accepted",
      suggestedPresetVersion: "BODY_ZONE_PRESET_V3@1",
      effectiveStartedAt:
        options.effectiveStartedAt ?? "2026-07-29T10:00:00.000Z",
      initialContext,
      initialShade: "none",
      zones,
      applicationGroup,
      waterStart: options.waterStart ?? null
    }
  });
}

export function makeEndSessionCommand(
  options: {
    sessionId?: string;
    expectedRevision?: number;
    clientSequence?: number;
    idPrefix?: string;
    idempotencyKey?: string;
    effectiveOccurredAt?: string;
  } = {}
): EndSessionCommandV1 {
  const prefix = options.idPrefix ?? "fixture";
  return {
    commandVersion: COMMAND_SCHEMA_VERSION,
    commandType: "end_session",
    commandId: `${prefix}-end-command`,
    idempotencyKey: options.idempotencyKey ?? `${prefix}-end-idempotency`,
    owner: {
      type: "guest",
      localVisitorId: "visitor-1"
    },
    deviceLocalId: "device-1",
    sessionId: options.sessionId ?? `${prefix}-session`,
    clientSequence: options.clientSequence ?? 2,
    clientCreatedAt: "2026-07-29T11:00:00.000Z",
    expectedRevision: options.expectedRevision ?? 1,
    payload: {
      sessionEndedEventId: `${prefix}-session-ended`,
      effectiveOccurredAt:
        options.effectiveOccurredAt ?? "2026-07-29T11:00:00.000Z",
      endedReason: "user_ended"
    }
  };
}

export function makeFiveDayUvForecast(
  overrides: Partial<FiveDayUvForecast> = {}
): FiveDayUvForecast {
  const baseDays: FiveDayUvForecast["days"] = [
    {
      localDate: "2026-07-31",
      validFrom: "2026-07-30T22:00:00.000Z",
      validTo: "2026-07-31T10:00:00.000Z",
      uvi: 8,
      riskLevel: "very_high",
      temperatureCelsius: 34
    },
    {
      localDate: "2026-08-01",
      validFrom: "2026-07-31T22:00:00.000Z",
      validTo: "2026-08-01T10:00:00.000Z",
      uvi: 7,
      riskLevel: "high",
      temperatureCelsius: 32
    },
    {
      localDate: "2026-08-02",
      validFrom: "2026-08-01T22:00:00.000Z",
      validTo: "2026-08-02T10:00:00.000Z",
      uvi: 5,
      riskLevel: "moderate",
      temperatureCelsius: 29
    },
    {
      localDate: "2026-08-03",
      validFrom: "2026-08-02T22:00:00.000Z",
      validTo: "2026-08-03T10:00:00.000Z",
      uvi: 11,
      riskLevel: "extreme",
      temperatureCelsius: 36
    },
    {
      localDate: "2026-08-04",
      validFrom: "2026-08-03T22:00:00.000Z",
      validTo: "2026-08-04T10:00:00.000Z",
      uvi: 2,
      riskLevel: "low",
      temperatureCelsius: 24
    }
  ];

  return FiveDayUvForecastSchema.parse({
    schemaVersion: FIVE_DAY_UV_FORECAST_SCHEMA_VERSION,
    region: {
      regionCode: "TPE-ZHONGZHENG",
      displayName: "臺北市中正區"
    },
    sourceKind: "forecast",
    sourceDataset: "F-D0047-091",
    sourceDisplayName: "中央氣象署區域預報",
    issuedAt: "2026-07-30T10:00:00.000Z",
    fetchedAt: "2026-07-30T10:05:00.000Z",
    usableUntil: "2026-07-31T00:05:00.000Z",
    days: baseDays,
    ...overrides
  });
}
