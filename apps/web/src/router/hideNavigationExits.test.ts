import { readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * **每個藏起下排導覽的路由都必須自己提供出口。**
 *
 * 2026-09-04 的頁面健檢發現 `/education` 是十個 `hideNavigation: true` 的
 * 路由裡唯一沒有頂端出口的——藏了導覽又沒有返回，畫面上唯一的出路是品牌
 * logo，而那會回到 `/`，不是使用者來的 `/more`。它的兩個子頁 2026-09-03
 * 就補上箭頭了，首頁是當時漏掉的。
 *
 * **既有的 `pageExitIcons.test.ts` 抓不到這種漏。** 那條守的是「出口該長
 * 什麼樣」——叉叉還是箭頭、有沒有登記進白名單。它只檢查**已經有出口圖示**
 * 的檔案，所以一個「該有卻完全沒有」的頁面對它是隱形的：不在白名單、也沒有
 * 圖示可以被掃到，四條測試全綠。
 *
 * 這條補的是另一個方向：**先問哪些頁面必須有出口**（從路由表的
 * `hideNavigation` 推導，不是人工維護的名單），再問它們有沒有。名單自動
 * 跟著路由表長，新增一個藏導覽的頁面就會被要求給出口。
 */

const ROUTER = "apps/web/src/router/index.ts";

/** 掃原始碼前先剝註解——理由見 CLAUDE.md「守門測試：坑一」。 */
const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const EXIT_ICON = /icon="tool-(?:close|arrow-left)"/;

/** 路由表裡 `hideNavigation: true` 的每一筆，連同它的頁面元件路徑。 */
function hideNavigationRoutes(): { path: string; component: string }[] {
  const source = strip(readFileSync(ROUTER, "utf8"));
  const found: { path: string; component: string }[] = [];

  const blocks = source.matchAll(
    /path:\s*"([^"]+)"[\s\S]*?component:\s*\(\)\s*=>\s*import\("([^"]+)"\)([\s\S]*?)(?=\n\s*\{\s*\n\s*path:|\n\s*\]\s*\n)/g
  );

  for (const [, path, importPath, tail] of blocks) {
    // meta 在 component 後面；只看到下一筆路由開始為止。
    const meta = tail!.slice(0, tail!.indexOf("},") + 2);
    if (!meta.includes("hideNavigation: true")) continue;
    found.push({
      path: path!,
      component: normalize(join(dirname(ROUTER), importPath!)).split("\\").join("/")
    });
  }
  return found;
}

/**
 * 出口可能不在頁面元件本身，而在它 import 的殼層裡——`/setup` 的出口就畫在
 * `SetupStepShell.vue` 上。所以往下追一層 import。
 *
 * 只追一層是刻意的：再深下去就會把「頁面深處某個對話框的叉叉」也算成頁面
 * 出口，那正是這條測試要防的誤判。
 */
function hasExit(componentPath: string): boolean {
  const source = strip(readFileSync(componentPath, "utf8"));
  if (EXIT_ICON.test(source)) return true;

  for (const [, relative] of source.matchAll(
    /import\s+\w+\s+from\s+"(\.[^"]+\.vue)"/g
  )) {
    const child = normalize(join(dirname(componentPath), relative!))
      .split("\\")
      .join("/");
    try {
      if (EXIT_ICON.test(strip(readFileSync(child, "utf8")))) return true;
    } catch {
      // 解析不到的 import 直接略過，不讓路徑問題偽裝成「有出口」。
    }
  }
  return false;
}

describe("藏起下排導覽的頁面都要有自己的出口", () => {
  const routes = hideNavigationRoutes();

  /* 名單是從路由表推導的——推導壞掉時要紅，不能安靜地變成零筆全過。 */
  it("路由表解析得出 hideNavigation 的路由", () => {
    expect(routes.length).toBeGreaterThanOrEqual(10);
    expect(routes.map((route) => route.path)).toContain("/education");
  });

  it.each(routes.map((route) => [route.path, route.component]))(
    "%s 有頂端出口",
    (_path, component) => {
      expect(hasExit(component as string)).toBe(true);
    }
  );
});
