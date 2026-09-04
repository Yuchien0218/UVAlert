import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = "apps/web/src";
const currentTestFile = join(sourceRoot, "assets", "typographyRoles.test.ts");

function discoverSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return discoverSourceFiles(entryPath);
    if (entryPath === currentTestFile) return [];
    return /\.(?:vue|css)$/.test(entry.name) ? [entryPath] : [];
  });
}

const migratedFiles = discoverSourceFiles(sourceRoot).sort();

const legacyToken = /--font-size-(?:label|title-sm|title-md|title)\b/;

const typographyRoles = [
  "page-title",
  "section-title",
  "card-title",
  "body",
  "supporting",
  "caption",
  "nav-label"
] as const;

const typographyProperties = [
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing"
] as const;

/**
 * `h3` 從 2026-09-04 起也可以是 `supporting`。
 *
 * 起因是本機資料頁的同步狀態列（「目前使用免登入模式」）：它是 `<h3>`，
 * 但畫面上緊接在群組標題「跨裝置同步」下面，兩者同為 card-title 18/500
 * ——**一個區塊裡兩個同級標題**，使用者回報「這一區排版很亂」。
 *
 * 降階是使用者裁決的，而且刻意一次降到 supporting（14px）而不是回到 16px：
 * 2026-09-02 那次正是因為「18 對 16 差一階，看得出不一樣卻看不出為什麼」
 * 才把它從 16 拉到 18。18 對 14 是看得出意圖的差距。
 *
 * **`h3` 仍然只有這兩個選項**：允許 supporting 不等於放行 body／caption，
 * 那會讓標題掉進內文的字級。
 */
const allowedHeadingRolesByTag = {
  h1: ["page-title"],
  h2: ["section-title", "card-title"],
  h3: ["card-title", "supporting"]
} as const;

const allowedComponentExceptions = new Set([
  "apps/web/src/components/setup/ZoneProtectionForm.vue:setup-preset-headline",
  "apps/web/src/pages/setup/SetupPage.vue:setup-recovery-headline",
  /*
   * 2026-09-01：分享卡的標題。role 仍是 section-title，但它被分享出去之後
   * 是整張圖唯一的主體，版面上必須是展示級——跟頁面裡的區塊標題不是同一
   * 種角色。
   */
  "apps/web/src/components/product/GearShareCard.vue:share-card-hero-title"
]);

/*
 * 2026-08-30：掃描前先剝註解。
 *
 * 這條守門原本直接掃原始碼字串，於是**連註解都算數**——寫一句「不要用
 * `--font-size-title-sm`，它是 B8 遷移前的舊字級桶」就會讓測試紅，等於
 * 禁止在程式碼裡解釋為什麼不能用它。實際踩到了：`GearForm.vue` 的
 * `.category-fieldset legend` 註解說明選 canonical token 的理由時提到
 * 舊 token 名，測試就紅了。
 *
 * 剝掉註解之後守門強度不變——真正的 `font-size: var(--font-size-title-sm)`
 * 仍然會被抓到，只是解釋文字不再誤判。
 */
