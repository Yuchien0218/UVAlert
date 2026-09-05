import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 倒數下面那行說明要拿得到整個寬度（2026-09-03，使用者回報它「莫名其妙
 * 換行」並猜是叉叉造成的——**是**）。
 *
 * 改動前 `.home__session-head` 是 `minmax(0, 1fr) auto` 兩欄：叉叉只有 44px
 * 高，卻讓**整個倒數區塊**（eyebrow、數字、進度條、說明）都被壓到 280px。
 * 實測 375px 視窗：可用 336px、倒數只拿到 280px——少掉的 56px 正好夠讓
 * 「建議優先補擦：手背・預計 15:52」折成兩行。
 *
 * 改成單欄重疊之後實測：那句話與更長的「建議優先補擦：鼻子與雙頰・預計
 * 15:52」都是一行。
 */

const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const HOME = strip(readFileSync("apps/web/src/pages/HomePage.vue", "utf8"));

function rule(selector: string): string {
  const match = new RegExp(
    `${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([^}]*)\\}`
  ).exec(HOME);
  expect(match, `找不到 ${selector} 的規則`).not.toBeNull();
  return match![1]!;
}

describe("結束鈕不再佔走倒數的寬度", () => {
  /*
   * 比對完整宣告：`minmax(0, 1fr) auto` 就是把叉叉排成第二欄的那一版。
   */
  it("不再有「內容一欄、叉叉一欄」", () => {
    expect(rule(".home__session-head")).not.toContain(
      "grid-template-columns: minmax(0, 1fr) auto;"
    );
  });

  it("兩個子元素疊在同一個 grid 區域", () => {
    expect(rule(".home__session-head > *")).toContain("grid-area: 1 / 1;");
  });

  /*
   * **反向：叉叉必須還在右上角。** 只守上面兩條的話，把重疊寫成左上角
   * （或忘了 `justify-self`）也是綠的——那時叉叉會蓋在「補擦倒數」上面。
   */
  it("叉叉靠右", () => {
    expect(rule(".home__session-head > .session-end")).toContain(
      "justify-self: end;"
    );
  });

  /*
   * 重疊之所以安全，是因為 `SessionEndControl` 的確認彈窗是 `position:
   * fixed` 的遮罩，不是就地展開——`.session-end` 永遠只有那顆 44×44 的
   * 按鈕。這條擋的是「有人把彈窗改成就地展開」，那時重疊會蓋住倒數。
   */
  it("結束鈕的確認彈窗仍然是固定定位的遮罩", () => {
    const control = strip(
      readFileSync(
        "apps/web/src/components/session/SessionEndControl.vue",
        "utf8"
      )
    );
    const backdrop = /\.session-end__backdrop \{([^}]*)\}/.exec(control)?.[1];

    expect(backdrop, "找不到 .session-end__backdrop").toBeDefined();
    expect(backdrop).toContain("position: fixed;");
  });
});

/**
 * 衛教文章頁的大標（2026-09-03，使用者：「大標不要提早換行」「去除大標上面
 * 的小字」）。
 *
 * 同一個病的第二個病例：返回鈕原本與標題並排（`minmax(0, 1fr) auto`），
 * 大標因此少掉一個按鈕的寬度就開始折行。
 */
