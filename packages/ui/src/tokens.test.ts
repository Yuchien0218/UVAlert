import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * DESIGN.md（設計系統唯一權威）↔ styles.css（程式碼真實來源）的漂移守門測試。
 *
 * 起因見 docs/superpowers/plans/2026-08-26-codebase-consolidation-audit.md 的 C1：
 * 2026-08-25 才發現 DESIGN.md 的 body-md 訂 16px，但 --font-size-body 一直是
 * 14px——沒有任何機制擋住這種落差。這個測試 parse DESIGN.md frontmatter 的
 * colors／rounded／spacing／layout，逐項比對 styles.css 的對應 token。
 *
 * **範圍界定**：typography（14 級編輯量表）與 code 端 8 個 --font-size-* token
 * 的命名對應太亂，是 D2 的工作，本檔案只驗證唯一校準過的 body-md。
 *
 * **KNOWN_DRIFT**：已知對不上、待 D2 裁決的項目列在下方清單，測試放行；
 * 但另有一個測試守著「這些項目現在仍然真的有落差」——修好一項後那個測試
 * 會失敗，提醒你把它從清單移除。
 *
 * vitest 的 cwd 是 repo 根目錄（沿用 apps/web/.../BottomNavigation.test.ts 的前例）。
 */

const designMd = readFileSync("DESIGN.md", "utf8");
const stylesCss = readFileSync("packages/ui/src/styles.css", "utf8");

// --- DESIGN.md frontmatter parser（只認得這份文件實際用到的簡單 YAML 形狀）---