const stripComments = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("B8 typography role migration", () => {
  for (const file of migratedFiles) {
    it(`${file} 不再使用舊字級桶`, () => {
      expect(stripComments(readFileSync(file, "utf8"))).not.toMatch(
        legacyToken
      );
    });
  }

  /*
   * 2026-08-31：`.safety-note` 改守 caption（使用者裁決，DESIGN.md 第五節
   * 已記錄這個例外）。
   *
   * 它原本跟下面三條一樣守 supporting——規則是「可跨行閱讀的次要資訊；
   * 重要指示不可降到 caption」。這一條被開了例外，因為那句免責出現在每一頁
   * 底部、每次捲到底都會再讀一次，14px 兩行的份量與資訊量不成比例。
   *
   * **這條測試沒有被刪掉，是改了斷言。** 刪掉的話字級之後可以自由漂移；
   * 開例外與不設限是兩件事。
   */
  it("安全說明是 caption role（DESIGN.md 第五節記錄的唯一例外）", () => {
    expect(readFileSync("apps/web/src/assets/app.css", "utf8")).toMatch(
      /\.safety-note\s*\{[^}]*font-size:\s*var\(--font-size-caption\);/
    );
  });

  /*
   * **例外只換字級，不換顏色。** 原始提案是「降字級並降低對比」，只採用
   * 前半：--text-secondary 在畫布上是 5.92:1，12px 仍然過 AA 的 4.5:1；
   * 再壓暗就會掉到門檻以下。免責文字可以小，不可以看不清楚。
   */
  it("安全說明的顏色維持 text-secondary，不再壓暗", () => {
    expect(readFileSync("apps/web/src/assets/app.css", "utf8")).toMatch(
      /\.safety-note\s*\{[^}]*color:\s*var\(--text-secondary\);/
    );
  });

  it("將裝備表單的可換行暱稱說明維持在 supporting role", () => {
    expect(
      readFileSync("apps/web/src/components/product/GearForm.vue", "utf8")
    ).toMatch(
      /\.field-helper\s*\{[^}]*font-size:\s*var\(--font-size-supporting\);/
    );
  });

  it("將通知設定的可換行說明維持在 supporting role", () => {
    const source = readFileSync(
      "apps/web/src/pages/settings/NotificationSettingsPage.vue",
      "utf8"
    );

    for (const selector of ["note-box", "delivery-note"]) {
      expect(source, selector).toMatch(
        new RegExp(
          `\\.${selector}\\s*\\{[^}]*font-size:\\s*var\\(--font-size-supporting\\);`
        )
      );
    }
  });

  it("允許衛教文章本文在窄版 grid track 內收縮", () => {
    expect(
      readFileSync(
        "apps/web/src/pages/education/EducationArticlePage.vue",
        "utf8"
      )
    ).toMatch(/\.education-article-body\s*\{[^}]*min-width:\s*0;/);
  });

  it("讓流程完成狀態維持 section-title，不被一般卡片規則覆蓋", () => {
    expect(readFileSync("apps/web/src/assets/app.css", "utf8")).toMatch(
      /\.success-panel h2\s*\{[^}]*font-size:\s*var\(--font-size-section-title\);/
    );

    for (const file of [
      "apps/web/src/pages/EventCorrectionPage.vue",
      "apps/web/src/pages/ReportContextEventPage.vue"
    ]) {
      expect(readFileSync(file, "utf8"), file).toMatch(
        /\.app-card:not\(\.success-panel\) > h2\s*\{[^}]*font-size:\s*var\(--font-size-card-title\);/
      );
    }
  });

  it("讓每個 runtime raw heading 明確宣告合法的 typography role", () => {
    const discoveredExceptions = new Set<string>();

    /*
     * 2026-09-01：這一段也要剝註解。
     *
     * 上面的舊字級掃描早就剝了（見那段註解），但**這個 heading 掃描沒有**
     * ——於是註解裡提到一個標籤就會被當成真的標題。實際踩到：
     * `DataSettingsPage.vue` 的一段 CSS 註解寫「從 <strong> 改成 <h3>，
     * 字級跟著 card-title 對齊」，測試立刻紅，訊息是「<h3>: expected
     * undefined to be defined」——等於禁止在程式碼裡說明自己做了什麼。
     *
     * 這正是 CLAUDE.md「守門測試：坑一」的第二種方向（假失敗）。剝掉之後
     * 守門強度不變：真正的 `<h3 …>` 在 template 裡，仍然全部掃得到。
     */
    for (const file of migratedFiles.filter((path) => path.endsWith(".vue"))) {
      const source = stripComments(readFileSync(file, "utf8"));
      for (const match of source.matchAll(/<(h[1-3])\b[^>]*>/g)) {
        const tagName = match[1] as keyof typeof allowedHeadingRolesByTag;
        const openingTag = match[0];
        const role = openingTag.match(
          /\bdata-typography-role="([a-z-]+)"/
        )?.[1];

        expect(role, `${file}: ${openingTag}`).toBeDefined();
        expect(
          allowedHeadingRolesByTag[tagName],
          `${file}: ${openingTag}`
        ).toContain(role);

        const exceptionName = openingTag.match(
          /\bdata-typography-exception="([a-z-]+)"/
        )?.[1];
        if (exceptionName !== undefined) {
          discoveredExceptions.add(
            `${file.replaceAll("\\", "/")}:${exceptionName}`
          );
        }
      }
    }

    expect(discoveredExceptions).toEqual(allowedComponentExceptions);
  });

  it("將七個 role annotation 的完整 contract 直接連到 canonical token", () => {
    const appCss = readFileSync("apps/web/src/assets/app.css", "utf8");

    for (const role of typographyRoles) {
      const declarations = [
        ...appCss.matchAll(
          new RegExp(
            `[^{}]*\\[data-typography-role="${role}"\\][^{}]*\\{([\\s\\S]*?)\\}`,
            "g"
          )
        )
      ]
        .map((match) => match[1])
        .join("\n");
      expect(declarations, role).not.toBe("");

      for (const property of typographyProperties) {
        expect(declarations, `${role}.${property}`).toMatch(
          new RegExp(
            `${property}:\\s*var\\(--${property}-${role.replaceAll("_", "-")}\\);`
          )
        );
      }
    }
  });
});
