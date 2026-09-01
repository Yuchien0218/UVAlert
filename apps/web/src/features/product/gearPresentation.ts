import type {
  GearCategory,
  ProductCatalogRecordV1
} from "@sunshield/contracts";
import type { IconName } from "../../generated/icons.generated";

export const GEAR_CATEGORY_LABELS: Record<GearCategory, string> = {
  sunscreen: "防曬乳",
  clothing: "防曬衣物",
  eyewear: "太陽眼鏡",
  other_gear: "其他裝備"
};

/**
 * 每個品類對應的圖示。
 *
 * **2026-08-31 收斂。** 這張表原本**逐字複製在 GearForm.vue 與
 * GearListItem.vue 兩個檔案裡**，GearForm 的註解甚至寫著「跟
 * GearListItem.vue 用同一組品類圖示對應」——用註解交代兩份要一致，就是
 * 「這裡遲早會漂移」的自白。兩份當時剛好同值，那是運氣不是機制。
 *
 * 放在這裡而不是新開一個檔案：`GEAR_CATEGORY_LABELS` 就在上面，兩者是
 * 同一種東西（品類 → 呈現用的常數），拆開反而讓人不知道該去哪找。
 *
 * 圖示挑選 2026-08-23 與 Claude Design 元件庫同步過。`gear-hat` 與
 * `gear-umbrella` 刻意不在這裡：品類只有四個，那兩顆對應不到任何一個
 * （#10 的裁決讓裝備清單只留名稱，帽子與傘沒有獨立品類）。
 */
export const GEAR_CATEGORY_ICONS: Record<GearCategory, IconName> = {
  sunscreen: "gear-sunscreen",
  clothing: "gear-clothing",
  eyewear: "gear-sunglasses",
  other_gear: "gear-other"
};

/**
 * 每個品類對提醒的實際影響。
 *
 * 這段文字是本次擴充最主要的安全防線：使用者記錄一副墨鏡時，
 * 不得讓人以為提醒行為會因此改變（S-11）。
 */
export const GEAR_CATEGORY_REMINDER_EFFECT: Record<GearCategory, string> = {
  sunscreen: "防曬乳將依設定，自動建立補擦倒數。",
  clothing: "被衣物遮住時不倒數，也不會自己產生補擦時間。",
  eyewear: "只做紀錄，不會影響補擦倒數。",
  other_gear: "只做紀錄，不會影響補擦倒數。"
};

/** 只有這個品類會產生補擦倒數。 */
export function affectsCountdown(category: GearCategory): boolean {
  return category === "sunscreen";
}

export type GearSafetyState =
  | { kind: "usable" }
  | { kind: "blocked"; label: string; detail: string }
  | { kind: "no_countdown"; label: string; detail: string };

/**
 * 裝備目前的安全／可用狀態。
 *
 * 異常與不適是封鎖狀態，不提供直接恢復（S-11／S-13）；
 * 其餘不合格只是「不會產生倒數」，仍可保留使用紀錄。
 */
export function gearSafetyState(
  product: ProductCatalogRecordV1
): GearSafetyState {
  const eligibility = product.currentSnapshot.ruleEligibilityAtApplication;

  if (eligibility === "abnormal_reported") {
    return {
      kind: "blocked",
      label: "回報過異常",
      detail: "這筆紀錄曾回報防曬乳異常，無法直接恢復。"
    };
  }
  if (eligibility === "discomfort_reported") {
    return {
      kind: "blocked",
      label: "回報過不適",
      detail: "這筆紀錄曾回報使用後不適，無法直接恢復。"
    };
  }
  if (!affectsCountdown(product.gearCategory)) {
    return { kind: "usable" };
  }
  if (eligibility === "expired") {
    return {
      kind: "no_countdown",
      label: "已過期",
      detail: "已超過到期日，不會建立補擦倒數。"
    };
  }
  if (eligibility === "identity_unconfirmed") {
    return {
      kind: "no_countdown",
      label: "身分未確認",
      detail: "包裝標示看不清楚，不會建立補擦倒數。"
    };
  }
  if (eligibility === "no_sunscreen_claim") {
    return {
      kind: "no_countdown",
      label: "無防曬標示",
      detail: "沒有明確的防曬標示，不會建立補擦倒數。"
    };
  }
  return { kind: "usable" };
}

export function formatPurchaseMonth(value: string | null): string | null {
  if (value === null) return null;
  const [year, month] = value.split("-");
  return `${year} 年 ${Number(month)} 月購買`;
}
