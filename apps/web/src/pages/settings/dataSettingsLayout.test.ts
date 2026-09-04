import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 2026-09-01 第八批（本機資料與隱私）。
 *
 * 使用者三項：同步區兩個標題字級要統一、「管理登入與雲端資料」靠右加箭頭
 * 與底線、頁面上有一顆按鈕顏色比較淡要查。
 */

const SOURCE = readFileSync(
  "apps/web/src/pages/settings/DataSettingsPage.vue",
  "utf8"
)
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");

describe("同步區的標題字級", () => {
  /*
   * **2026-09-04：改成比群組標題低一階（使用者裁決）。**
   *
   * 2026-09-02 曾把這三塊從 16px 拉到 18px，理由是「差一階剛好落在看得出
   * 不一樣、但看不出為什麼的區間」。那次拉平之後的實際結果是**一個區塊裡
   * 兩個同級標題**——群組標題「跨裝置同步」與狀態列一樣重，使用者回報
   * 「這一區排版很亂」。
   *
   * 這次一次降到 `supporting`（14px），不是回頭走 16px：18 對 14 是看得出
   * 意圖的差距，18 對 16 才是當初被否決的那種曖昧差距。
   *
   * 兩件事分開守：三塊狀態都要是 h3，而且都要標成 supporting。只守其中
   * 一件的話，改成 h3 但忘了標 role（字級掉回 body）也會過。
   */
  it("三個同步狀態都是 h3", () => {
    const titles = [...SOURCE.matchAll(/<h3 class="sync-block__title"/g)];
    expect(titles).toHaveLength(3);
  });

  it("三個同步狀態走 supporting，比「跨裝置同步」低一階", () => {
    const titles = [
      ...SOURCE.matchAll(
        /<h3 class="sync-block__title" data-typography-role="supporting">/g
      )
    ];
    expect(titles).toHaveLength(3);
    expect(SOURCE).toContain(
      '<h2 id="sync-group-title" data-typography-role="card-title">'
    );
  });

  /*
   * **反向：顏色也要跟著降。** 只降字級的話，14px 的深色文字仍然像個標題
   * ——那是 2026-09-02 想避免的「看得出不一樣、看不出為什麼」。
   */
  it("狀態列用次要文字色", () => {
    expect(SOURCE).toMatch(
      /\.sync-block__title \{[^}]*color: var\(--text-secondary\);/
    );
  });

  it("不再用 <strong> 當同步狀態的標題", () => {
    expect(SOURCE).not.toContain("<strong>目前使用免登入模式</strong>");
  });
});

describe("管理登入與雲端資料", () => {
  /*
   * 有箭頭、有底線——來自 ChevronLink（渲染成 `<a>` 時保留瀏覽器預設底線，
   * 2026-08-31 的裁決）。這裡只守「用了那個元件」，樣式本身由
   * chevronLink.test.ts 守。
   */
  it("用 ChevronLink", () => {
    expect(SOURCE).toContain(
      '<ChevronLink class="sync-group__more" to="/settings/account-data">'
    );
  });

  /*
   * **2026-09-04 翻面：從靠右改成靠左（使用者裁決）。**
   *
   * 2026-09-01 定的靠右，理由是「跟五日預報那顆一樣」。但那顆在卡片標題列
   * 的右端，右邊界是它自己那一列的邊界；這一顆排在一疊左對齊的內容底下，
   * 實測右緣是 90 → 322/48 → 127 → 336 → **173 靠右**，再下面的「返回更多」
   * 又靠左——同一個畫面三個互動元素三種對齊。
   *
   * 寫成明確的 `start` 而不是刪掉整條規則：`.sync-group` 帶著
   * `justify-items: start`，靠繼承的話下次有人動那一行就會靜默改掉這裡。
   */
  it("靠左，與按鈕同一條左邊界", () => {
    expect(SOURCE).toMatch(/\.sync-group__more \{[^}]*justify-self:\s*start;/);
    expect(SOURCE).not.toMatch(/\.sync-group__more \{[^}]*justify-self:\s*end;/);
  });
});

describe("停用的「清除草稿」要說明原因", () => {
  /*
   * **這一項查證的結果是「不是 bug」**：按鈕在沒有草稿時是 disabled，淡色
   * 來自 `.button:disabled` 的 opacity，行為正確。
   *
   * 但沒說原因的停用按鈕看起來就是壞掉的按鈕。上面那張概況卡雖然寫著
   * 「未儲存草稿：無」，那是另一張卡的一列，讀者不會自己連起來。
   */
  /*
   * **2026-09-04：說明從按鈕旁邊移到按鈕上。** 放旁邊時讀者仍要自己把
   * 「淡掉的按鈕」與「旁邊那句話」連起來；寫在按鈕上，停用的原因就是按鈕
   * 本身在說。
   */
  it("沒有草稿時按鈕本身說明原因", () => {
    expect(SOURCE).toContain("沒有草稿可以清除");
    expect(SOURCE).toContain("summary.hasSetupDraft ? '清除草稿'");
  });

  /*
   * **反向：不要在按鈕旁邊再留一句一樣的話。** 兩個地方講同一件事，
   * 就是這次要收掉的東西。
   */
  it("按鈕旁邊不再重複同一句", () => {
    expect(SOURCE).not.toContain("目前沒有草稿可以清除。");
  });

  /* 停用條件本身不可以被拿掉——沒有草稿時按下去沒有任何事會發生。 */
  it("停用條件維持", () => {
    expect(SOURCE).toContain(':trigger-disabled="!summary.hasSetupDraft"');
  });
});

