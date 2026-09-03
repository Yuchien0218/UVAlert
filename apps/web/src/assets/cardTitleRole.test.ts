import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 卡片標題一律 `card-title`（2026-09-03，使用者裁決）。
 *
 * 稽核實測：`card-title`（Inter 18px）用了 29 次、`section-title`（Noto Serif
 * TC 20px）用了 28 次，其中 **16 次長在 `.app-card` 裡**。最刺眼的一組在通知
 * 設定頁——兩張相鄰卡片、同樣是 `<h2>`，一張襯線 20 一張無襯線 18。
 *
 * 根因不是有人偷懶，是**判準沒寫**：這個 repo 幾乎每個區段都寫成
 * `<section class="app-card">`，「區段」與「卡片」永遠同時成立。裁決是以
 * **卡片邊界**為準，`DESIGN.md` 第五節已補上這段判準。
 */

const strip = (source: string): string =>
  source.replace(/<!--[\s\S]*?-->/g, "");

function vueFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...vueFiles(full));
    else if (entry.name.endsWith(".vue")) out.push(full);
  }
  return out;
}

/**
 * 逐檔掃 `<template>`，回傳「在 `.app-card` 內」的 `section-title` 位置。
 *
 * 靠標籤堆疊追蹤巢狀，不是靠字串距離——`toContain` 那種比法會把「同一個檔案
 * 裡剛好都出現過」也算成巢狀。
 */
function sectionTitlesInsideCards(source: string): number {
  const template = source.split("<template>")[1];
  if (template === undefined) return 0;

  const tags = /<(\w+)([^>]*)>|<\/(\w+)>/g;
  const stack: { card: boolean }[] = [];
  let insideCard = 0;
  let found = 0;
  let match: RegExpExecArray | null;

  while ((match = tags.exec(template)) !== null) {
    if (match[3] !== undefined) {
      const top = stack.pop();
      if (top?.card === true) insideCard--;
      continue;
    }
    const attrs = match[2] ?? "";
    if (attrs.trim().endsWith("/")) continue;

    const card = /class="[^"]*\bapp-card\b/.test(attrs);
    if (card) insideCard++;
    stack.push({ card });

    if (insideCard > 0 && /data-typography-role="section-title"/.test(attrs)) {
      found++;
    }
  }
  return found;
}

const FILES = vueFiles("apps/web/src");

describe("卡片標題一律 card-title", () => {
  it.each(FILES.map((f) => f.split(path.sep).join("/")))(
    "%s 的 app-card 裡沒有 section-title",
    (file) => {
      expect(sectionTitlesInsideCards(strip(readFileSync(file, "utf8")))).toBe(
        0
      );
    }
  );

  /*
   * **反向一：不是把 `section-title` 整個廢掉。** 只守上面那條的話，全站改成
   * 一種標題也是綠的——那時頁面區段與卡片標題再也分不出層級。沒有卡片外框
   * 的區段標題仍然要用它。
   */
  it("沒有卡片外框的頁面區段仍然用 section-title", () => {
    const survivors = [
      "apps/web/src/components/reminder/RecentEventsList.vue",
      "apps/web/src/pages/ProductsPage.vue",
      "apps/web/src/pages/education/EducationCategoryPage.vue"
    ];

    for (const file of survivors) {
      expect(strip(readFileSync(file, "utf8")), file).toContain(
        'data-typography-role="section-title"'
      );
    }
  });

  /*
   * **反向二：Bottom Sheet 的標題也留著。** 它看起來像卡片，但它是對話框，
   * `DESIGN.md` 第五節明列在 `section-title` 那一欄。
   */
  it("Bottom Sheet 的標題是 section-title", () => {
    expect(
      strip(readFileSync("apps/web/src/components/common/BottomSheet.vue", "utf8"))
    ).toContain('data-typography-role="section-title"');
  });

  /*
   * **反向三：判準要寫在 `DESIGN.md` 裡。** 只有測試沒有文件的話，下一個人
   * 讀到第五節那張表仍然會兩邊都覺得有理——那正是這次的根因。
   */
  it("DESIGN.md 寫下了兩者的判準", () => {
    const design = readFileSync("DESIGN.md", "utf8");

    expect(design).toContain("標題外面有卡片外框");
    expect(design).toContain("Dialog／Bottom Sheet 的標題");
  });
});
