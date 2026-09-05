// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from "vitest";
import { ICONS } from "../../generated/icons.generated";
import { BRAND_LOCKUP_MARKUP } from "../../components/shell/brandLockupMarkup";
import { drawIcon, drawSvgMarkup, svgWidthFor } from "./drawSvg";

/**
 * `drawSvg` 是分享圖上所有圖形的唯一出口，而 canvas 在測試環境裡不存在——
 * happy-dom 沒有 2D context，也沒有 `Path2D`。
 *
 * 所以這裡自己搭一組會**記錄呼叫**的假物件。這比掃原始碼字串強得多：
 * 掃字串只能確認「有寫 drawIcon」，錄下來的操作可以確認「真的畫了東西、
 * 顏色換對了、fill="none" 沒被填」。CLAUDE.md 的「坑二」講的就是字串比對
 * 守不住東西。
 */

interface Operation {
  kind: "fill" | "stroke";
  style: string;
  lineWidth: number;
}

class FakePath2D {
  readonly ops: string[] = [];
  constructor(readonly d?: string) {}
  arc(): void {
    this.ops.push("arc");
  }
  roundRect(): void {
    this.ops.push("roundRect");
  }
}

function createContext(): CanvasRenderingContext2D & { ops: Operation[] } {
  const ops: Operation[] = [];
  const state = { fillStyle: "", strokeStyle: "", lineWidth: 1 };
  const context = {
    ops,
    get fillStyle() {
      return state.fillStyle;
    },
    set fillStyle(value: string) {
      state.fillStyle = value;
    },
    get strokeStyle() {
      return state.strokeStyle;
    },
    set strokeStyle(value: string) {
      state.strokeStyle = value;
    },
    get lineWidth() {
      return state.lineWidth;
    },
    set lineWidth(value: number) {
      state.lineWidth = value;
    },
    lineCap: "butt",
    lineJoin: "miter",
    save: () => undefined,
    restore: () => undefined,
    translate: () => undefined,
    scale: () => undefined,
    fill: () =>
      ops.push({
        kind: "fill",
        style: state.fillStyle,
        lineWidth: state.lineWidth
      }),
    stroke: () =>
      ops.push({
        kind: "stroke",
        style: state.strokeStyle,
        lineWidth: state.lineWidth
      })
  };
  return context as unknown as CanvasRenderingContext2D & { ops: Operation[] };
}

const OPTIONS = { x: 0, y: 0, size: 24, color: "rgb(1, 2, 3)" };

beforeAll(() => {
  (globalThis as unknown as { Path2D: unknown }).Path2D = FakePath2D;
});

describe("圖示轉譯", () => {
  /*
   * **這條是真正的防線。** `drawSvg` 刻意只支援用得到的 SVG 子集，遇到
   * 不認得的元素就跳過而不是丟例外——那個取捨只有在「有東西盯著登記表」
   * 時才安全。哪天有人畫了用 <polygon> 或 <ellipse> 的新圖示，這裡會紅，
   * 而不是等到分享圖上少了一塊才發現。
   */
  it("登記表裡每一個圖示都畫得出東西", () => {
    const silent: string[] = [];
    for (const [name, entry] of Object.entries(ICONS)) {
      const context = createContext();
      drawIcon(context, entry.body, OPTIONS);
      if (context.ops.length === 0) silent.push(name);
    }

    expect(silent, "這些圖示用到了 drawSvg 不支援的語法").toEqual([]);
  });

  it("品牌 lockup 也畫得出來", () => {
    const context = createContext();
    drawSvgMarkup(context, BRAND_LOCKUP_MARKUP, 168.44, 31.61, OPTIONS);

    expect(context.ops.length).toBeGreaterThan(0);
  });

  /*
   * currentColor 是整套圖示能繼承語意色的前提（見圖示 README）。畫到
   * canvas 上時沒有「繼承」這回事，一定要由呼叫端傳進來替換掉。
   */
  it("currentColor 換成呼叫端指定的顏色", () => {
    const context = createContext();
    drawIcon(
      context,
      `<path d="M0 0H24" fill="currentColor"/>`,
      { ...OPTIONS, color: "rgb(9, 9, 9)" }
    );

    expect(context.ops).toEqual([
      { kind: "fill", style: "rgb(9, 9, 9)", lineWidth: 1 }
    ]);
  });

  /*
   * 琥珀金是圖示配色系統的重點色，**不是**可以被語意色蓋掉的墨色。
   * 兩種顏色要分開處理，這條與上一條合起來才守得住雙色圖示。
   */
  it("寫死的重點色原樣保留", () => {
    const context = createContext();
    drawIcon(context, `<circle cx="12" cy="12" r="4" fill="#C1832E"/>`, OPTIONS);

    expect(context.ops).toEqual([
      { kind: "fill", style: "#C1832E", lineWidth: 1 }
    ]);
  });

  /*
   * SVG 的 fill 預設是黑色而不是 none，所以描邊圖示一定會寫 fill="none"。
   * 沒處理的話每個描邊圖示都會多一塊黑色實心。
   */
  it("fill=none 不填色，只描邊", () => {
    const context = createContext();
    drawIcon(
      context,
      `<path d="M0 0H24" fill="none" stroke="currentColor" stroke-width="2.5"/>`,
      OPTIONS
    );

    expect(context.ops).toEqual([
      { kind: "stroke", style: "rgb(1, 2, 3)", lineWidth: 2.5 }
    ]);
  });

  /*
   * 順序跟 SVG 的繪製模型一致：先填再描。反過來的話雙色圖示的描邊會被
   * 填色吃掉一半線寬——那種錯誤在小尺寸下看起來只是「線有點細」。
   */
  it("同時有 fill 與 stroke 時先填後描", () => {
    const context = createContext();
    drawIcon(
      context,
      `<path d="M0 0H24" fill="#C1832E" stroke="currentColor" stroke-width="2"/>`,
      OPTIONS
    );

    expect(context.ops.map((op) => op.kind)).toEqual(["fill", "stroke"]);
  });

  it("<title> 不參與繪圖", () => {
    const context = createContext();
    drawIcon(context, `<title>提醒</title>`, OPTIONS);

    expect(context.ops).toEqual([]);
  });

  /* nav-gear 是登記表裡唯一用 <g transform> 的，拆掉會整顆畫錯位。 */
  it("<g> 裡的內容照樣畫", () => {
    const context = createContext();
    drawIcon(
      context,
      `<g transform="translate(0 -0.3)"><rect x="1" y="1" width="4" height="4" rx="1" fill="currentColor"/></g>`,
      OPTIONS
    );

    expect(context.ops).toEqual([
      { kind: "fill", style: "rgb(1, 2, 3)", lineWidth: 1 }
    ]);
  });

  it("剖析失敗時安靜跳過，不讓整張圖壞掉", () => {
    const context = createContext();
    drawIcon(context, `<path d="M0 0"`, OPTIONS);

    expect(context.ops).toEqual([]);
  });
});

describe("等比縮放", () => {
  /* 品牌 lockup 是橫式的，用高度控制寬度才符合它在 DOM 那邊的用法。 */
  it("寬度由 viewBox 比例與高度決定", () => {
    expect(svgWidthFor(168.44, 31.61, 31.61)).toBeCloseTo(168.44, 5);
    expect(svgWidthFor(24, 24, 40)).toBe(40);
  });
});
