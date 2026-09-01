// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 2026-09-01 第八批的裝備兩頁。
 *
 * 使用者三項：清單頁「使用中／收納中」之間加分隔線、詳情頁的叉叉改成返回、
 * 「裝備資訊」那張卡的文字看起來很怪。
 */

const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const LIST = strip(readFileSync("apps/web/src/pages/ProductsPage.vue", "utf8"));
const DETAIL = strip(
  readFileSync("apps/web/src/pages/ProductDetailPage.vue", "utf8")
);

describe("裝備清單的分隔線", () => {
  it("使用中與收納中之間有一條線", () => {
    expect(LIST).toContain('<hr v-if="past.length > 0" class="gear-section-rule" />');
    expect(LIST).toMatch(
      /\.gear-section-rule \{[^}]*border-top:\s*1px solid var\(--border-subtle\);/
    );
  });

  /*
   * 沒有收納中的裝備時不畫線——一條下面什麼都沒有的線，讀起來像內容沒載入
   * 完。條件與那個 section 的 v-if 綁在一起。
   */
  it("沒有收納中的裝備時不畫線", () => {
    expect(LIST).toContain('v-if="past.length > 0" class="gear-section-rule"');
  });
});

describe("裝備詳情的離開方式", () => {
  /*
   * 這一頁不是流程也不是浮層，它是清單的下一層——離開就是回到上一層。
   * 叉叉的語意是「關掉」，用在這裡會讓人以為按下去等於丟棄什麼。
   *
   * 兩個方向都守：要有返回箭頭，而且不可以再出現叉叉。只守前者的話，兩顆
   * 都放著也會過。
   */
  it("用返回箭頭，不是叉叉", () => {
    expect(DETAIL).toContain('icon="tool-arrow-left"');
    expect(DETAIL).not.toContain('icon="tool-close"');
  });

  it("可及名稱說出會回到哪裡", () => {
    expect(DETAIL).toContain('label="返回裝備清單"');
  });
});

describe("裝備資訊卡", () => {
  /*
   * 防曬乳那一句「將依設定，自動建立補擦倒數」講的是**品類的通則**，不是
   * 這一瓶的資料——同一句話在新增裝備頁選到防曬乳時也會出現。
   *
   * 「不會建立補擦倒數」相反：那是限制，而且與「放進裝備清單」的預期不同。
   * 預期內的結果安靜，意外要出聲——跟草稿狀態、通知失敗同一條規則。
   */
  it("只有「不會倒數」時才顯示補擦提醒那一列", () => {
    expect(DETAIL).toContain('v-if="!affectsCountdown(product.gearCategory)"');
    expect(
      DETAIL,
      "不再印品類通則"
    ).not.toContain("GEAR_CATEGORY_REMINDER_EFFECT");
  });

  /*
   * 那一列變成有條件之後，一件什麼都沒填的防曬乳會讓整張卡空掉——**一張
   * 有標題、有邊框、裡面什麼都沒有的卡，比沒有這張卡更難懂**。
   */
  it("沒有任何一列時整張卡不出現", () => {
    expect(DETAIL).toContain('<section v-if="hasSpecRows" class="app-card spec-section">');
  });

  /*
   * `hasSpecRows` 必須涵蓋每一種會渲染的列，少算一種就會出現「卡不見了但
   * 裡面其實有東西」。逐項比對，不是只看它存在。
   */
  it("hasSpecRows 涵蓋每一種列", () => {
    const body = /const hasSpecRows = computed\(\(\) => \{[\s\S]*?\n\}\);/.exec(
      DETAIL
    )?.[0];

    expect(body, "找不到 hasSpecRows").toBeDefined();
    for (const source of [
      "specLine.value !== null",
      "!affectsCountdown(product.value.gearCategory)",
      "purchase.value !== null",
      "product.value.expiryDate !== null",
      "product.value.note !== null",
      'safety.value.kind !== "usable"'
    ]) {
      expect(body, source).toContain(source);
    }
  });
});