describe("衛教文章頁的大標拿得到整個寬度", () => {
  const ARTICLE = strip(
    readFileSync("apps/web/src/pages/education/EducationArticlePage.vue", "utf8")
  );

  /** 這裡傳進來的都是單純的 class 名，只需要跳脫開頭那個點。 */
  function articleRule(className: string): string {
    const match = new RegExp(`\\.${className} \\{([^}]*)\\}`).exec(ARTICLE);
    expect(match, `找不到 .${className} 的規則`).not.toBeNull();
    return match![1]!;
  }

  it("標題區不再是「內容一欄、箭頭一欄」", () => {
    expect(articleRule("education-article-header")).not.toContain(
      "grid-template-columns: minmax(0, 1fr) auto;"
    );
  });

  /*
   * 標題不再包一層 `display: grid` 的 div：grid 容器不會與 float 重疊，
   * 而且那層在拿掉 eyebrow 之後只剩一個 h1，沒有存在的理由。
   */
  it("標題不再包一層 grid", () => {
    expect(ARTICLE).not.toContain("education-article-header__main");
  });

  /*
   * **反向：返回鈕必須還在。** 只守上面兩條的話，把 IconButton 整個刪掉
   * 也是綠的——那時這一頁就沒有回上一層的出口了。
   */
  it("返回鈕仍然在，而且維持在右上", () => {
    expect(ARTICLE).toContain('icon="tool-arrow-left"');
    expect(articleRule("education-article-header__back")).toContain(
      "float: inline-end;"
    );
  });

  /*
   * float 只影響**原始碼上排在它後面**的內容，所以返回鈕必須排在 h1 之前。
   * 順序寫反的話標題不會繞開它，畫面上會直接壓在一起。
   */
  it("返回鈕排在標題之前", () => {
    expect(ARTICLE.indexOf("education-article-header__back")).toBeLessThan(
      ARTICLE.indexOf("page-heading__title")
    );
  });

  /*
   * 標題上方的 `primaryQuestion` 拿掉——讀者是從分類頁的卡片點進來的，
   * 那張卡正面就寫著這個問題。
   */
  it("標題上方不再重複那個問題", () => {
    expect(ARTICLE).not.toContain("article.primaryQuestion");
  });

  /*
   * **反向：資料沒有被刪。** 分類頁的卡片仍然顯示它——那裡它是還沒讀過的
   * 資訊，這裡不是。
   */
  it("分類頁的卡片仍然顯示那個問題", () => {
    const category = strip(
      readFileSync(
        "apps/web/src/pages/education/EducationCategoryPage.vue",
        "utf8"
      )
    );

    expect(category).toContain("article.primaryQuestion");
  });
});

/**
 * `.flow-heading` 的說明文字（2026-09-03）。
 *
 * 同一個病的第三個病例，五個頁面共用：記錄補擦、記錄狀況、更正紀錄、
 * 分享裝備、通知設定。
 *
 * 原本是 flex：標題群組（eyebrow ＋ h1 ＋ 說明）一整塊在左、圖示鈕在右，
 * 於是**說明也跟著少掉一個按鈕的寬度**（實測 375px：可用 336、標題群組
 * 275）。說明在按鈕下方，本來就不必讓位。
 */
describe("流程頁的說明文字橫跨兩欄", () => {
  const FLOW_PAGES = [
    "pages/ReapplyPage.vue",
    "pages/ReportContextEventPage.vue",
    "pages/EventCorrectionPage.vue",
    "pages/GearSharePage.vue",
    "pages/settings/NotificationSettingsPage.vue"
  ];

  const APP_CSS = strip(readFileSync("apps/web/src/assets/app.css", "utf8"));

  it("共用版型改成 grid，說明跨欄", () => {
    expect(APP_CSS).toMatch(
      /\.flow-heading \{[^}]*grid-template-columns: minmax\(0, 1fr\) auto;/
    );
    expect(APP_CSS).toMatch(
      /\.flow-heading > p \{[^}]*grid-column: 1 \/ -1;/
    );
  });

  /*
   * 說明必須是 `<header>` 的**直接子代**——留在裡面那個 div 就跨不了欄，
   * 改了 CSS 也沒有用。
   */
  it.each(FLOW_PAGES)("%s 的說明是 header 的直接子代", (relative) => {
    const source = strip(readFileSync(`apps/web/src/${relative}`, "utf8"));
    const header = /<header class="flow-heading">([\s\S]*?)<\/header>/.exec(
      source
    )?.[1];

    expect(header, `${relative} 找不到 flow-heading`).toBeDefined();

    // header 裡的 div 收掉之後，剩下的內容必須還有一個 <p>。
    const withoutDiv = header!.replace(/<div[\s\S]*?<\/div>/, "");
    expect(withoutDiv, relative).toMatch(/<p[\s>]/);
  });

  /*
   * **反向：舊的「div 裡最後一個 p」規則要拿掉。** 說明搬走之後那個位置
   * 變成 eyebrow，留著會把 eyebrow 染成內文色。
   */
  it("不再靠「div 的最後一個 p」認說明", () => {
    expect(APP_CSS).not.toContain(".flow-heading div > p:last-child");
  });

  /* 圖示鈕仍然與標題同一列——`closeButtonLayout.test.ts` 守的那條規則不變。 */
  it("圖示鈕仍在第一列，不獨佔一列", () => {
    expect(APP_CSS).toMatch(
      /\.flow-heading \{[^}]*grid-template-columns: minmax\(0, 1fr\) auto;/
    );
  });
});
