import { describe, expect, it } from "vitest";
import {
  FiveDayUvForecastSchema,
  EndSessionCommandV1Schema,
  ProductLabelSnapshotV1Schema,
  StartSessionCommandV1Schema
} from "@sunshield/contracts";
import {
  makeFiveDayUvForecast,
  makeEndSessionCommand,
  makeProductSnapshot,
  makeStartSessionCommand
} from "./index";

describe("P0 shared contracts", () => {
  it("接受五個已排序且有來源的白日時段 UV 預報", () => {
    const forecast = makeFiveDayUvForecast();

    expect(FiveDayUvForecastSchema.parse(forecast)).toEqual(forecast);
    expect(forecast.days).toHaveLength(5);
  });
  it("接受合法的 StartSessionCommandV1", () => {
    const command = makeStartSessionCommand();
    expect(StartSessionCommandV1Schema.safeParse(command).success).toBe(true);
  });

  it("EndSessionCommandV1 保存使用者主動結束原因", () => {
    const result = EndSessionCommandV1Schema.safeParse(
      makeEndSessionCommand()
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.payload.endedReason).toBe("user_ended");
    }
  });

  it("拒絕 confirmed 但沒有方法 component", () => {
    const command = makeStartSessionCommand();
    command.payload.zones[0]!.methodComponents = [];
    expect(StartSessionCommandV1Schema.safeParse(command).success).toBe(false);
  });

  it("拒絕同一 Session 的重複標準部位", () => {
    const command = makeStartSessionCommand();
    command.payload.zones.push({
      ...command.payload.zones[0]!,
      zoneInstanceId: "another-face",
      trackingEventId: "another-tracking",
      methodEventId: "another-method"
    });
    expect(StartSessionCommandV1Schema.safeParse(command).success).toBe(false);
  });

  it("拒絕同一 command 內重複的 event ID", () => {
    const command = makeStartSessionCommand();
    command.payload.zones[0]!.methodEventId =
      command.payload.zones[0]!.trackingEventId;
    expect(StartSessionCommandV1Schema.safeParse(command).success).toBe(false);
  });

  it("拒絕 Application partition 漏掉 topical 部位", () => {
    const command = makeStartSessionCommand();
    command.payload.applicationGroup = null;
    expect(StartSessionCommandV1Schema.safeParse(command).success).toBe(false);
  });

  it("拒絕 Application partition 的部位重疊", () => {
    const command = makeStartSessionCommand();
    const original = command.payload.applicationGroup!.applications[0]!;
    command.payload.applicationGroup!.applications.push({
      ...original,
      eventId: "overlapping-application"
    });
    expect(StartSessionCommandV1Schema.safeParse(command).success).toBe(false);
  });

  it("接受 clothing-only 且沒有 Application", () => {
    const command = makeStartSessionCommand({
      zones: [
        {
          zoneInstanceId: "zone-arms",
          trackingEventId: "tracking-arms",
          methodEventId: "method-arms",
          bodyZoneCode: "arms",
          customLabel: null,
          skinExposureStatus: "clothing_covered",
          methodCertainty: "confirmed",
          methodComponents: ["clothing"]
        }
      ],
      applicationGroup: null
    });
    expect(StartSessionCommandV1Schema.safeParse(command).success).toBe(true);
  });

  it("拒絕 explicit interval 沒有正整數分鐘", () => {
    const snapshot = {
      ...makeProductSnapshot(),
      reapplicationIntervalStatus: "explicit_minutes" as const,
      reapplicationIntervalMinutes: null
    };
    expect(ProductLabelSnapshotV1Schema.safeParse(snapshot).success).toBe(false);
  });

  it("拒絕 unknown water start 卻帶 activityStartedAt", () => {
    const command = makeStartSessionCommand();
    const result = StartSessionCommandV1Schema.safeParse({
      ...command,
      payload: {
        ...command.payload,
        initialContext: "water_active",
        waterStart: {
          eventId: "water-start",
          activityIntervalId: "water-1",
          zoneInstanceIds: [command.payload.zones[0]!.zoneInstanceId],
          startConfidence: "unknown",
          activityStartedAt: "2026-07-29T09:50:00.000Z",
          effectiveOccurredAt: "2026-07-29T10:00:00.000Z"
        }
      }
    });
    expect(result.success).toBe(false);
  });
});
