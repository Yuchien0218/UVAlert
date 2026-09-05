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

  it.each(REAPPLY_KINDS)("%s 導向 S-08 補擦表單", (kind) => {
    expect(resolveActionRoute(kind)).toEqual({ name: "reminder-reapply" });
  });

  it.each(PRODUCT_KINDS)("%s 導向產品頁", (kind) => {
    // 移除逐部位防護方式後，這兩個狀態的唯一可行動作是換一個標示清楚的產品；
    // 原規格的「防護方式 sheet」已無方法可選。
    expect(resolveActionRoute(kind)).toEqual({ name: "products" });
  });

  // 2026-08-24：/reminder 已併入首頁，錨點仍有效（部位清單在首頁下半部）。
  it("review_required_zones 導向首頁的部位錨點", () => {
    expect(resolveActionRoute("review_required_zones")).toEqual({
      name: "home",
      hash: "#zone-status"
    });
  });

  /*
   * **2026-09-03：不得再導向 `/help/how-it-works`。**
   *
   * 那頁的兩則主題都還是 `MULTI_REVIEW`，畫面上只有「內容正在審查」。
   * 時鐘不可信又離線時把使用者送去一頁空白，等於在最需要說明的狀態下什麼
   * 都不說——所以改成原地展開。
   *
   * 兩個方向分開守：這條守「不會跳到審查中的頁面」，
   * 下一條守「原地行為確實是說明」。
   */
  it("view_conservative_reminder 不導向仍在審查的說明頁", () => {
    expect(resolveActionRoute("view_conservative_reminder")).not.toEqual({
      name: "help-how-it-works"
    });
  });

  it("view_conservative_reminder 是原地說明，不換頁", () => {
    expect(resolveActionDestination("view_conservative_reminder")).toEqual({
      kind: "in_place",
      behavior: "explain_shortened_interval"
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
        "home",
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
