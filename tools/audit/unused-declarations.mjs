#!/usr/bin/env node
/**
 * 「宣告了但沒套用」掃描。
 *
 * 起因：2026-08-30 發現 `/settings/data` 的資料概況卡「卡片做了，但提案的
 * 說明句與分隔線沒應用」，使用者問還有沒有類似狀況。首次執行找到 8 個
 * 從未被 `var()` 引用的 token——而既有的 `tokens.test.ts` 完全看不到這一類，
 * 它守的是「DESIGN.md → styles.css 的值一致」，不是「有沒有人在用」。
 *
 * **刻意不是 `pnpm check` 的一部分，也不決定 CI 成敗。** 「先定義 token、
 * 之後才套用」是正常流程（`--color-blush` 就是這種狀態，有規範依據但還沒
 * 落點），讓它擋 PR 會逼人為了過測試而亂套用或刪掉還有效的規範。
 *
 * 用法：pnpm audit:unused
 *
 * 掃描前會先剝掉註解——否則註解裡提到的名稱會被算成「有使用」，這是第一版
 * 踩過的坑。另一個坑是元件：路由用動態 import 字串，而 `pages/` 底下的元件
 * 也可能被同目錄的其他頁面 import（`EducationNotFoundPage` 就是），只看
 * 檔名出現次數會誤報。
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (
      ["node_modules", "dist", ".git", ".worktrees", ".pnpm-store"].includes(
        entry
      )
    )
      continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else files.push(full);
  }
}
walk(join(ROOT, "apps/web/src"));
walk(join(ROOT, "packages"));

const stripComments = (source) =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const read = (file) => stripComments(readFileSync(file, "utf8"));

const vueFiles = files.filter((f) => extname(f) === ".vue");
const codeFiles = files.filter(
  (f) => [".vue", ".ts", ".css"].includes(extname(f)) && !f.includes(".test.")
);

const markup = vueFiles.map(read).join("\n");
const code = codeFiles.map(read).join("\n");

const appCss = read(join(ROOT, "apps/web/src/assets/app.css"));
const stylesCss = read(join(ROOT, "packages/ui/src/styles.css"));
const router = read(join(ROOT, "apps/web/src/router/index.ts"));

// --- 1. app.css 宣告的 class ---
const classes = new Set();
for (const m of appCss.matchAll(/\.([a-z][a-z0-9_-]*)/gi)) classes.add(m[1]);
// 網址（w3.org 等）會被上面的正規表達式誤抓，用白名單排除
const URL_NOISE = new Set(["org", "w3"]);
const unusedClasses = [...classes]
  .filter((c) => !URL_NOISE.has(c) && !markup.includes(c))
  .sort();

// --- 2. styles.css :root 宣告的 token ---
const tokens = new Set();
for (const m of stylesCss.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)) tokens.add(m[1]);
const consumers = code + appCss + stylesCss;
const unusedTokens = [...tokens]
  .filter(
    (t) => !consumers.includes(`var(${t})`) && !consumers.includes(`var(${t},`)
  )
  .sort();

// --- 3. 元件／頁面 ---
const unusedComponents = vueFiles
  .filter((file) => {
    const name = basename(file, ".vue");
    if (router.includes(`${name}.vue`)) return false; // 路由動態 import
    const references = (code.match(new RegExp(`\\b${name}\\b`, "g")) || [])
      .length;
    return references <= 1; // 只有自己
  })
  .map((f) => f.replace(ROOT, "").split("\\").join("/"))
  .sort();

// --- 4. 圖示註冊表 ---
const iconsGenerated = readFileSync(
  join(ROOT, "apps/web/src/generated/icons.generated.ts"),
  "utf8"
);
const icons = [...iconsGenerated.matchAll(/^\s*"([a-z0-9-]+)":\s*\{/gim)].map(
  (m) => m[1]
);
const unusedIcons = icons.filter((name) => !code.includes(name)).sort();

const groups = [
  ["app.css class", classes.size - URL_NOISE.size, unusedClasses],
  ["styles.css token", tokens.size, unusedTokens],
  [".vue 元件", vueFiles.length, unusedComponents],
  ["圖示", icons.length, unusedIcons]
];

let total = 0;
for (const [label, count, unused] of groups) {
  total += unused.length;
  const head = `${label}：${count} 個，未使用 ${unused.length}`;
  console.log(unused.length === 0 ? `✅ ${head}` : `⚠️  ${head}`);
  for (const item of unused) console.log(`     ${item}`);
}

console.log(
  total === 0
    ? "\n沒有發現未使用的宣告。"
    : `\n共 ${total} 項。**未使用不等於該刪**——先確認 DESIGN.md 是否已經指定用途；` +
        "\n2026-08-30 就有 4 個 token 差點被當成死碼收掉，實際上規範還有效、只是尚未套用。" +
        "\n判讀方式見 docs/decisions/2026-08-30-unused-declaration-audit.md。"
);
