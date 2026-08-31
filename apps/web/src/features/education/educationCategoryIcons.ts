import type { IconName } from "../../generated/icons.generated";
import type { EducationCategory } from "./educationContent";

/**
 * 衛教分類 → 圖示。
 *
 * 這六個圖示 2026-08-29 就已經畫好並進了註冊表，`label` 與分類 `title`
 * 逐字相同——它們本來就是為這六個分類畫的。
 *
 * 寫成顯式對應表而不是 `education-${slug}` 拼字串，有兩個理由：
 * 一是 `reapply-sunscreen` 對應的圖示叫 `education-reapply`，六個裡有一個
 * 對不上；二是 `educationCategories` 是產生出來的，將來新增第七個分類時
 * 拼字串會在執行期才炸，而 `satisfies` 會在 typecheck 就紅。
 *
 * **2026-08-31 從 EducationIndexPage 搬出來。** 主題頁的標題也要帶同一個
 * 圖示（使用者要求），兩頁必須指到同一份對應——放在頁面檔案裡的話，第二
 * 個使用者只能複製一份，然後兩份開始各自漂移。
 */
export const EDUCATION_CATEGORY_ICONS = {
  "uv-basics": "education-uv-basics",
  "before-going-out": "education-before-going-out",
  "reapply-sunscreen": "education-reapply",
  "sweat-and-water": "education-sweat-and-water",
  "after-sun-care": "education-after-sun-care",
  "special-situations": "education-special-situations"
} satisfies Record<EducationCategory["slug"], IconName>;

export function educationCategoryIcon(
  slug: EducationCategory["slug"]
): IconName {
  return EDUCATION_CATEGORY_ICONS[slug];
}
