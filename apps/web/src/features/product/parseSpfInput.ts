/**
 * SPF 輸入的正規化。
 *
 * **會接受結尾的 `+`**（2026-09-03）。市面上的瓶身多半印「SPF50+」，照著抄
 * 是最自然的動作；改動前 `Number("50+")` 是 `NaN`，會被擋在「SPF 請填寫大於
 * 0 的數字，例如 50。」——而那句話沒說問題出在加號，使用者只會反覆重打同一
 * 個值。`+` 在標示上的意思是「至少這個數」，取 `50` 是保守的讀法。
 *
 * 抽成獨立模組而不是留在 `GearForm.vue` 裡，是為了讓它能被直接測——
 * 掛整個表單要造一份很大的 services mock，測不到這種字串邊界。
 *
 * `validate()` 與 `save()` 共用這一份。兩邊各自 parse 一次，是「畫面說可以
 * 存、實際存進去的卻是另一個值」這類 bug 的來源。
 */

/** 沒填是 `null`；填了但讀不出正數是 `"invalid"`。 */
export type ParsedSpf = number | null | "invalid";

export function parseSpfInput(raw: string): ParsedSpf {
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  // 只打了一個 `+` 不是「沒填」，是填錯——去掉加號後變空字串要當成錯誤。
  const numeric = trimmed.replace(/\+$/, "");
  if (numeric === "") return "invalid";

  const parsed = Number(numeric);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : "invalid";
}
