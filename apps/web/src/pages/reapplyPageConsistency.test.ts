import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 記錄補擦這一頁的共用元件與字級一致性（2026-09-03，使用者回報「跑版」）。
 *
 * 這一頁由四個元件拼起來，實測前每一個都自己刻了一份：
 *
 * | 區塊 | 標題 | 字級 | 說明文字 |
 * | --- | --- | --- | --- |
 * | 為什麼補擦 | `question-card` 的 legend | 18px | `question-card__helper` |
 * | 這次補擦哪些部位 | 自訂 legend | **20px** | `section-help` |
 * | 這次用了哪瓶 | `h2` card-title | 18px | `assignment-section__helper` |
 * | 時間 | `h2` card-title | 18px | — |
 * | 確認 | `h2` section-title | **20px** | — |
 *
 * 五個標題兩種字級、三種說明文字類別，而且「確認」那一塊根本不是卡片
 * （實測左緣 x=20，鄰居都在 x=41）。
 *
 * 掃原始碼而不是掛頁面：整頁要一份很大的 services mock。依 CLAUDE.md
 * 先剝註解，並比對完整的 class 屬性與宣告。
 */

const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const read = (path: string): string =>
  strip(readFileSync(`apps/web/src/${path}`, "utf8"));

const ZONE = read("components/reapplication/ReapplicationZoneSelector.vue");
const ASSIGN = read(
  "components/reapplication/ReapplicationProductAssignments.vue"
);
const REVIEW = read("components/reapplication/ReapplicationReview.vue");
const REASON = read("components/reapplication/ReapplyReasonPicker.vue");
const APP_CSS = strip(readFileSync("apps/web/src/assets/app.css", "utf8"));
const PAGE = read("pages/ReapplyPage.vue");

describe("每個區塊都套共用類別", () => {
  /* 兩個 fieldset 都走 question-card，legend 的字級與 float 修正才會一致。 */
  it("部位選擇改用 question-card", () => {
    expect(ZONE).toContain('class="zone-selector question-card app-card"');
  });

  it("為什麼補擦仍然是 question-card", () => {
    expect(REASON).toContain('class="reason-picker question-card app-card"');
  });

  /* 確認區塊原本是裸 section，在一整頁卡片裡左緣對不齊。 */
  it("確認區塊也是卡片", () => {
    expect(REVIEW).toContain('class="review app-card"');
  });
});

describe("五個區塊標題同一級", () => {
  /*
   * `question-card` 的 legend 由共用類別給 card-title 字級，`h2` 則靠
   * `data-typography-role`。兩種機制，同一個結果。
   */
  it("h2 一律 card-title，不再有 section-title", () => {
    for (const [name, source] of [
      ["產品指派", ASSIGN],
      ["確認", REVIEW]
    ] as const) {
      expect(source, name).toContain('data-typography-role="card-title"');
      expect(source, name).not.toContain('data-typography-role="section-title"');
    }
  });

  /*
   * 反向：部位那個 legend 不可以再自己指定字級。只守上面那條的話，
   * 這裡留一行 `font-size: var(--font-size-section-title)` 仍然是 20px。
   */
  it("部位的 legend 不自己指定字級", () => {
    expect(ZONE).not.toContain("font-size: var(--font-size-section-title)");
    expect(REVIEW).not.toContain("font-size: var(--font-size-section-title)");
  });
});

describe("說明文字只有一種寫法", () => {
  it("三個區塊都用 question-card__helper", () => {
    expect(ZONE).toContain('class="question-card__helper"');
    expect(ASSIGN).toContain('class="question-card__helper"');
  });

  /* 反向：自刻的那兩個類別要真的消失，不是留著沒用。 */
  it("不再有自刻的說明類別", () => {
    expect(ZONE).not.toContain("section-help");
    expect(ASSIGN).not.toContain("assignment-section__helper");
  });

  /*
   * 標題→說明是 stack 系統的 `--space-stack-title-body`（8px），不是區塊
   * 之間的 16px。產品指派那張卡的 grid gap 是 16px，所以要抵掉差額。
   */
  it("產品指派把標題→說明收成 stack 間距", () => {
    expect(ASSIGN).toContain(
      "margin-top: calc(var(--space-stack-title-body) - var(--space-4));"
    );
  });
});

describe("勾選控制項的顏色只定義一次", () => {
  /*
   * 漏掉的那一個是記錄補擦的 13 個核取方塊——實測 `accent-color: auto`，
   * 在暖象牙底上是瀏覽器預設的亮藍。
   */
  it("app.css 用元素選擇器統一上色", () => {
    expect(APP_CSS).toMatch(
      /input\[type="checkbox"\],\s*input\[type="radio"\] \{[^}]*accent-color: var\(--text-primary\);/
    );
  });

  /* 反向：各元件不可以再自己寫一份，否則又會有人漏掉。 */
  it("元件不再各自宣告 accent-color", () => {
    for (const [name, source] of [
      ["部位選擇", ZONE],
      ["為什麼補擦", REASON],
      [
        "設定的部位表",
        read("components/setup/ZoneProtectionForm.vue")
      ]
    ] as const) {
      expect(source, name).not.toContain("accent-color");
    }
  });
});

