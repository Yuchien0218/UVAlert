import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 二次確認的按鈕不可以跟觸發鈕同文字（2026-09-04）。
 *
 * 使用者回報「我按清除，資料還在」。實測資料層是好的——按「清除裝備與
 * 歷史」之後出現的確認區裡，是**一顆文字一模一樣的「清除裝備與歷史」**
 * 加「取消」。按一次看起來像沒有反應，自然會判斷成清除失敗。
 *
 * 三個清除動作都走 `ConfirmAction`，所以規則掛在元件的使用點上：確認鈕要
 * 說出「我按下去就會發生」，不是把觸發鈕的字再寫一次。
 */

function vueFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...vueFiles(full));
    else if (entry.name.endsWith(".vue")) out.push(full);
  }
  return out;
}

/** 取出每一個 `<ConfirmAction …>` 開標籤的內容。 */
function confirmActions(source: string): string[] {
  return source.match(/<ConfirmAction[\s\S]*?>/g) ?? [];
}

function attr(tag: string, name: string): string | null {
  return (
    new RegExp(`(?:^|\\s):?${name}="([^"]*)"`).exec(tag)?.[1]?.trim() ?? null
  );
}

const USAGES = vueFiles("apps/web/src")
  .filter((file) => !file.endsWith("ConfirmAction.vue"))
  .flatMap((file) =>
    confirmActions(readFileSync(file, "utf8")).map((tag) => ({ file, tag }))
  );

describe("ConfirmAction 的兩顆按鈕不同字", () => {
  it("至少掃到三個使用點", () => {
    expect(USAGES.length).toBeGreaterThanOrEqual(3);
  });

  it.each(USAGES.map((usage, index) => [index, usage] as const))(
    "使用點 %i 的確認鈕與觸發鈕不同字",
    (_index, usage) => {
      const trigger = attr(usage.tag, "trigger-label");
      const confirm = attr(usage.tag, "confirm-label");

      expect(confirm, `${usage.file} 缺 confirm-label`).not.toBeNull();
      /*
       * 觸發鈕可能是動態的（沒有草稿時換一句），那時比不了字面值，
       * 只要求確認鈕存在——動態的那一組本來就不會跟確認鈕同字。
       */
      if (trigger !== null) {
        expect(confirm, usage.file).not.toBe(trigger);
      }
    }
  );
});
