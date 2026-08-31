// @vitest-environment happy-dom
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 2026-08-31。這一頁先前沒有任何測試。
 *
 * 兩件事分開守：新增鈕的位置，以及**一整類會靜默壞掉的 bug**。
 *
 * 那一類 bug 這次真的踩到了：`SetupProcessBanner` emit `resume`，元件測試
 * 也驗證了 emit 有發出——但 `ProductsPage` 寫的是
 * `<SetupProcessBanner v-if="..." />`，**沒有 `@resume` 監聽器**。所以那顆
 * 「返回提醒設定」按鈕按下去什麼都不會發生，而測試全綠。Vue 對「emit 了
 * 但沒人聽」不會報錯也不會警告，這種錯只能靠掃描抓。
 */

const sourceRoot = "apps/web/src";

const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

function discoverVueFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return discoverVueFiles(entryPath);
    return entry.name.endsWith(".vue") ? [entryPath] : [];
  });
}

const productsPage = strip(
  readFileSync("apps/web/src/pages/ProductsPage.vue", "utf8")
);

describe("ProductsPage", () => {
  /*
   * 使用者裁決：先看有什麼、再決定要不要加。守的是「新增鈕出現在使用中
   * 那個 section 之後」，用兩者在原始碼裡的位置比較——只斷言按鈕存在的
   * 話，把它搬回清單上方仍然會綠。
   */
  it("新增鈕排在「使用中」區塊之後", () => {
    const currentSection = productsPage.indexOf(
      'aria-labelledby="gear-current-title"'
    );
    const addButton = productsPage.indexOf("新增防曬裝備", currentSection);
    const pastSection = productsPage.indexOf(
      'aria-labelledby="gear-past-title"'
    );

    expect(currentSection).toBeGreaterThan(-1);
    expect(addButton).toBeGreaterThan(currentSection);
    expect(pastSection).toBeGreaterThan(addButton);
  });

  it("不再渲染已移除的設定流程橫幅", () => {
    expect(productsPage).not.toContain("SetupProcessBanner");
  });
});

/**
 * 「元件 emit 了，但用它的頁面沒有接」——Vue 不會報錯，測試也照樣全綠。
 *
 * 掃描方式：找出每個元件宣告的 emit 名稱，再檢查每個把它掛上去的地方有
 * 沒有對應的 `@name`。只看**必要**的 emit（元件的唯一動作），所以用
 * 允許清單放行「可選的通知型 emit」，而不是反過來把全部都放行。
 */
describe("元件 emit 有人接", () => {
  /** 可選的 emit：沒接也不會讓功能壞掉。 */
  const OPTIONAL_EMITS = new Set([
    "update:modelValue", // v-model 的另一半，由 v-model 語法自動接
    "refresh",
    "saved",
    "close",
    "cancel",
    "back",
    "accept",
    "adjust",
    "open",
    "start",
    "confirm",
    "resetError",
    "locate",
    "save",
    "select"
  ]);

  const files = discoverVueFiles(sourceRoot).sort();

  it("有掃到檔案（避免走訪壞掉時靜默通過）", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  for (const file of files) {
    it(`${file} 使用到的元件，必要 emit 都有人接`, () => {
      const source = strip(readFileSync(file, "utf8"));
      const offenders: string[] = [];

      for (const match of source.matchAll(
        /<([A-Z][A-Za-z0-9]*)\b([^>]*?)\/?>/g
      )) {
        const componentName = match[1]!;
        const attributes = match[2] ?? "";
        const componentFile = files.find(
          (candidate) =>
            candidate.endsWith(`${componentName}.vue`) && candidate !== file
        );
        if (componentFile === undefined) continue;

        const emitBlock = strip(readFileSync(componentFile, "utf8")).match(
          /defineEmits<\{([\s\S]*?)\}>\(\)/
        );
        if (emitBlock === null) continue;

        for (const emitMatch of emitBlock[1]!.matchAll(
          /^\s*([A-Za-z][A-Za-z0-9]*)\s*:/gm
        )) {
          const emitName = emitMatch[1]!;
          if (OPTIONAL_EMITS.has(emitName)) continue;
          if (attributes.includes(`@${emitName}`)) continue;
          offenders.push(`<${componentName}> 的 @${emitName}`);
        }
      }

      expect(
        offenders,
        `${file} 用了元件卻沒有接它的必要 emit：${offenders.join("、")}。` +
          `Vue 不會為此報錯，按鈕會變成按了沒反應。`
      ).toEqual([]);
    });
  }
});