describe("成對按鈕走共用的 button-group", () => {
  /*
   * 「只選建議部位／選擇全部部位」原本是自刻的 flex，所以吃不到
   * 2026-09-03「窄螢幕仍然並排」那次修正——手機上是上下兩顆滿寬按鈕。
   */
  it("mode-actions 疊在 button-group 上", () => {
    expect(ZONE).toContain('class="button-group mode-actions"');
  });

  it("不再自己刻 flex", () => {
    expect(ZONE).not.toMatch(/\.mode-actions \{[^}]*display: flex;/);
  });
});

describe("取消是文字連結", () => {
  /*
   * 2026-08-31 的裁決：次要動作用文字連結，實心／描邊按鈕是主行動的語彙。
   * 記錄狀況那頁已經照做，這頁漏了——兩個並排的流程，取消長得不一樣。
   */
  it("送出區的取消用共用的 class", () => {
    expect(PAGE).toContain('class="text-link submit-actions__cancel"');
  });

  /*
   * 兩件事分開守（照抄記錄狀況那頁的守法）：只守取消的話，兩顆一起變成
   * 文字連結也會過——那時就沒有主要行動了。
   */
  it("儲存維持 primary 按鈕", () => {
    expect(PAGE).toContain('class="button button--primary"');
  });

  /*
   * 樣式必須在 app.css，不是某一頁的 scoped style——scoped 不會外流，
   * 另一頁換上同一個 class 也吃不到（`.time-option` 那次搬遷同一個理由）。
   */
  it("取消的樣式在 app.css", () => {
    expect(APP_CSS).toMatch(
      /\.submit-actions__cancel \{[^}]*justify-self: center;/
    );
  });
});

describe("兩頁的部位選擇器共用同一個元件", () => {
  /*
   * 2026-09-03（裁決 1）：同一個問題「哪些部位？」原本有兩種樣子——記錄
   * 狀況那頁是會換行的藥丸 chip，記錄補擦是 13 個整列。整列實測 766px，
   * chip 換行之後 498px。
   */
  it("記錄補擦改用 ZoneSelectorGrid", () => {
    /*
     * 標籤後面要接空白或 `/>`——`toContain("<ZoneSelectorGrid")` 會被
     * `<ZoneSelectorGridX` 滿足（2026-09-03 實測：改名之後測試照樣全綠）。
     * CLAUDE.md 坑二。
     */
    expect(ZONE).toMatch(/<ZoneSelectorGrid[\s/>]/);
    expect(ZONE).toContain(
      'import ZoneSelectorGrid from "../reminder/ZoneSelectorGrid.vue";'
    );
  });

  /* 反向：自刻的那一份要真的消失，不是留著沒用。 */
  it("不再自刻整列的部位清單", () => {
    expect(ZONE).not.toContain("zone-choice");
    expect(ZONE).not.toContain("zone-list");
  });

  /*
   * 「建議」badge 跟著拿掉（裁決 3）：被建議的部位本來就已經勾起來了，
   * badge 只是把同一件事再說一次，而且 13 個 badge 在一頁裡是噪音。
   *
   * 它原本用 `--color-tracking`——那是「追蹤中」的**狀態色**，而「建議」
   * 不是狀態。與其換一個顏色，不如不要那個 badge。
   */
  it("不再有建議 badge，也不再借用狀態色", () => {
    expect(ZONE).not.toContain("建議</small>");
    expect(ZONE).not.toContain("--color-tracking");
  });

  /* 說明文字要接住 badge 拿掉之後留下的資訊。 */
  it("說明仍然講出「已預選」這件事", () => {
    expect(ZONE).toContain("已預選");
  });
});

describe("不再逐部位指定防曬乳", () => {
  /*
   * 2026-09-03 使用者裁決：「不用去紀錄不同防曬擦不同部位 可以刪除」。
   *
   * 命令的形狀沒有變——`ReapplyCommandV1` 本來就吃「一組 application」，
   * 只是這個介面現在永遠只產生一組。
   */
  it("沒有逐部位模式的切換", () => {
    expect(ASSIGN).not.toContain("perZone");
    expect(ASSIGN).not.toContain("不同部位使用不同防曬乳");
    expect(ASSIGN).not.toContain("assignment-row");
  });

  /* 反向：共用的那一個下拉還在，不是把整張卡刪掉。 */
  it("共用下拉還在", () => {
    expect(ASSIGN).toContain('id="product-shared"');
  });

  /* 確認區塊跟著不再分組——分組只服務已經拿掉的那個模式。 */
  it("確認區塊不再依產品分組", () => {
    expect(REVIEW).not.toContain("review__groups");
  });
});
