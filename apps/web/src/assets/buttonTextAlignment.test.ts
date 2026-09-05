import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 按鈕與列的文字對齊（`DESIGN.md` 第五節〈按鈕與列的文字對齊〉，2026-09-03）。
 *
 * 在此之前沒有規則，於是 `/setup` 同一個畫面上「只選建議部位」置中、正上方的
 * 「1 分鐘前」靠左，兩顆長得一樣大。判準是**形狀**不是重要性：
 *
 * - 獨立按鈕（內容只有一個短標籤）→ 置中
 * - 列（左標籤、右值或 chevron，佔滿一整行）→ 靠左
 *
 * **這裡不掃「哪些元件是哪一族」**——那是語意，從選擇器名稱推不出來，硬掃
 * 會變成一張要一直維護的白名單。改成守住三件真的會壞的事：共用按鈕類別的
 * 值、時間選擇器那一族的值，以及 flex 容器那個特別容易踩的坑。
 */

const SHARED = "apps/web/src/assets/app.css";

const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const css = strip(readFileSync(SHARED, "utf8"));

/** 取出某個選擇器的宣告區塊，比對完整宣告而不是名字片段（CLAUDE.md 坑二）。 */
function block(selector: string): string {
  const match = new RegExp(
    `${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`
  ).exec(css);
  expect(match, `找不到 ${selector} 的宣告`).not.toBeNull();
  return match![1]!;
}

describe("按鈕內的文字置中", () => {
  it(".button 置中", () => {
    expect(block(".button")).toContain("text-align: center;");
  });

  /*
   * `.time-option` 是「1 分鐘前／調整時間」那兩顆，三個時間選擇器共用
   * （ApplicationTimePicker／WaterStartPicker／QuickTimePicker）。
   * 2026-09-03 之前它明寫 `text-align: left`。
   */
  it(".time-option 置中", () => {
    expect(block(".time-option")).toContain("text-align: center;");
  });

  it(".time-option 不再靠左", () => {
    expect(block(".time-option")).not.toContain("text-align: left;");
  });

  /*
   * **這條單獨守，因為它是這次最容易漏掉的一步。**
   *
   * `.time-option__label` 是 flex 容器（數字與單位要對齊基線），`text-align`
   * 對它無效——只改上面那一條，畫面上會完全沒有反應。
   */
  it(".time-option__label 用 justify-content 置中", () => {
    const label = block(".time-option__label");

    expect(label).toContain("display: flex;");
    expect(label).toContain("justify-content: center;");
  });
});

describe("列維持靠左", () => {
  /*
   * 反向：置中不能套到「列」那一族身上。
   *
   * 只守上面幾條的話，把全站每個 `text-align: start` 都改成 center 也是綠的
   * ——那時裝備清單、最近事件、四題那幾列的標籤會全部跑到中間。
   */
  const ROW_COMPONENTS = [
    "components/common/ChevronLink.vue",
    "components/product/GearListItem.vue",
    "components/reminder/RecentEventsList.vue"
  ];

  it.each(ROW_COMPONENTS)("%s 仍然靠左", (relative) => {
    const source = strip(
      readFileSync(join("apps/web/src", relative), "utf8")
    );

    expect(source).toMatch(/text-align:\s*(?:start|left);/);
  });
});

describe("DESIGN.md 記著這條規則", () => {
  const DESIGN = strip(readFileSync("DESIGN.md", "utf8"));

  it("第五節有〈按鈕與列的文字對齊〉", () => {
    expect(DESIGN).toContain("#### 按鈕與列的文字對齊");
  });

  /* 兩半分開守：只寫「按鈕置中」而沒寫「列靠左」的話，規則會被讀成一刀切。 */
  it("同時寫了按鈕置中與列靠左", () => {
    expect(DESIGN).toContain("**置中**");
    expect(DESIGN).toContain("**靠左**");
  });

  /* flex 那個坑要寫進去，否則下一個人只改 text-align 又會以為沒生效。 */
  it("寫明 flex 容器要用 justify-content", () => {
    expect(DESIGN).toContain("justify-content");
  });
});

describe("掃描範圍不是空的", () => {
  it("app.css 讀得到而且夠大", () => {
    // 沒有這一條的話，讀檔壞掉時整組守門會靜悄悄地全綠。
    expect(css.length).toBeGreaterThan(5000);
  });

  it("列那一族的檔案都存在", () => {
    const components = readdirSync("apps/web/src/components");

    expect(components).toContain("common");
  });
});

/**
 * 2026-09-03：窄螢幕的 `.button-group` 維持並排，不再拆成上下兩列。
 *
 * 使用者回報「這組按鈕歪歪的，要水平擺放」——直排時兩顆按鈕的圖示一顆在
 * 字後（→）、一顆在字前（↺），上下疊起來讀成參差不齊的兩行。
 *
 * 全站三組 `.button-group` 都是「主要動作＋次要動作」的短標籤配對。
 */
describe("按鈕組在窄螢幕仍然並排", () => {
  const narrow = /@media \(max-width: 31rem\) \{([\s\S]*?)\n\}/.exec(css)?.[1];

  it("找得到窄螢幕的區塊", () => {
    expect(narrow, "找不到 31rem 的 media query").toBeDefined();
  });

  /*
   * **這條才是真正的原因，而且第一版漏掉了。**
   *
   * `.recovery-card` 是 `display: grid` ＋ `justify-items: start`，群組會
   * 縮成內容寬（實測 600px 視窗下卡片欄寬 472px、群組只有 280px）。兩顆
   * `flex-basis: 10rem` 的按鈕加起來 332px 塞不進去，於是換行——**跟視窗
   * 多寬無關**。
   *
   * 第一版只改 31rem 以下的 media query，所以窄螢幕好了、500–600px 之間
   * 還是壞的，使用者回報「手機尺寸按鈕還是歪歪的」。
   */
  it("按鈕組先拿到整欄寬度", () => {
    expect(block(".button-group")).toContain("width: 100%;");
  });

  it("不再把按鈕組改成直排", () => {
    // 比對完整宣告：`display: grid` 就是直排那一版。
    expect(narrow).not.toMatch(/\.button-group \{[^}]*display:\s*grid;/);
  });

  /*
   * **平分而不是 `10rem` 基準。**
   *
   * 只把 `display: grid` 拿掉是不夠的——外面的 `.button-group > .button`
   * 是 `flex: 1 1 10rem`，兩顆加起來在 375px 上超過可用寬度，`flex-wrap`
   * 會讓它們照樣換行，等於改了跟沒改一樣（實測過）。
   */
  it("窄螢幕下按鈕平分寬度", () => {
    expect(narrow).toMatch(/\.button-group > \.button \{[^}]*flex:\s*1 1 0;/);
  });

  /*
   * `.button { width: 100% }` 仍然要留給**不在組裡**的單顆按鈕（主 CTA
   * 滿寬）——所以組裡那些要把 width 收回 auto，否則 100% 會跟平分打架。
   */
  it("單顆按鈕仍然滿寬，組裡的收回 auto", () => {
    expect(narrow).toMatch(/\.button \{[^}]*width:\s*100%;/);
    expect(narrow).toMatch(/\.button-group > \.button \{[^}]*width:\s*auto;/);
  });
});
