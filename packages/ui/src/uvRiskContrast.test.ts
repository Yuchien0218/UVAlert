import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * UV 五級風險色的對比度守門。
 *
 * 這五個色在畫面上有**兩種**用法，門檻不同、但實務上兩邊都需要 4.5:1：
 *
 * 1. 當文字直接畫在暖象牙畫布上（`HomeUvHeadline` 的讀數與等級標籤）
 * 2. 當底色、上面疊 `--text-inverse` 的白字（`FiveDayUvCard` 的等級徽章）
 *
 * 2026-08-31 之前，低／中／高三級在**兩種用法上都不及格**（見 DESIGN.md
 * 第二節）。壓暗之後全部過關，這條測試把它釘住——之後有人再把色票調亮，
 * 這裡會直接紅掉，而不是等使用者在畫面上看出問題。
 *
 * 讀 styles.css 的實際值，不是讀 DESIGN.md：`tokens.test.ts` 已經守著兩者
 * 一致，這裡守的是「程式碼裡真正用到的顏色夠不夠看得清楚」。
 *
 * vitest 的 cwd 是 repo 根目錄。
 */

const stylesCss = readFileSync("packages/ui/src/styles.css", "utf8");

/** 讀 :root 的值；`--text-inverse: var(--color-on-dark)` 這種一層轉指也解得開。 */
/**
 * 逐行掃描而不用動態組出來的正規表示式——token 名稱裡有 `-`，拼進 regex
 * 之後很容易被跳脫問題咬到，而這裡要找的其實只是「開頭是這個宣告」。
 */
function declaredValue(name: string): string | undefined {
  const prefix = `${name}:`;
  for (const line of stylesCss.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(prefix)) continue;
    return trimmed.slice(prefix.length).replace(/;.*$/, "").trim();
  }
  return undefined;
}

function token(name: string, depth = 0): string {
  if (depth > 4) throw new Error(`${name} 的 var() 巢狀太深`);
  const value = declaredValue(name);
  if (value === undefined) throw new Error(`styles.css 找不到 ${name}`);
  const indirect = value.match(/^var\((--[\w-]+)\)$/)?.[1];
  if (indirect !== undefined) return token(indirect, depth + 1);
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error(`${name} 不是六位十六進位色：${value}`);
  }
  return value;
}

/** WCAG 2.x relative luminance。 */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const LEVELS = [
  "--color-uvi-low",
  "--color-uvi-moderate",
  "--color-uvi-high",
  "--color-uvi-very-high",
  "--color-uvi-extreme"
] as const;

const AA_NORMAL = 4.5;

describe("UV 五級風險色的對比度", () => {
  /*
   * 兩種用法分成兩條測試。合成一條的話，只要有一邊過就可能掩護另一邊——
   * 而 2026-08-31 修的正是「兩邊各自不及格」的情形。
   */
  it.each(LEVELS)("%s 當文字畫在畫布上時達到 AA", (name) => {
    expect(contrast(token(name), token("--color-canvas"))).toBeGreaterThanOrEqual(
      AA_NORMAL
    );
  });

  it.each(LEVELS)("%s 當底色、疊白字時達到 AA", (name) => {
    expect(
      contrast(token(name), token("--text-inverse"))
    ).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  /*
   * 壓暗的代價：五個色的亮度變接近，地圖上主要靠色相而不是明暗區分。
   * 這條不是「必須很接近」，是**釘住這個已知代價**——如果之後有人重新
   * 拉開亮度差（例如改用另一組色票），這裡會紅，提醒去更新 DESIGN.md
   * 裡「靠色相區分」那段敘述與地圖的無障礙處理。
   */
  it("相鄰兩級之間的亮度差很小，所以地圖不能只靠明暗", () => {
    const neighbours = LEVELS.slice(0, -1).map((name, index) =>
      contrast(token(name), token(LEVELS[index + 1]!))
    );
    for (const ratio of neighbours) {
      expect(ratio).toBeLessThan(1.5);
    }
  });
});
