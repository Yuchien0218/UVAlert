import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 「右上角叉叉跑版」的守門。
 *
 * 這個 bug 在 2026-08-31 一天內出現三次，**根因每次都相同**：`IconButton`
 * 本身沒問題（44px 命中區、32px 視覺圓），壞的是**外面那一層容器讓叉叉
 * 獨佔一列，而那一列左邊什麼都沒有**。
 *
 * 實測代價：`SetupStepShell` 約 76px、`.detail-header`（裝備詳情與通知
 * 設定共用）60px、首頁夜間的 `SessionEndControl` 64px。
 *
 * 所以這裡守的不是「叉叉長得對不對」，是**它有沒有跟別的東西同一列**。
 * 具體形狀：一個 `<header>` 裡面只有 IconButton，沒有任何其他元素。
 *
 * **這個 bug 單元測試抓不到**——三次都是截圖才發現（見 CLAUDE.md「有些
 * 問題只有畫出來看才找得到」）。這條測試補的正是那個缺口：它守的是**結構**
 * （DOM 裡有沒有同伴），不是排版結果，所以 happy-dom 量不到位置也擋得住。
 *
 * vitest 的 cwd 是 repo 根目錄。
 */

const SRC = "apps/web/src";

/** 掃描前先剝註解——理由見 CLAUDE.md「守門測試：坑一」。 */
function stripComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function vueFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry !== "generated") vueFiles(path, out);
    } else if (entry.endsWith(".vue")) {
      out.push(path);
    }
  }
  return out;
}

/**
 * 找出「內容只有一個 IconButton」的 `<header>` 區塊。
 *
 * 用 `<header>` 當判定範圍是刻意的：叉叉出現在別種容器裡不一定是問題
 * （`SessionEndControl` 自己就只是一個包住按鈕的 div，它是不是跑版取決
 * 於**使用它的頁面**把它放在哪一列）。而 `<header>` 帶著「這是這一段的
 * 標頭」的語意——標頭裡只有一顆按鈕、沒有任何標題，那就是這個 bug。
 */
function lonelyCloseHeaders(source: string): string[] {
  const found: string[] = [];
  for (const match of source.matchAll(/<header[^>]*>([\s\S]*?)<\/header>/g)) {
    const inner = match[1]!;
    if (!inner.includes("<IconButton")) continue;

    // 把 IconButton 整段拿掉之後，還剩下任何標籤或文字嗎？
    const rest = inner
      .replace(/<IconButton[\s\S]*?\/>/g, "")
      .replace(/<IconButton[\s\S]*?<\/IconButton>/g, "")
      .trim();

    if (rest === "") found.push(match[0].slice(0, 60));
  }
  return found;
}

describe("右上角叉叉不能獨佔空的一列", () => {
  it("沒有任何 <header> 只裝著一個 IconButton", () => {
    const offenders: string[] = [];
    for (const path of vueFiles(SRC)) {
      const source = stripComments(readFileSync(path, "utf8"));
      for (const header of lonelyCloseHeaders(source)) {
        offenders.push(`${path} → ${header}`);
      }
    }

    expect(
      offenders,
      "叉叉要跟標題同一列（範本：app.css 的 .flow-heading）"
    ).toEqual([]);
  });

  /*
   * `.detail-header` 是這個 bug 的載體：兩頁共用它，而它的定義就是
   * 「flex 靠右」——一個只放得下按鈕的容器。整批改掉之後這個 class 不該
   * 再出現，否則下一個人會照著它再造一次。
   */
  it("不再有 .detail-header 這個 class", () => {
    const offenders: string[] = [];
    for (const path of vueFiles(SRC)) {
      const source = stripComments(readFileSync(path, "utf8"));
      if (source.includes("detail-header")) offenders.push(path);
    }

    expect(offenders, "改用 .flow-heading，不要再造一個只放按鈕的容器").toEqual(
      []
    );
  });
});
