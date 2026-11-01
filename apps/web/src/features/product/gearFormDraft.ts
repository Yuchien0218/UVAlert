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

export interface ScannerPhotosDraftState {
  frontImageDataUrl: string | null;
  backImageDataUrl: string | null;
}

export const GEAR_FORM_DRAFT_STORAGE_KEY = "uvalert_gear_form_draft_v1";
export const SCANNER_PHOTOS_DRAFT_STORAGE_KEY =
  "uvalert_scanner_photos_draft_v1";

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
 * 暫存拍照掃描器的正面與背面壓縮後照片，防止行動裝置分頁重載導致已拍照片遺失。
 */
export function saveScannerPhotosDraft(
  photos: ScannerPhotosDraftState
): void {
  if (
    typeof window === "undefined" ||
    typeof window.sessionStorage === "undefined"
  ) {
    return;
  }
  try {
    if (
      photos.frontImageDataUrl === null &&
      photos.backImageDataUrl === null
    ) {
      window.sessionStorage.removeItem(SCANNER_PHOTOS_DRAFT_STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(
      SCANNER_PHOTOS_DRAFT_STORAGE_KEY,
      JSON.stringify(photos)
    );
  } catch {
    // 忽略 QuotaExceededError 或無痕模式拋錯
  }
}

/**
 * 讀取暫存的掃描器正反面壓縮照片。
 */
export function loadScannerPhotosDraft(): ScannerPhotosDraftState | null {
  if (
    typeof window === "undefined" ||
    typeof window.sessionStorage === "undefined"
  ) {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(SCANNER_PHOTOS_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null) return null;
    return {
      frontImageDataUrl:
        typeof parsed.frontImageDataUrl === "string"
          ? parsed.frontImageDataUrl
          : null,
      backImageDataUrl:
        typeof parsed.backImageDataUrl === "string"
          ? parsed.backImageDataUrl
          : null
    };
  } catch {
    return null;
  }
}

/**
 * 清除掃描器正反面照片暫存。
 */
export function clearScannerPhotosDraft(): void {
  if (
    typeof window === "undefined" ||
    typeof window.sessionStorage === "undefined"
  ) {
    return;
  }
  try {
    window.sessionStorage.removeItem(SCANNER_PHOTOS_DRAFT_STORAGE_KEY);
  } catch {
    // 忽略異常
  }
}

/**
 * 清除 sessionStorage 中的裝備表單草稿與掃描器照片暫存。
 * 通常於儲存成功或使用者明確點擊取消時呼叫。
 */
export function clearGearFormDraft(): void {
  clearScannerPhotosDraft();
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
