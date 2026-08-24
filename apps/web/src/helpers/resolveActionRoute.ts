import type { ActionKind } from "@sunshield/contracts";
import type { RouteLocationRaw } from "vue-router";

/**
 * `ActionKind` 到目的地的單一對照表。
 *
 * 對照依據為 `P0_SCREEN_INVENTORY.md` S-07「`ActionKind` 目的地對照」（2026-08-06 裁決）：
 * 13 個 ActionKind 全數對應到既有 P0 畫面或 S-07 原地行為，不新增畫面。
 *
 * 首頁與提醒頁共用本模組。先前兩頁各自持有一份相同的 `handleAction`，
 * 只接上 `record_reapplication`；抽成共用表是為了避免兩邊各自漂移。
 */

/** 目前導向 S-08 補擦表單的 ActionKind。 */
const REAPPLY_ACTION_KINDS = new Set<ActionKind>([
  // 一般補擦：`reapply_due`／`reapply_soon`
  "record_reapplication",
  // 由規則推導，非選擇：RR-P0-CAUSE-002 只有嚴格較晚的合格 Application 才能解除原因
  "resolve_cause",
  // 首次記錄變體：`recordStatus === "unrecorded"`，該部位沒有既有 Application
  "complete_protection_record",
  // 產品安全封鎖且皮膚外露，必須改用其他產品
  "switch_protection"
]);

/**
 * 目的地是產品頁的 ActionKind（2026-08-07 裁決後改道）。
 *
 * 規格原本把這兩者導向 S-07 的防護方式 sheet，但設定流程移除逐部位防護方式後，
 * 該 sheet 只剩部位增減，無法解決「產品標示不合格」這個實際問題。
 * 這兩個狀態的唯一可行動作是換一個標示清楚的產品，所以改導向既有的產品頁——
 * 仍符合「不新增畫面」原則。
 */
const PRODUCT_ACTION_KINDS = new Set<ActionKind>([
  // `recordStatus === "unknown"`：僅舊資料會產生
  "confirm_protection_method",
  // `none_reported` 或 Application 不具資格：新模型下由產品標示不合格造成
  "view_protection_options"
]);

/**
 * 目的地是 S-09 回報狀況的 ActionKind。
 *
 * `resolve_water_start` 也走這裡：S-09 第二層的「知道實際下水時間嗎」
 * 就是處理入水時間未知的地方，不需要另開畫面。
 */
const REPORT_ACTION_KINDS = new Set<ActionKind>([
  "report_context_event",
  "resolve_water_start"
]);

/** 在提醒頁就地完成、不換頁的行為。 */
export type InPlaceBehavior =
  | "anchor_zones"
  | "expand_product_label"
  | "recalibrate_clock"
  | "ended_state";

const IN_PLACE_BEHAVIORS: Partial<Record<ActionKind, InPlaceBehavior>> = {
  review_required_zones: "anchor_zones",
  view_product_label: "expand_product_label",
  recalibrate_clock: "recalibrate_clock",
  view_ended_state: "ended_state"
};

export type ActionDestination =
  | { kind: "route"; to: RouteLocationRaw }
  | { kind: "in_place"; behavior: InPlaceBehavior };

/** 提醒頁用：區分換頁與原地行為。 */
export function resolveActionDestination(
  actionKind: ActionKind
): ActionDestination {
  const inPlace = IN_PLACE_BEHAVIORS[actionKind];
  if (inPlace !== undefined) {
    return { kind: "in_place", behavior: inPlace };
  }
  return { kind: "route", to: resolveActionRoute(actionKind) };
}

/**
 * 回傳該 `ActionKind` 應前往的 route。
 *
 * 原地行為在此回傳提醒頁本身（含錨點），供首頁等其他畫面導向；
 * 提醒頁自己應改用 `resolveActionDestination`。
 *
 * 尚未實作目的地的 ActionKind 一律導向 `/reminder/action/:kind` placeholder，
 * 讓未接上的流程有明確落點而不是靜默失效。
 */
export function resolveActionRoute(kind: ActionKind): RouteLocationRaw {
  if (REAPPLY_ACTION_KINDS.has(kind)) {
    return { name: "reminder-reapply" };
  }
  if (PRODUCT_ACTION_KINDS.has(kind)) {
    return { name: "products" };
  }
  if (REPORT_ACTION_KINDS.has(kind)) {
    return { name: "reminder-report" };
  }
  // 時鐘不可信且離線時的保守提醒說明（S-16）。
  if (kind === "view_conservative_reminder") {
    return { name: "help-how-it-works" };
  }
  // 2026-08-24：`/reminder` 已移除、內容併入首頁，這些落點改指 home。
  // #zone-status 錨點仍然有效——部位清單現在在首頁下半部。
  if (IN_PLACE_BEHAVIORS[kind] !== undefined) {
    return kind === "review_required_zones"
      ? { name: "home", hash: "#zone-status" }
      : { name: "home" };
  }
  // 13 個 ActionKind 上面全數涵蓋，這行實際不可達；
  // placeholder 路由已於 2026-08-08 移除，保留首頁當防禦性落點，
  // 未來若契約新增 ActionKind 也不會導到不存在的 route。
  return { name: "home" };
}
