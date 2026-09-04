import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 「重試」只有兩種說法（2026-09-04 文案盤點）。
 *
 * 盤點時同一個動作有三種寫法散在 16 個地方：「可以再試一次」9 次、
 * 「請再試一次」4 次、「請稍後再試」3 次。三種講法對使用者是同一件事，
 * 但讀起來像三種不同的嚴重程度。
 *
 * 收斂成兩種——**因為這兩種語意真的不同**：
 *
 *   可以再試一次 → 現在就能重試（本機操作失敗，狀態沒有改變）
 *   請稍後再試   → 要等（連線、伺服器、讀取中）
 *
 * 「請再試一次」是這兩者之間沒有意義的第三種，全部併掉。
 */

const SRC = "apps/web/src";

/** 掃原始碼前先剝註解——理由見 CLAUDE.md「守門測試：坑一」。 */
const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry !== "generated") sourceFiles(path, out);
    } else if (
      /\.(?:vue|ts)$/.test(entry) &&
      !entry.includes(".test.") &&
      !entry.includes("education-content")
    ) {
      out.push(path);
    }
  }
  return out;
}

const files = sourceFiles(SRC);

describe("重試說法只有兩種", () => {
  it("有掃到檔案（避免走訪壞掉時靜默通過）", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  /*
   * 比對完整的四個字，不是「再試」——後者會把「可以再試一次」也算進去，
   * 這條測試就永遠紅（CLAUDE.md 坑二的反面：範圍抓太寬）。
   */
  it("沒有第三種說法「請再試一次」", () => {
    const offenders = files.filter((path) =>
      strip(readFileSync(path, "utf8")).includes("請再試一次")
    );

    expect(
      offenders.map((path) => path.split("\\").join("/")),
      "「請再試一次」請改成「可以再試一次」（現在就能重試）或「請稍後再試」（要等）"
    ).toEqual([]);
  });

  /*
   * 兩種都還在用——否則「全部改成同一種」也會過上面那條，而那會弄丟
   * 「現在能重試」與「要等」的區別。
   */
  it("兩種說法都仍在使用", () => {
    const all = files.map((path) => strip(readFileSync(path, "utf8")));

    expect(all.some((code) => code.includes("可以再試一次"))).toBe(true);
    expect(all.some((code) => code.includes("請稍後再試"))).toBe(true);
  });
});
