import type {
  GearCategory,
  ProductCatalogRecordV1,
  ShadingRate,
  UvProtection
} from "@sunshield/contracts";
import type { IconName } from "../../generated/icons.generated";

export const GEAR_CATEGORY_LABELS: Record<GearCategory, string> = {
  sunscreen: "防曬乳",
  clothing: "防曬衣物",
  eyewear: "太陽眼鏡",
  umbrella: "陽傘",
  hat: "帽子",
  other_gear: "其他裝備"
};

/**
 * 每個品類對應的圖示。
 */
export const GEAR_CATEGORY_ICONS: Record<GearCategory, IconName> = {
  sunscreen: "gear-sunscreen",
  clothing: "gear-clothing",
  eyewear: "gear-sunglasses",
  umbrella: "gear-umbrella",
  hat: "gear-hat",
  other_gear: "gear-other"
};

/**
 * 每個品類對提醒的實際影響。
 *
 * 這段文字是本次擴充最主要的安全防線：使用者記錄墨鏡、陽傘或帽子時，
 * 不得讓人以為提醒行為會因此改變（S-11）。
 */
export const GEAR_CATEGORY_REMINDER_EFFECT: Record<GearCategory, string> = {
  sunscreen: "防曬乳將依設定，自動建立補擦倒數。",
  clothing: "被衣物遮住時不倒數，也不會自己產生補擦時間。",
  eyewear: "只做紀錄，不會影響補擦倒數。",
  umbrella: "只做紀錄，不會影響補擦倒數。",
  hat: "只做紀錄，不會影響補擦倒數。",
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

export const USAGE_RATING_LABELS = {
  good: "好用",
  ok: "普通",
  bad: "不好用"
} as const;

export const FORMULATION_LABELS = {
  lotion: "乳液",
  gel: "凝膠／水感",
  cream: "霜狀",
  spray: "噴霧",
  stick: "防曬棒"
} as const;

export const PROTECTION_TYPE_LABELS = {
  physical: "物理性",
  chemical: "化學性",
  hybrid: "混合型"
} as const;

export const SHADING_RATE_LABELS: Record<ShadingRate, string> = {
  complete: "完全遮光",
  grade_1: "一級遮光",
  grade_2: "二級遮光",
  grade_3: "三級遮光"
};

export const UV_PROTECTION_LABELS: Record<UvProtection, string> = {
  uv400: "UV400",
  "100_percent": "100% UV Protection",
  uv380: "UV380"
};