/**
 * 概況表：值與標籤同色、時間用短格式（2026-09-04 使用者標註第 6 項）。
 */
describe("概況表的值", () => {
  /*
   * 改動前標籤是 `--text-secondary`、值是繼承來的 `--text-primary`，同一列
   * 兩種深度。這是一張「陳述現況」的表，整列同色讀起來才是一句話的兩半。
   */
  it("顏色寫在 dl 上，dt 不再自己指定", () => {
    expect(SOURCE).toMatch(
      /\.summary-grid \{[^}]*color: var\(--text-secondary\);/
    );
    expect(SOURCE).not.toMatch(
      /\.summary-grid dt \{[^}]*color: var\(--text-secondary\);/
    );
  });

  /*
   * **反向：值不可以自己另外指定顏色。** 只守上面那條的話，在 `dd` 上補
   * 一行 color 又會變回兩種深度。
   */
  it("dd 沒有自己的顏色", () => {
    const dd = /\.summary-grid dd \{([^}]*)\}/.exec(SOURCE)?.[1] ?? "";

    expect(dd).not.toContain("color:");
  });

  /*
   * 時間用「9/4 00:11」的短格式：原本 `formatDateTime` 給的是
   * 「2026/9/4 上午12:11:20」，16 個字擠在右欄實測折成兩行。這一列問的是
   * 「多久以前更新」，年份與秒數不影響答案。
   */
  it("時間用短格式", () => {
    expect(SOURCE).toContain("formatMonthDayTime");
    expect(SOURCE).not.toContain("formatDateTime");
  });
});

/**
 * 2026-09-04：「清除全部本機資料」的標題併進按鈕（使用者裁決）。
 */
describe("清除全部的紅字", () => {
  /*
   * 標題併進按鈕之後，紅字必須跟著搬——否則全站最危險的那顆按鈕會跟
   * 「清除草稿」長得一模一樣。
   */
  it("紅字落在觸發按鈕上", () => {
    expect(SOURCE).toMatch(
      /\.clear-row--danger > \.button \{[^}]*color: var\(--color-due\);/
    );
  });

  /*
   * **反向：不是整顆紅按鈕。** 只守上面那條的話，改成紅底白字也會過，而
   * 那與 GearDetailSheet 的既有裁決（「這個 App 不用整顆紅按鈕」）相反。
   */
  it("不是整顆紅按鈕", () => {
    const rule = /\.clear-row--danger > \.button \{([^}]*)\}/.exec(SOURCE)?.[1] ?? "";

    expect(rule).not.toContain("background");
  });
});

/**
 * 2026-09-04（方案 A）：同步區的兩句說明併成一句、分組間距。
 */
describe("同步區的說明與間距", () => {
  /*
   * 「登入能做什麼」與「不登入不會怎樣」是同一件事的兩面，改動前卻被一個
   * 14px 的狀態標題隔開，變成 16 / 14 / 16 的 V 字形。併成一句之後
   * `.sync-block` 裡只剩「狀態標題＋按鈕」，字級才是單調遞減的。
   *
   * 不綁字面，只要求這一句同時講到兩件事——換句話說可以，拆回兩段不行。
   */
  it("群組說明一句話講完「登入能做什麼」與「不登入不會怎樣」", () => {
    const lead = /<p class="sync-group__lead">\s*([^<]*)</.exec(SOURCE)?.[1];

    expect(lead, "找不到 .sync-group__lead").toBeDefined();
    expect(lead).toContain("登入 Google 帳號");
    expect(lead).toContain("不登入");
  });

  /*
   * 改動前 `.sync-group` 與 `.sync-block` 的 gap 都是 --space-3，五個元素
   * 完全等距，讀起來是五條平行的線而不是「標題＋說明＋動作」。
   *
   * 這條守的是「有沒有分組」，不是某個特定數值——所以只要求那兩個選擇器
   * 拿得到 gap 之上的一段。
   */
  it("狀態區與出口各自跟上面拉開一階", () => {
    const rule = /\.sync-block,\s*\.sync-group__more \{([^}]*)\}/.exec(SOURCE)?.[1];

    expect(rule, "找不到分組間距規則").toBeDefined();
    expect(rule).toContain("margin-block-start: var(--space-2);");
  });
});
