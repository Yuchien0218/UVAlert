import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  existsSync
} from "node:fs";
import { resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import subsetFont from "subset-font";

/**
 * 字型管線：把完整字型裁成這個專案實際會渲染的字元。
 *
 * 為什麼要 subset：Noto Serif TC 完整檔 24MB，而全站（含 48 篇衛教文章）
 * 只用到 1,200 多個不重複漢字。不裁的話標題字體會是幾 MB 的下載，對一個
 * 本機優先的 PWA 來說不可接受。
 *
 * 為什麼 self-host 而不是 Google Fonts CDN：這個產品的定位是免登入、
 * 本機優先、連座標都不外傳（見 README「地區設定與定位隱私」）。若改用
 * CDN，每個使用者每次開頁都會把 IP 送給 Google，與該定位矛盾。
 *
 * 字元來源分兩類，對應兩種字體角色：
 *
 *   - 標題字（Noto Serif TC）只渲染固定字串——UI 標籤、衛教文章標題。
 *     使用者輸入（裝備名稱、備註）只出現在內文，不會進標題。所以 subset
 *     是安全的。
 *
 *     標題不另外搭配拉丁顯示字體（2026-08-23 裁決）。實測 54 個文章標題
 *     中只有 11 個含拉丁字母，且**全部**是嵌在中文句子裡的縮寫（UV、UVA、
 *     SPF、PA、UPF），沒有任何一個是連續拉丁文字——也就是沒有「拉丁標題
 *     排版」這個工作。Noto Serif TC 自帶的拉丁字形本來就是為了搭配它的
 *     中文而設計，縮寫與中文的視覺重量一致；額外掛一支西文襯線體只會
 *     造成粗細與對比不搭。
 *   - 無襯線體（內文）會渲染使用者輸入，任何 subset 都可能缺字。因此
 *     這裡只裁拉丁字元，中文內文交給系統黑體（PingFang TC／微軟正黑），
 *     兩者在台灣裝置上品質都不錯，且完全不需下載。
 *
 * 這個取捨與 DESIGN.md 第三節「內文用 Noto Sans TC」有出入，是刻意的：
 * 內文中文若 subset 會缺字，若完整載入則體積不可接受。詳見 tools/fonts/README.md。
 */

const ROOT = resolve(fileURLToPath(import.meta.url), "../../..");
const SOURCE = resolve(ROOT, "tools/fonts/source");
const OUTPUT = resolve(ROOT, "apps/web/public/fonts");

/** 掃描這些目錄裡的原始碼，收集所有會被渲染的字元。 */
const SCAN_ROOTS = ["apps/web/src"];
const SCAN_EXTENSIONS = new Set([".vue", ".ts"]);

/**
 * 衛教內容檔特別處理：它有 1,056 個漢字，但那大多是**文章內文**，
 * 而內文是無襯線體。襯線體只需要標題，所以這個檔案只取 "title" 欄位。
 *
 * 這讓襯線體 subset 從 1,228 字降到約 900 字。分開處理是安全的，因為
 * 這個檔案是產生出來的結構化資料，欄位名稱穩定（見 tools/education/
 * generate-content.mjs）。
 */
const HEADING_ONLY_FILES = new Map([
  [
    "apps/web/src/features/education/education-content.generated.ts",
    (source) =>
      [...source.matchAll(/"title":\s*"((?:[^"\\]|\\.)*)"/g)]
        .map((match) => match[1])
        .join("")
  ]
]);

/** 一定要納入的字元，即使目前程式碼裡沒出現。 */
const ALWAYS_INCLUDE =
  "0123456789" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" +
  " .,:;!?'\"()[]{}%-–—/\\+×÷=<>@#&*_|~^`$" +
  "。，、；：？！「」『』（）〔〕【】《》〈〉…—～·" +
  "℃°";

