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
    expect(source).toContain(
      '<ContextSelector v-if="showContextSelector" v-model="selectedContext" />'
    );
    expect(source).toContain(
      "() => !contextSettled.value || editingContext.value"
    );
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
