import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * `/setup` 的版面守門（2026-08-31）。
 *
 * 這一頁有 `requiresNoActiveSession` 路由守衛，掛載整頁需要一整套 boot／
 * setup／productSettings 的假物件；這裡要守的是**版面決策**，掃原始碼就夠。
 *
 * 掃描前先剝註解（CLAUDE.md 守門測試段的坑一）——否則下面這段說明裡提到
 * 的 class 名稱本身就會讓斷言通過。
 */

const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const source = strip(
  readFileSync("apps/web/src/pages/setup/SetupPage.vue", "utf8")
);

describe("/setup 已完成的步驟收成一行摘要", () => {
  /*
   * 三件事分開守。合成一條的話，少掉任何一項都可能被另外兩項掩護：
   * 只守「選擇器有條件」→ 摘要可以不存在；只守「摘要存在」→ 選擇器可以
   * 照樣常駐（變成兩份都在）；只守「有更改鈕」→ 它可能改不回去。
   */
  it("情境選擇器只在未選好或正在更改時渲染", () => {
    expect(source).toMatch(
      /<ContextSelector[\s\S]{0,80}v-if="showContextSelector"/
    );

    /*
     * 2026-09-04：比對條件本身而不是那一整行字面量。原本比的是完整的
     * `() => !contextSettled.value || editingContext.value`——那條在收尾旗標
     * 加進來的當下就紅了，但它紅的是「換行了」，不是「條件壞了」。
     */
    const gate = /const showContextSelector = computed\(([\s\S]*?)\n\);/.exec(
      source
    )?.[1];

    expect(gate, "找不到 showContextSelector").toBeDefined();
    expect(gate).toContain("!contextSettled.value");
    expect(gate).toContain("editingContext.value");
  });

  it("選好之後改成一行摘要，顯示目前的情境", () => {
    expect(source).toContain('<div v-else class="setup-step-summary">');
    expect(source).toContain("CONTEXT_LABELS[context]");
  });

  /*
   * 收起來之後回頭修改的路徑必須夠明顯，否則就是把已完成的決定藏起來。
   */
  it("摘要旁邊有「更改」，而且真的會重新展開", () => {
    expect(source).toContain("更改");
    expect(source).toContain('@click="editingContext = true"');
  });

  /*
   * 改完要收回去，否則按過一次「更改」之後選擇器就永遠攤開，收合等於只
   * 生效一次。
   */
  it("選了新的情境之後自動收回摘要", () => {
    expect(source).toContain("editingContext.value = false;");
  });
});

/**
 * 2026-09-04：選好情境之後不要瞬間收掉（使用者：「選項收合的很突然」）。
 */
describe("情境選擇器的收尾", () => {
  /*
   * 實測：點「水上活動」→ 點「準備下水」，四個揭露面板瞬間只剩一個——
   * 約 400px 的內容硬切成一行 39px 的摘要，零過渡。根因是 watch 在同一個
   * tick 就把 `editingContext` 關掉，`contextSettled` 也同時為真。
   *
   * 收合的時間點只有 ContextSelector 知道（哪個面板開著、動畫跑完沒），
   * 所以由它發 `settled`，這一頁照著收。
   */
  it("等 ContextSelector 說收乾淨了才換成摘要列", () => {
    expect(source).toMatch(/<ContextSelector[\s\S]{0,160}@settled=/);
    expect(source).toContain("contextSettling.value = false;");

    const gate = /const showContextSelector = computed\(([\s\S]*?)\n\);/.exec(
      source
    )?.[1];

    expect(gate).toContain("contextSettling.value");
  });

  /*
   * **反向：儲存不可以跟著延後。** 只守上面那條的話，把整個 watch 包進
   * setTimeout 也會過——那會讓使用者選完情境後有幾百毫秒的空窗，期間離開
   * 頁面就什麼都沒存到。
   */
  it("儲存仍然在選好的當下就發生", () => {
    const body = /watch\(selectedContext, async[\s\S]*?\n\}\);/.exec(source)?.[0];

    expect(body, "找不到 selectedContext 的 watch").toBeDefined();
    expect(body).toContain("await setup.ensureLoaded();");
    expect(body).not.toContain("setTimeout");
  });
});
