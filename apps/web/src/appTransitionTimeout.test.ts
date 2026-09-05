import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 換頁轉場在隱藏的文件裡會卡住（2026-09-04 頁面健檢的發現一）。
 *
 * Vue 預設等 `transitionend` 才算離場結束，而 `mode="out-in"` 又要等離場結束
 * 才掛新元件。**隱藏的文件不跑 `requestAnimationFrame`**，於是離場永遠停在
 * `page-leave-from` 那一格，`transitionend` 永遠不來——新頁面永遠不掛載。
 * 實測到路由與 `document.title` 都變了，畫面卻停在三頁以前，真實情境是背景
 * 分頁。
 *
 * 這不只是「動畫沒播」：元件不掛載，`onMounted` 就不跑，任何靠它做的事都
 * 一起停住。
 *
 * 解法是 `@leave` 這個 JS hook——收下 `done` 之後 Vue 就不等 `transitionend`，
 * 而 `setTimeout` 在隱藏的文件裡照樣觸發。
 */

const strip = (source: string): string =>
  source.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

const APP = strip(readFileSync("apps/web/src/App.vue", "utf8"));
const TOKENS = readFileSync("packages/ui/src/styles.css", "utf8");
const SHARED_CSS = strip(readFileSync("apps/web/src/assets/app.css", "utf8"));

const leaveTimeout = (): number => {
  const match = /const LEAVE_TIMEOUT_MS = (\d+);/.exec(APP);
  expect(match, "找不到 LEAVE_TIMEOUT_MS").not.toBeNull();
  return Number(match![1]);
};

const fastDuration = (): number => {
  const match = /--duration-fast:\s*(\d+)ms;/.exec(TOKENS);
  expect(match, "找不到 --duration-fast").not.toBeNull();
  return Number(match![1]);
};

describe("換頁的離場不依賴 transitionend", () => {
  /*
   * 比對完整屬性，不是 "leave" 這個字——只找片語的話，註解裡提到它就會讓
   * 測試通過（CLAUDE.md 坑一與坑二）。
   */
  it("Transition 掛了 leave hook，而且保留 out-in", () => {
    expect(APP).toContain('mode="out-in"');
    expect(APP).toContain('@leave="finishLeave"');
  });

  /*
   * **hook 一定要收下 done。** 少了第二個參數，Vue 會判定它不是明確的回呼，
   * 回頭去等 `transitionend`——外觀完全一樣，卡住的問題原封不動回來。
   */
  it("hook 收下 done 並用計時器呼叫它", () => {
    expect(APP).toMatch(
      /function finishLeave\([^)]*done: \(\) => void\)[\s\S]{0,120}?setTimeout\(done, LEAVE_TIMEOUT_MS\)/
    );
  });

  /*
   * 保險絲要比 CSS 淡出長。抓得比淡出短的話，元素會在還沒淡完就被拔掉——
   * 那是會閃一下的破圖，而且只有在可見的瀏覽器裡看得到。
   */
  it("保險絲比 CSS 淡出長，但不至於久到像卡住", () => {
    const timeout = leaveTimeout();
    const fade = fastDuration();

    expect(timeout).toBeGreaterThan(fade);
    expect(timeout).toBeLessThanOrEqual(fade + 100);
  });

  /*
   * **計時器是保底，不是時長。**
   *
   * 只有計時器的話，可見時也要等滿 200ms——但 CSS 淡出 160ms 就結束了，
   * 中間 40ms 是舊頁已經全透明、新頁還沒掛的純空窗。使用者回報「看起來很卡」
   * 的其中一段就是它。所以要監聽 transitionend 搶先放行，並把計時器清掉
   * （不清的話 done 會被呼叫兩次）。
   */
  it("可見時由 transitionend 先放行，並清掉保底計時器", () => {
    expect(APP).toMatch(/addEventListener\(\s*"transitionend"/);
    expect(APP).toMatch(/clearTimeout\(timer\)/);
    expect(APP).toContain("{ once: true }");
  });

  /* 動畫本身仍然在 CSS 裡，hook 只負責宣告結束。 */
  it("淡出仍由 CSS 負責，用的是同一顆 token", () => {
    expect(SHARED_CSS).toMatch(
      /\.page-leave-active\s*\{[^}]*transition:\s*opacity var\(--duration-fast\)/
    );
    expect(SHARED_CSS).toMatch(/\.page-leave-to\s*\{[^}]*opacity:\s*0;/);
  });
});
