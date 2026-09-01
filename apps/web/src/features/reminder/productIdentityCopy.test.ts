import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * `PRODUCT_IDENTITY_UNKNOWN` 的文案不可以把「標示未確認」講成沒有倒數的原因。
 *
 * 2026-08-30 的規則改動把 `identity_unconfirmed` 從「擋住一般期限」改成
 * 「用 120 分鐘保守預設」（reducer.ts 的 `GENERAL_DEADLINE_BLOCKERS`）——
 * 產品標示只會讓間隔變短，沒有標示時的值本來就是 120，擋住並沒有比較
 * 保守、只是什麼都不給。
 *
 * 但 `reminderPresentation.ts` 的文案沒有跟著改，一直寫著「暫時無法建立
 * 補擦倒數」。**那段目前不會顯示**，所以不是活躍 bug——它是個陷阱：哪天
 * 走到了就會對使用者說一句與系統實際行為相反的話。
 *
 * 這條測試比對原始碼字串而不是掛載元件，因為要守的就是那句話本身。
 *
 * vitest 的 cwd 是 repo 根目錄。
 */

const PRESENTATION = readFileSync(
  "apps/web/src/features/reminder/reminderPresentation.ts",
  "utf8"
);

const REDUCER = readFileSync("packages/domain/src/reducer.ts", "utf8");

/** 掃描前先剝註解——理由見 CLAUDE.md「守門測試：坑一」。 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("PRODUCT_IDENTITY_UNKNOWN 的文案", () => {
  /*
   * 兩件事分開守：一是那句錯的話不見了，二是它被換成了真的話。只守前者
   * 的話，整段刪掉也會過——而那會讓「補上標示」這個入口一起消失。
   */
  it("不再宣稱標示未確認會讓補擦倒數無法建立", () => {
    const source = stripComments(PRESENTATION);

    expect(source).not.toContain("暫時無法建立補擦倒數");
    expect(source).not.toContain("無法計算可信時間");
  });

  it("改成講補上標示之後會發生什麼", () => {
    const source = stripComments(PRESENTATION);

    expect(source).toContain("補上包裝標示後，這個部位的補擦間隔會改依標示計算。");
    // 「補上標示」的入口必須留著。
    expect(source).toContain('secondary("update_protection_record")');
  });

  /*
   * 這條守的是**前提本身**：只要 identity_unconfirmed 還不在封鎖清單裡，
   * 上面那兩條就必須成立。哪天規則改回去（真的擋住倒數了），這裡會紅，
   * 提醒回來把文案一起改回來——而不是讓兩邊再次悄悄不一致。
   */
  it("reducer 仍然不把 identity_unconfirmed 當成封鎖條件", () => {
    const blockers = /const GENERAL_DEADLINE_BLOCKERS[\s\S]*?\]\);/.exec(
      REDUCER
    )?.[0];

    expect(blockers, "找不到 GENERAL_DEADLINE_BLOCKERS").toBeDefined();
    expect(blockers).not.toContain("identity_unconfirmed");
  });
});
