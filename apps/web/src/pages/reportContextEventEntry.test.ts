import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 階段三（`2026-09-02-event-means-reapply.md` 第六節）：水上活動搬離損耗選單。
 *
 * 「發生了什麼？」那張清單原本混著兩種東西：四種**損耗**（流汗／擦毛巾／
 * 摩擦／洗手）把期限拉到事件發生的那一刻，記錄完當下就已經到期；下水／
 * 離水則是開關一段**水中區間**，期限改由耐水標示決定。兩者連「記錄完接下來
 * 要做什麼」都相反（見 `suggestsReapplyAfter`）。
 *
 * 掛整頁要造一份很大的 services mock，所以這裡掃原始碼：先剝註解（否則
 * 解釋規則的註解本身就能讓斷言通過），並比對完整的屬性與宣告。
 */

const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const PAGE = strip(
  readFileSync("apps/web/src/pages/ReportContextEventPage.vue", "utf8")
);
const CONTROLLER = strip(
  readFileSync(
    "apps/web/src/features/reminder/createContextEventController.ts",
    "utf8"
  )
);
const HOME = strip(readFileSync("apps/web/src/pages/HomePage.vue", "utf8"));

describe("選單只剩四種損耗", () => {
  it("清單走 ordinaryChoices", () => {
    expect(PAGE).toContain(
      'v-for="choice in contextEvent.ordinaryChoices.value"'
    );
  });

  /*
   * 反向：不能只是改名。`availableChoices` 那份含水上活動的清單如果還被
   * 清單用著，改名等於什麼都沒做。
   */
  it("清單不再列出含水上活動的那一份", () => {
    expect(PAGE).not.toContain("availableChoices");
    expect(PAGE).not.toContain('v-for="choice in contextEvent.allChoices');
  });

  /* `ordinaryChoices` 是那四種，水上那一種另外放。 */
  it("controller 把兩者分開", () => {
    expect(CONTROLLER).toContain("ordinaryChoices.value = [...ORDINARY_CHOICES];");
    expect(CONTROLLER).toMatch(/waterChoice\.value\s*=/);
  });

  /*
   * **水上活動沒有被刪掉，只是換了入口。** 只守「清單裡沒有」的話，把
   * `WATER_START_CHOICE` 整個刪掉也是綠的——那時開啟水中區間的能力就消失了。
   */
  it("水上活動仍然存在，能力沒有被拿掉", () => {
    /*
     * **比對內容，不是識別字。**
     *
     * 第一版只斷言 `WATER_START_CHOICE`／`WATER_END_CHOICE` 這兩個名字還在，
     * 結果把它們兩個都改成指向某個損耗選項之後照樣全綠（2026-09-03 實測）
     * ——那時開啟水中區間的能力已經沒了，測試卻沒發現。這正是 CLAUDE.md
     * 坑二的形狀：名字片段滿足不了「這件事還在」。
     */
    expect(CONTROLLER).toMatch(
      /const WATER_START_CHOICE[\s\S]{0,200}kind: "water_start"[\s\S]{0,200}label: "游泳／下水"/
    );
    expect(CONTROLLER).toMatch(
      /const WATER_END_CHOICE[\s\S]{0,200}kind: "water_end"[\s\S]{0,200}label: "離水"/
    );
    expect(CONTROLLER).toContain("allChoices.value");
  });

  /* 清單只剩四種之後，說明文字不該再舉一個清單上沒有的例子。 */
  it("說明不再拿碰水當例子", () => {
    expect(PAGE).not.toContain("或碰水");
  });
});

describe("深連結直接進表單", () => {
  it("讀 route 的 kind", () => {
    expect(PAGE).toContain("route.query.kind");
  });

  /*
   * 只接受合法的 kind：網址是使用者改得動的東西，塞一個不存在的值不該讓
   * 頁面卡在「選了一個不存在的事件」。
   */
  it("只接受 allChoices 裡有的 kind", () => {
    expect(PAGE).toMatch(
      /contextEvent\.allChoices\.value\.find\(\s*\(choice\) => choice\.kind === value\s*\)/
    );
  });

  /*
   * 兩件事分開守：選起來、以及把第一層藏掉。只守前者的話，使用者會在
   * 首頁選過一次之後又看到同一張清單。
   */
  it("深連結時選好那個事件", () => {
    expect(PAGE).toContain("contextEvent.selectKind(kind);");
  });

  it("深連結時不顯示第一層選單", () => {
    expect(PAGE).toContain('v-if="showKindChooser"');
    expect(PAGE).toContain("deepLinkedKind.value === null");
  });
});

describe("首頁的水上活動入口", () => {
  it("入口存在且帶著 kind", () => {
    expect(HOME).toContain('class="text-link home__water"');
    expect(HOME).toContain(
      'router.push({ name: "reminder-report", query: { kind: "water" } })'
    );
  });

  /*
   * **首頁不判斷「現在在不在水裡」。**
   *
   * 第一版讓按鈕跟著投影算出的 `inWater` 換文字，實機一測就壞了：預設路徑
   * （沒填包裝標示）的 eligibility 是 `identity_unconfirmed`，reducer 的水上
   * 區間分支要求 `eligible`，所以投影裡完全沒有這段區間的痕跡——按鈕會一直
   * 寫「開始水上活動」，帶著 `water_start` 進去又找不到對應選項，**離水永遠
   * 按不到**。
   *
   * 這條擋的是「又把狀態判斷搬回首頁」。
   */
  it("首頁不自己判斷在不在水裡", () => {
    expect(HOME).not.toContain("isSessionInWater");
    expect(HOME).not.toContain("activeWaterDeadline");
  });

  /* 解析交給知道 `openWaterInterval` 的那一頁。 */
  it("water 由記錄狀況頁解析成當下可用的那一種", () => {
    expect(PAGE).toContain(
      'if (value === "water") return contextEvent.waterChoice.value?.kind ?? null;'
    );
  });

  /* 文字連結不是按鈕：這不是「你現在該做的事」，是狀態改變時才用得到。 */
  it("是文字連結，不是實心按鈕", () => {
    expect(HOME).not.toContain('class="button button--primary home__water"');
  });
});
