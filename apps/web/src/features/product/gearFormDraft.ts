import type {
  GearCategory,
  ShadingRate,
  UvProtection
} from "@sunshield/contracts";
import type { ProductSnapshotFormValue } from "../setup/productSnapshot";

export interface GearFormDraftState {
  gearCategory: GearCategory;
  displayName: string;
  purchaseMonth: string;
  expiryDate: string;
  note: string;
  priceTwd: string;
  usageRating: "good" | "ok" | "bad" | "";
  spfInput: string;
  paGradeInput: string;
  snapshotForm: ProductSnapshotFormValue;
  size: string;
  color: string;
  volume: string;
  formulation: "lotion" | "gel" | "cream" | "spray" | "stick" | "";
  protectionType: "physical" | "chemical" | "hybrid" | "";
  upf: string;
  shadingRate: ShadingRate | "";
  weight: string;
  hatStyle: string;
  uvProtection: UvProtection | "";
  aiFilledFields: string[];
  aiNotes: string | null;
  aiScanWarning: string | null;
  showPhotoScanner?: boolean;
}

export const GEAR_FORM_DRAFT_STORAGE_KEY = "uvalert_gear_form_draft_v1";

/**
 * 將使用者在新增裝備表單的輸入狀態暫存至 sessionStorage。
 * 避免行動裝置切換相機或記憶體回收時造成頁面重載資料丟失。
 */
export function saveGearFormDraft(draft: GearFormDraftState): void {
  if (
    typeof window === "undefined" ||
    typeof window.sessionStorage === "undefined"
  ) {
    return;
  }
  try {
    window.sessionStorage.setItem(
      GEAR_FORM_DRAFT_STORAGE_KEY,
      JSON.stringify(draft)
    );
  } catch {
    // 忽略 QuotaExceededError 或無痕模式拋錯
  }
}

/**
 * 從 sessionStorage 讀取暫存的裝備表單草稿。
 * 成功回傳草稿物件，失敗或無草稿則回傳 null。
 */
export function loadGearFormDraft(): GearFormDraftState | null {
  if (
    typeof window === "undefined" ||
    typeof window.sessionStorage === "undefined"
  ) {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(GEAR_FORM_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as GearFormDraftState;
  } catch {
    return null;
  }
}

/**
 * 清除 sessionStorage 中的裝備表單草稿。
 * 通常於儲存成功或使用者明確點擊取消時呼叫。
 */
export function clearGearFormDraft(): void {
  if (
    typeof window === "undefined" ||
    typeof window.sessionStorage === "undefined"
  ) {
    return;
  }
  try {
    window.sessionStorage.removeItem(GEAR_FORM_DRAFT_STORAGE_KEY);
  } catch {
    // 忽略異常
  }
}
