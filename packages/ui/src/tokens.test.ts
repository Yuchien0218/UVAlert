import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * DESIGN.md（設計系統唯一權威）↔ styles.css（程式碼真實來源）的漂移守門測試。
 *
 * 起因見 docs/superpowers/plans/2026-08-26-codebase-consolidation-audit.md 的 C1：
 * 2026-08-25 曾發現 DESIGN.md 的 body-md 訂 16px，但 --font-size-body 一直是
 * 14px——沒有任何機制擋住這種落差。這個測試 parse DESIGN.md frontmatter 的
 * colors／rounded／spacing／layout／typography，逐項比對 styles.css 的對應 token。
 *
 * **範圍界定**：B8 將 typography 收斂為七個語意角色；每個 canonical
 * --font-size-* token 都必須與 DESIGN.md 同值。倒數與讀數是元件級例外，
 * 不納入一般文字量表。
 *
 * **KNOWN_DRIFT**：已知對不上、待裁決的項目列在下方清單，測試放行；另有一個
 * 測試守著「這些項目現在仍然真的有落差」——修好一項後那個測試會失敗，提醒
 * 你把它移除。2026-08-26 的 D2/D4 已把清單清空（colors/rounded/spacing/layout
 * 目前全對齊）。
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
  for (const match of root.matchAll(/^\s*(--[\w-]+):\s*([\s\S]*?);/gm)) {
    out[match[1]!] = match[2]!.trim().replace(/\s+/g, " ");
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

const LAYOUT_MAP: Record<string, string> = {
  "content-max": "--content-max",
  "tap-target": "--tap-target"
  // 左右留白（page-gutter）2026-08-26 從 frontmatter 移除——它是流動的
  // clamp() 不是 token，只留在 §12 prose。
};

const TYPOGRAPHY_ROLES = [
  "page-title",
  "section-title",
  "card-title",
  "body",
  "supporting",
  "caption",
  "nav-label"
] as const;

const TYPOGRAPHY_FIELDS = {
  fontFamily: "font-family",
  fontSize: "font-size",
  fontWeight: "font-weight",
  lineHeight: "line-height",
  letterSpacing: "letter-spacing"
} as const;

type TypographyField = keyof typeof TYPOGRAPHY_FIELDS;

function typographyRoles(): Record<
  string,
  Partial<Record<TypographyField, string>>
> {
  const fm = designMd.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  const section = fm.match(/^typography:\r?\n([\s\S]*?)(?=^\S)/m)?.[1] ?? "";
  const out: Record<string, Partial<Record<TypographyField, string>>> = {};
  let currentKey: string | null = null;

  for (const line of section.split(/\r?\n/)) {
    const role = line.match(/^ {2}([\w-]+):\s*$/);
    if (role) {
      currentKey = role[1]!;
      out[currentKey] = {};
      continue;
    }
    const field = line.match(
      /^ {4}(fontFamily|fontSize|fontWeight|lineHeight|letterSpacing):\s*(.+)$/
    );
    if (currentKey !== null && field) {
      out[currentKey]![field[1] as TypographyField] = field[2]!
        .trim()
        .replace(/^["']|["']$/g, "");
    }
  }
  return out;
}

function typographyToken(role: string, field: TypographyField): string {
  return `--${TYPOGRAPHY_FIELDS[field]}-${role}`;
}

function resolveCssToken(
  token: string,
  seen = new Set<string>()
): string | undefined {
  if (seen.has(token)) throw new Error(`CSS token alias cycle: ${token}`);
  const value = cssTokens[token];
  if (value === undefined) return undefined;
  const alias = value.match(/^var\((--[\w-]+)\)$/);
  if (alias === null) return value;
  seen.add(token);
  return resolveCssToken(alias[1]!, seen);
}

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

// --- 已知落差（待清空）---
//
// 2026-08-26（D2）已解決並從 DESIGN.md frontmatter 一併移除：
//   colors.warning / colors.error（改沿用 status-soon / status-due）、
//   rounded.full（只留 pill）、layout.page-gutter-*（改 §12 prose）。
// 2026-08-26（D4）已解決：colors.muted-soft（連同 --color-muted-soft /
//   --text-tertiary 一起砍）。

const KNOWN_DRIFT: Record<string, string> = {};

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

  describe("typography", () => {
    const entries = typographyRoles();

    it("只公開核准的七個語意角色", () => {
      expect(Object.keys(entries).sort()).toEqual([...TYPOGRAPHY_ROLES].sort());
    });

    for (const role of TYPOGRAPHY_ROLES) {
      it(`${role} 的五個 typography 欄位與 runtime contract 一致`, () => {
        const designRole = entries[role];
        expect(designRole, `DESIGN.md 缺少 typography.${role}`).toBeDefined();
        expect(Object.keys(designRole!).sort()).toEqual(
          Object.keys(TYPOGRAPHY_FIELDS).sort()
        );

        for (const field of Object.keys(
          TYPOGRAPHY_FIELDS
        ) as TypographyField[]) {
          const token = typographyToken(role, field);
          const runtimeValue = resolveCssToken(token);
          expect(runtimeValue, `styles.css 缺少 ${token}`).toBeDefined();
          expect(
            normalize(runtimeValue!.replace(/\s+/g, " ")),
            `${token} = ${runtimeValue}，DESIGN.md typography.${role}.${field} = ${designRole![field]}`
          ).toBe(normalize(designRole![field]!));
        }
      });
    }

    it("不再宣告 B8 前的舊字級桶", () => {
      for (const legacy of [
        "--font-size-label",
        "--font-size-title-sm",
        "--font-size-title",
        "--font-size-title-md"
      ]) {
        expect(cssTokens[legacy]).toBeUndefined();
      }
    });
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
