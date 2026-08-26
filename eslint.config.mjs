/**
 * ESLint（flat config）— 抓 unused imports/vars、Vue SFC 問題、明顯的
 * TypeScript 誤用。搭配 stylelint（stylelint.config.mjs）＝ `pnpm lint`。
 *
 * 見 docs/superpowers/plans/2026-08-26-codebase-consolidation-audit.md 的 A3。
 *
 * **第一版刻意保守**：只上 recommended（非 type-aware）＋ unused-imports。
 * type-aware 規則（`@typescript-eslint/no-floating-promises` 等）需要 TS
 * program，在這個 6 套件的 monorepo 裡調校成本高，且這個 repo 大量刻意
 * 用 `void foo()` 做 fire-and-forget——留給後續一輪，範圍縮在
 * apps/web 與各套件的 src。
 */

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";
import configPrettier from "eslint-config-prettier";
import unusedImports from "eslint-plugin-unused-imports";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/*.generated.*",
      "apps/web/src/generated/**",
      "apps/web/public/**",
      "apps/web/src/features/education/education-content.generated.ts",
      ".claude/**",
      ".worktrees/**",
      // Deno runtime、自成一套；不在這輪範圍。
      "supabase/**",
      // node 腳本（多為 .mjs）、沒有 TS project；之後另開。
      "tools/**",
      "*.config.{js,mjs,ts}",
      "vitest.config.ts"
    ]
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/recommended"],

  // 這輪 lint 的範圍是前端與共用套件——都跑在瀏覽器（apps/web）或
  // 被瀏覽器端消費（packages/*）。browser globals 全域開。
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2024 }
    }
  },

  {
    plugins: { "unused-imports": unusedImports },
    rules: {
      // unused-imports 取代 base 的 no-unused-vars——它能 --fix 移除死 import。
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none"
        }
      ]
    }
  },

  {
    rules: {
      /* --- 這個 repo 的既有慣例，刻意不強制 --- */
      // 大量 `void foo()` 是刻意的 fire-and-forget，不是漏接。
      "no-void": "off",
      // let x = null 再在 try/catch 各分支賦值，是這個 repo 慣用的防禦式初始化。
      "no-useless-assignment": "off",
      // 元件檔名用 PascalCase.vue，單一單字元件（如 Icon）也允許。
      "vue/multi-word-component-names": "off",
      "vue/require-explicit-emits": "warn",
      "vue/attributes-order": "off",
      "vue/require-default-prop": "warn",
      // 全站只有 2 處 v-html，都餵 build-time 產生器的信任內容
      // （Icon.vue ← icons.generated.ts；EducationArticlePage ← 由 .md 產生的
      // bodyHtml）。沒有任何地方把使用者輸入丟進 v-html，這條規則在此無作用。
      "vue/no-v-html": "off",
      // 只在真的 code 裡管不可見空白；中文註解／字串裡的全形空格是正常的。
      "no-irregular-whitespace": [
        "error",
        {
          skipComments: true,
          skipStrings: true,
          skipTemplates: true,
          skipRegExps: true,
          skipJSXText: true
        }
      ],
      // TS 的 `as unknown as X` 在 platform port 邊界會用到；警告即可。
      "@typescript-eslint/no-explicit-any": "warn",
      // 契約層用 `interface X {}` 空介面當 marker / 擴充點。
      "@typescript-eslint/no-empty-object-type": "off"
    }
  },

  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        sourceType: "module"
      }
    }
  },

  {
    files: ["**/*.test.ts", "**/*.test.mts"],
    languageOptions: {
      globals: { ...globals.node, vi: "readonly" }
    },
    rules: {
      // 測試 mock 大量用 `as unknown as X`／`any` 繞過型別。
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-expressions": "off"
    }
  },

  // 一律放最後：關掉所有跟 Prettier（A2）會打架的排版規則。
  configPrettier
);