/** 回傳某個頂層 key 底下「兩格縮排的 subkey: value」對照，忽略更深層巢狀。 */
function frontmatterSection(topKey: string): Record<string, string> {
  const fm = designMd.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  const out: Record<string, string> = {};
  let inSection = false;
  for (const line of fm.split(/\r?\n/)) {
    if (/^\S/.test(line)) {
      inSection = line.trimEnd() === `${topKey}:`;
      continue;
    }
    if (!inSection) continue;
    const match = line.match(/^ {2}([\w-]+):\s*(.+)$/);
    if (match) {
      out[match[1]!] = match[2]!.trim().replace(/^["']|["']$/g, "");
    }
  }
  return out;
}

// --- styles.css :root custom property extractor ---

const cssTokens: Record<string, string> = (() => {
  const root = stylesCss.match(/:root\s*\{([\s\S]*?)\r?\n\}/)?.[1] ?? "";
  const out: Record<string, string> = {};
  for (const line of root.split(/\r?\n/)) {
    const match = line.match(/^\s*(--[\w-]+):\s*([^;]+);/);
    if (match) out[match[1]!] = match[2]!.trim();
  }
  return out;
})();

// --- DESIGN.md key → styles.css token 名 ---

const SPACING_MAP: Record<string, string> = {
  xxs: "--space-1",
  xs: "--space-2",
  sm: "--space-3",
  md: "--space-4",
  lg: "--space-5",
  xl: "--space-6",
  xxl: "--space-8",
  section: "--space-10"
};

const LAYOUT_MAP: Record<string, string | null> = {
  "content-max": "--content-max",
  "tap-target": "--tap-target",
  // 左右留白沒有對應 token，AppShell 用 clamp()——列入 KNOWN_DRIFT。
  "page-gutter-mobile": null,
  "page-gutter-desktop": null
};

function tokenFor(section: string, key: string): string | null {
  switch (section) {
    case "colors":
      // accent-mauve → --color-mauve；status-due → --color-due；其餘 1:1。
      return `--color-${key.replace(/^(accent|status)-/, "")}`;
    case "rounded":
      return `--radius-${key}`;
    case "spacing":
      return SPACING_MAP[key] ?? null;
    case "layout":
      return LAYOUT_MAP[key] ?? null;
    default:
      return null;
  }
}

/** hex 統一小寫；px / rem 統一換算成 rem 數值字串（16px 基準）。 */
function normalize(value: string): string {
  const v = value.trim().toLowerCase();
  const px = v.match(/^(-?[\d.]+)px$/);
  if (px) return `${parseFloat(px[1]!) / 16}rem`;
  const rem = v.match(/^(-?[\d.]+)rem$/);
  if (rem) return `${parseFloat(rem[1]!)}rem`;
  return v;
}

// --- 已知落差（待 D2 裁決）---

const KNOWN_DRIFT: Record<string, string> = {
  "colors.status-saved":
    "DESIGN.md §2 訂藕紫 #8C6F7A（明文「刻意用藕紫不用綠」）；code 把這個狀態改名成 .status-card--success 並用綠色 --color-success #147d64，且 styles.css 沒有 --color-saved。方向相反的落差，待 D2。",
  "colors.warning":
    "DESIGN.md #C78336；styles.css 沒有 --color-warning（實作用 --color-soon 兼表警示）。待 D2 決定要不要建 token。",
  "colors.error":
    "DESIGN.md #B84D4C；styles.css 沒有 --color-error（實作一律用 --color-due）。待 D2。",
  // 註：colors.muted-soft 目前值一致（不在 KNOWN_DRIFT），但 D4 已裁決要
  // 連同 --text-tertiary 一起砍掉——屆時 DESIGN.md §2 那一列與 styles.css
  // 的 --color-muted-soft 一起移除，這個測試就不再涵蓋它。
  "rounded.full":
    "DESIGN.md 有 pill:999px 與 full:9999px 兩級；styles.css 只有 --radius-pill。full 從沒被用過。待 D2。",
  "layout.page-gutter-mobile":
    "沒有對應 token——AppShell 用 clamp(1rem, 5vw, 2.75rem)。待 D2/D3 決定要不要 token 化。",
  "layout.page-gutter-desktop": "同 page-gutter-mobile。"
};

// --- 測試 ---

const SECTIONS = ["colors", "rounded", "spacing", "layout"] as const;

describe("DESIGN.md ↔ styles.css token 一致性", () => {
  for (const section of SECTIONS) {
    describe(section, () => {
      const entries = frontmatterSection(section);

      it(`frontmatter 有 parse 到 ${section}（非空）`, () => {
        expect(Object.keys(entries).length).toBeGreaterThan(0);
      });

      for (const [key, designValue] of Object.entries(entries)) {
        const id = `${section}.${key}`;
        if (id in KNOWN_DRIFT) continue;

        const token = tokenFor(section, key);

        it(`${id} 對應 ${token}，值一致`, () => {
          expect(token, `${id} 沒有 token 對應規則`).not.toBeNull();
          const cssValue = cssTokens[token!];
          expect(
            cssValue,
            `styles.css :root 缺少 ${token}（DESIGN.md ${id} = ${designValue}）`
          ).toBeDefined();
          expect(
            normalize(cssValue!),
            `${token} = ${cssValue}，DESIGN.md ${id} = ${designValue}`
          ).toBe(normalize(designValue));
        });
      }
    });
  }

  it("body-md（唯一校準過的字級）與 --font-size-body 一致", () => {
    // DESIGN.md typography.body-md.fontSize = 16px；其餘字級對應待 D2。
    const bodyMd = designMd.match(/body-md:[\s\S]*?fontSize:\s*(\d+)px/)?.[1];
    expect(bodyMd, "DESIGN.md 找不到 body-md fontSize").toBeDefined();
    expect(normalize(`${bodyMd}px`)).toBe(normalize(cssTokens["--font-size-body"]!));
  });

  it("KNOWN_DRIFT 的每一項現在仍然真的有落差（修好就從清單移除）", () => {
    const resolved: string[] = [];
    for (const id of Object.keys(KNOWN_DRIFT)) {
      const [section, key] = id.split(".") as [string, string];
      const designValue = frontmatterSection(section)[key];
      const token = tokenFor(section, key);
      const cssValue = token ? cssTokens[token] : undefined;
      const stillDrifts =
        designValue === undefined ||
        cssValue === undefined ||
        normalize(cssValue) !== normalize(designValue);
      if (!stillDrifts) resolved.push(id);
    }
    expect(
      resolved,
      `這些項目已經一致，請從 KNOWN_DRIFT 移除：${resolved.join(", ")}`
    ).toEqual([]);
  });
});
