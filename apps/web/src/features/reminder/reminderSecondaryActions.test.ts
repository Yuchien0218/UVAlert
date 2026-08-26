import type {
  PrimaryAction,
  ReasonCode,
  ZoneProjection
} from "@sunshield/contracts";
import { describe, expect, it } from "vitest";
import { buildReminderPresentation } from "./reminderPresentation";

/**
 * S-07 四則次要 CTA（2026-08-07 裁決）。
 *
 * 對照 `P0_SCREEN_INVENTORY.md`「次要 CTA 目的地」表：
 * 每則只在指定狀態出現，全數指向既有畫面或原地行為。
 */

const zone = {
  zoneInstanceId: "zone-1",
  bodyZoneCode: "face_forehead",
  customLabel: null,
  trackingStatus: "active",
  timingStatus: "untimed_action"
} as unknown as ZoneProjection;

function present(reasonCodes: ReasonCode[]) {
  const primaryAction = {
    presentationType: "untimed_action_card",
    variant: null,
    actionKind: "view_protection_options",
    affectedZoneInstanceIds: ["zone-1"],
    actionAt: null,
    reasonCodes,
    derivedFromEventRefs: []
  } as unknown as PrimaryAction;

  return buildReminderPresentation({
    primaryAction,
    zones: [zone],
    connectivity: "online",
    now: new Date("2026-08-07T10:00:00.000Z")
  });
}

function kinds(reasonCodes: ReasonCode[]): string[] {
  return present(reasonCodes).secondaryActions.map((action) => action.kind);
}

describe("S-07 次要 CTA", () => {
  it("時鐘不可信時提供「查看最近紀錄」", () => {
    const presentation = present(["CLOCK_UNTRUSTED"]);

    expect(presentation.secondaryActions).toEqual([
      { kind: "view_saved_records", label: "查看最近紀錄" }
    ]);
  });

  it.each([
    "PRODUCT_ABNORMAL_REPORTED",
    "PRODUCT_DISCOMFORT_REPORTED"
  ] as const)("產品安全事件 %s 提供「查看處理說明」", (reason) => {
    expect(kinds([reason])).toEqual(["view_handling_guidance"]);
  });

  it.each([
    "PRODUCT_IDENTITY_UNKNOWN",
    "PRODUCT_NO_SUNSCREEN_CLAIM",
    "PRODUCT_EXPIRED"
  ] as const)("產品標示問題 %s 提供「更新防護紀錄」", (reason) => {
    expect(kinds([reason])).toEqual(["update_protection_record"]);
  });

  it("衣物覆蓋的中性方式卡提供「更新防護方式」", () => {
    expect(kinds(["CLOTHING_COVERED"])).toEqual(["update_protection_method"]);
  });

  it("一般計時中的提醒沒有次要 CTA，不佔版位", () => {
    const trackingZone = {
      ...zone,
      timingStatus: "tracking"
    } as ZoneProjection;
    const presentation = buildReminderPresentation({
      primaryAction: {
        presentationType: "timed_ring",
        variant: null,
        actionKind: "record_reapplication",
        affectedZoneInstanceIds: ["zone-1"],
        actionAt: "2026-08-07T12:00:00.000Z",
        reasonCodes: [],
        derivedFromEventRefs: []
      } as unknown as PrimaryAction,
      zones: [trackingZone],
      connectivity: "online",
      now: new Date("2026-08-07T10:00:00.000Z")
    });

    expect(presentation.secondaryActions).toEqual([]);
  });

  it("產品安全事件不得誤用「更新防護紀錄」蓋掉處理說明", () => {
    // 異常／不適是醫療邊界，處理指引屬 S-17；
    // 導向補擦表單會讓使用者繼續使用已回報有問題的產品。
    expect(kinds(["PRODUCT_ABNORMAL_REPORTED"])).not.toContain(
      "update_protection_record"
    );
  });
});