function collectCharacters() {
  const characters = new Set(ALWAYS_INCLUDE);

  const headingOnly = new Map(
    [...HEADING_ONLY_FILES].map(([path, extract]) => [
      resolve(ROOT, path),
      extract
    ])
  );

  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules") continue;
        walk(path);
        continue;
      }
      if (!SCAN_EXTENSIONS.has(extname(entry.name))) continue;

      const source = readFileSync(path, "utf8");
      const extract = headingOnly.get(path);
      for (const character of extract ? extract(source) : source) {
        characters.add(character);
      }
    }
  };

  for (const scanRoot of SCAN_ROOTS) walk(resolve(ROOT, scanRoot));

  // 只留下真正需要字型覆蓋的字元：CJK、注音、全形標點與可見 ASCII。
  // 原始碼裡的控制字元與罕見符號沒必要進字型。
  return [...characters]
    .filter((character) => {
      const code = character.codePointAt(0);
      if (code < 0x20) return false;
      if (code <= 0x7e) return true;
      return (
        (code >= 0x00a0 && code <= 0x00ff) ||
        (code >= 0x2000 && code <= 0x206f) ||
        (code >= 0x2100 && code <= 0x214f) ||
        (code >= 0x3000 && code <= 0x303f) ||
        (code >= 0x3100 && code <= 0x312f) ||
        (code >= 0x3400 && code <= 0x4dbf) ||
        (code >= 0x4e00 && code <= 0x9fff) ||
        (code >= 0xfe30 && code <= 0xfe4f) ||
        (code >= 0xff00 && code <= 0xffef)
      );
    })
    .sort()
    .join("");
}

const isCjk = (character) => {
  const code = character.codePointAt(0);
  return (
    (code >= 0x3400 && code <= 0x4dbf) || (code >= 0x4e00 && code <= 0x9fff)
  );
};

const FONTS = [
  {
    // 標題。單一字型同時涵蓋中英文，不另外搭配拉丁顯示字體（理由見上）。
    source: "NotoSerifTC-Regular.otf",
    output: "noto-serif-tc-subset.woff2",
    scope: "all"
  },
  {
    // 內文拉丁。中文內文會有使用者輸入，交給系統黑體，不在這裡 subset。
    source: "Inter.ttf",
    output: "inter-subset.woff2",
    scope: "latin"
  }
];

export async function buildFonts() {
  if (!existsSync(SOURCE)) {
    throw new Error(
      `找不到 ${SOURCE}。原始字型檔不進 repo，取得方式見 tools/fonts/README.md。`
    );
  }

  const allCharacters = collectCharacters();
  const latinCharacters = [...allCharacters].filter((c) => !isCjk(c)).join("");
  const cjkCount = [...allCharacters].filter(isCjk).length;

  mkdirSync(OUTPUT, { recursive: true });

  const results = [];
  for (const font of FONTS) {
    const sourcePath = resolve(SOURCE, font.source);
    if (!existsSync(sourcePath)) {
      throw new Error(
        `缺少原始字型 ${font.source}。取得方式見 tools/fonts/README.md。`
      );
    }

    const text = font.scope === "latin" ? latinCharacters : allCharacters;
    const buffer = await subsetFont(readFileSync(sourcePath), text, {
      targetFormat: "woff2"
    });

    writeFileSync(resolve(OUTPUT, font.output), buffer);
    results.push({
      output: font.output,
      bytes: buffer.length,
      sourceBytes: readFileSync(sourcePath).length,
      characters: [...text].length
    });
  }

  return { results, totalCharacters: [...allCharacters].length, cjkCount };
}

const isDirectRun =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectRun) {
  const { results, totalCharacters, cjkCount } = await buildFonts();
  const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

  console.log(`收集到 ${totalCharacters} 個字元（其中漢字 ${cjkCount} 個）\n`);
  let total = 0;
  for (const result of results) {
    total += result.bytes;
    const ratio = ((result.bytes / result.sourceBytes) * 100).toFixed(1);
    console.log(
      `  ${result.output.padEnd(34)} ${kb(result.bytes).padStart(8)}  ` +
        `（原檔 ${kb(result.sourceBytes)}，${ratio}%，${result.characters} 字元）`
    );
  }
  console.log(`\n合計 ${kb(total)} → apps/web/public/fonts/`);
}
