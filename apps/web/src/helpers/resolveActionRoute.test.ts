import { describe, expect, it } from "vitest";
import { ActionKindSchema } from "@sunshield/contracts";
import type { ActionKind } from "@sunshield/contracts";
import {
  resolveActionDestination,
  resolveActionRoute
} from "./resolveActionRoute";

/**
 * 對照依據：`P0_SCREEN_INVENTORY.md` S-07「`ActionKind` 目的地對照」（2026-08-06 裁決），
 * 以及 2026-08-07 移除逐部位防護方式後的兩則改道。
 */
describe("resolveActionRoute", () => {
  const REAPPLY_KINDS: ActionKind[] = [
    "record_reapplication",
    "resolve_cause",
    "complete_protection_record",
    "switch_protection"
  ];
  const PRODUCT_KINDS: ActionKind[] = [
    "confirm_protection_method",
    "view_protection_options"
  ];
  const IN_PLACE_KINDS: ActionKind[] = [
    "review_required_zones",
    "view_product_label",
    "recalibrate_clock",
    "view_ended_state"
  ];

  it.each(REAPPLY_KINDS)("%s 導向 S-08 補擦表單", (kind) => {
    expect(resolveActionRoute(kind)).toEqual({ name: "reminder-reapply" });
  });

  it.each(PRODUCT_KINDS)("%s 導向產品頁", (kind) => {
    // 移除逐部位防護方式後，這兩個狀態的唯一可行動作是換一個標示清楚的產品；
    // 原規格的「防護方式 sheet」已無方法可選。
    expect(resolveActionRoute(kind)).toEqual({ name: "products" });
  });

  it("review_required_zones 導向提醒頁的部位錨點", () => {
    expect(resolveActionRoute("review_required_zones")).toEqual({
      name: "reminder",
      hash: "#zone-status"
    });
  });

  it("view_conservative_reminder 導向 S-16 運作說明", () => {
    // 時鐘不可信且離線時的落點；規格指定 S-16，不是 placeholder。
    expect(resolveActionRoute("view_conservative_reminder")).toEqual({
      name: "help-how-it-works"
    });
  });

  it("回報類 ActionKind 導向 S-09", () => {
    expect(resolveActionRoute("report_context_event")).toEqual({
      name: "reminder-report"
    });
    // 入水時間未知由 S-09 第二層處理，不另開畫面。
    expect(resolveActionRoute("resolve_water_start")).toEqual({
      name: "reminder-report"
    });
  });

  it("13 個 ActionKind 全部有真實落點，沒有一個落在 placeholder", () => {
    const allKinds = ActionKindSchema.options as readonly ActionKind[];

    for (const kind of allKinds) {
      expect(resolveActionRoute(kind)).not.toMatchObject({
        name: "reminder-action"
      });
    }
  });

  it("涵蓋契約中全部 ActionKind，沒有漏接的分支", () => {
    const allKinds = ActionKindSchema.options as readonly ActionKind[];

    expect(allKinds.length).toBe(13);
    for (const kind of allKinds) {
      const route = resolveActionRoute(kind);
      expect(route).toBeDefined();
      // placeholder 路由已移除，這裡列的都必須是實際存在的 route name。
      expect([
        "reminder-reapply",
        "reminder-report",
        "products",
        "reminder",
        "help-how-it-works"
      ]).toContain((route as { name: string }).name);
    }
  });

  it("非補擦類 ActionKind 不得誤導向補擦表單", () => {
    const nonReapply = (
      ActionKindSchema.options as readonly ActionKind[]
    ).filter((kind) => !REAPPLY_KINDS.includes(kind));

    // 誤導向補擦表單會讓使用者為沒有補擦的部位建立 Application，
    // 進而產生不該存在的倒數——這是安全性問題，不只是導覽錯誤。
    for (const kind of nonReapply) {
      expect((resolveActionRoute(kind) as { name: string }).name).not.toBe(
        "reminder-reapply"
      );
    }
  });
});

describe("resolveActionDestination", () => {
  it.each([
    ["review_required_zones", "anchor_zones"],
    ["view_product_label", "expand_product_label"],
    ["recalibrate_clock", "recalibrate_clock"],
    ["view_ended_state", "ended_state"]
  ] as const)("%s 在提醒頁就地處理，不換頁", (kind, behavior) => {
    expect(resolveActionDestination(kind)).toEqual({
      kind: "in_place",
      behavior
    });
  });

  it("換頁類仍回傳 route", () => {
    expect(resolveActionDestination("record_reapplication")).toEqual({
      kind: "route",
      to: { name: "reminder-reapply" }
    });
  });

  it("每個 ActionKind 都有明確目的地", () => {
    for (const kind of ActionKindSchema.options as readonly ActionKind[]) {
      const destination = resolveActionDestination(kind);
      expect(["route", "in_place"]).toContain(destination.kind);
    }
  });
});
