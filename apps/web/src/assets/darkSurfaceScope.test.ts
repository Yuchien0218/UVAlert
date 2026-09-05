import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 深色表面的使用範圍（`DESIGN.md` 第二節〈深色表面的使用範圍〉，2026-09-03）。
 *
 * 深色表面是這套配色裡最強的一種強調——象牙底上突然出現一塊濃縮咖啡。
 * 強調用在每一塊上就等於沒有強調，所以判準是**「這一塊是不是要被單獨看的
 * 主角」**，不是「這一塊重不重要」。
 *
 * 可以用：即時核心看板、分享圖的主角卡。
 * 不可以用：一般設定頁、表單、清單、內容容器。
 *
 * **為什麼用白名單而不是自動推導。** 「這一塊是不是主角」是語意，從檔名或
 * 路徑猜不出來。白名單的代價是新落點要手動登記——那正是重點：**要把一塊
 * 東西塗成深色，必須先過這條規則**，而不是隨手抄上一個元件的底色。
 *
 * 稽核來源：`docs/decisions/2026-09-02-ui-layout-consistency-audit.md` §2
 * 「深色卡原本在首頁被移除，但在裝備分享頁又出現，使用範圍缺少系統化約束」。
 */

const SOURCE_ROOT = "apps/web/src";

/** 深色表面的三個色票，以及對外的語意別名。 */
const DARK_SURFACE_TOKENS = [
  "--surface-inverse",
  "--color-surface-dark",
  "--color-surface-dark-elevated",
  "--color-surface-dark-soft"
];

/**
 * 允許使用深色表面的檔案，以及**為什麼**它是主角。
 *
 * 加一列進來之前先回答那個問題；答不出來就不該用深色。
 */
const ALLOWED: Record<string, string> = {
  "components/product/GearShareCard.vue":
    "分享圖的主角卡——唯一會被截圖傳出去的那一塊",
  "features/share/paintShareCard.ts":
    "把同一張主角卡畫進 canvas，顏色必須與 GearShareCard 一致"
};

function discover(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return discover(path);
    return /\.(?:vue|css|ts)$/.test(entry.name) ? [path] : [];
  });
}

/*
 * 掃描前剝註解——否則這個檔案自己、以及任何解釋「不要用深色」的註解都會被
 * 判成違規，等於禁止在程式碼裡寫明規則（CLAUDE.md 坑一，這個 repo 踩過）。
 */
const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * 兩種用法都算，而且都比對**完整**的 token 字串，不是名字片段
 * （CLAUDE.md 坑二：`toContain("--surface-inverse")` 會被
 * `--surface-inverse-REMOVED` 滿足）。
 *
 * - CSS 裡的 `var(--token)`
 * - TypeScript 裡的 `"--token"`——分享圖是畫進 canvas 的，顏色靠字串取值，
 *   只掃 `var()` 的話那條路徑完全看不到
 */
function usesDarkSurface(source: string): boolean {
  return DARK_SURFACE_TOKENS.some(
    (token) => source.includes(`var(${token})`) || source.includes(`"${token}"`)
  );
}

describe("深色表面只出現在白名單裡", () => {
  const files = discover(SOURCE_ROOT).filter(
    (path) => !path.endsWith(".test.ts")
  );

  it("掃描範圍不是空的", () => {
    // 沒有這一條的話，discover 壞掉時整組守門會靜悄悄地全綠。
    expect(files.length).toBeGreaterThan(100);
  });

  it("沒有未登記的深色表面", () => {
    const offenders = files.filter((path) => {
      const relative = path.slice(SOURCE_ROOT.length + 1).replace(/\\/g, "/");
      if (relative in ALLOWED) return false;
      // token 的定義處本來就會提到它們。
      if (relative === "assets/app.css") return false;
      return usesDarkSurface(strip(readFileSync(path, "utf8")));
    });

    expect(offenders, "未登記的深色表面：先讀 DESIGN.md 第二節").toEqual([]);
  });

  /*
   * 反向：白名單不能寫了卻沒人用。
   *
   * 只守前一條的話，把 `ALLOWED` 加滿整個 src 也是綠的——那時守的是空氣。
   */
  it("白名單裡的每一列都真的在用深色表面", () => {
    for (const relative of Object.keys(ALLOWED)) {
      const source = strip(
        readFileSync(join(SOURCE_ROOT, relative), "utf8")
      );

      expect(usesDarkSurface(source), `${relative} 已經不用深色了`).toBe(true);
    }
  });

  /* 每一列都要寫明為什麼它是主角，不能只登記路徑。 */
  it("白名單每一列都寫了理由", () => {
    for (const [relative, reason] of Object.entries(ALLOWED)) {
      expect(reason.length, `${relative} 沒寫理由`).toBeGreaterThan(8);
    }
  });
});

describe("DESIGN.md 記著這條規則", () => {
  const DESIGN = strip(readFileSync("DESIGN.md", "utf8"));

  it("第二節有〈深色表面的使用範圍〉", () => {
    expect(DESIGN).toContain("#### 深色表面的使用範圍");
  });

  /*
   * 規則的兩半分開守：只寫「可以用在哪」而沒寫「禁止用在哪」的話，
   * 稽核指出的那個斷層（設定／表單頁隨手用深色）還是擋不住。
   */
  it("同時寫了可以用與不可以用", () => {
    expect(DESIGN).toContain("**可以用**");
    expect(DESIGN).toContain("**不可以用**");
  });
});
