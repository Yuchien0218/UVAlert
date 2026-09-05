/**
 * 兩個時間輸入的上限，以及超過上限時要說什麼。
 *
 * **這兩個數字不是輸入便利，是產品失效的實際邊界。** 使用者 2026-08-31
 * 分兩次裁決，形狀刻意一致：
 *
 * | 欄位 | 上限 | 邊界是什麼 |
 * | ---- | ---- | ---------- |
 * | 塗抹時間 | 120 分鐘 | 沒有包裝標示時的保守補擦間隔（`packages/domain` 的 `GENERAL_MAX_MINUTES`） |
 * | 入水時間 | 80 分鐘 | 耐水標示的最大級距（`waterResistance` 只有 `40` ／ `80` ／ `no_claim` ／ `unknown`） |
 *
 * 超過上限時**不擋輸入**，改成建議重新塗抹——因為那時真正的下一步就是去
 * 補擦，而不是把一個已經失效的時間記進去。硬擋會讓使用者卡在表單裡填不
 * 出任何系統肯接受的值。
 *
 * 放在 `features/` 而不是 `packages/domain`：domain 不知道 UI 有哪些輸入
 * 欄位，這裡規範的是**表單願意接受什麼**，不是倒數怎麼算。真正的倒數規則
 * 仍然只有 reducer 說了算。
 */

/** 塗抹時間的上限：沒有標示時的保守補擦間隔。 */
export const APPLICATION_MAX_MINUTES_AGO = 120;

/** 入水時間的上限：耐水標示的最大級距。 */
export const WATER_START_MAX_MINUTES_AGO = 80;

/**
 * 距離現在幾分鐘（四捨五入）。未來時間會得到負數，呼叫端自己決定怎麼處理。
 */
export function minutesAgo(at: Date, now: Date): number {
  return Math.round((now.getTime() - at.getTime()) / 60_000);
}

/**
 * 超過上限時的提示；沒超過回傳 null。
 *
 * 文案不用「您」——全站一致用「你」（`2026-08-23-wireframe-copy-fixes.md`
 * §2.3 實測：`apps/web/src/` 之中「您」出現 0 次）。
 */
export function describeTooLongAgo(
  minutes: number,
  maxMinutes: number,
  kind: "application" | "water_start"
): string | null {
  if (minutes <= maxMinutes) return null;

  const hours = maxMinutes / 60;
  const limitLabel =
    Number.isInteger(hours) && hours >= 1
      ? `${hours} 小時`
      : `${maxMinutes} 分鐘`;

  return kind === "application"
    ? `超過 ${limitLabel}，防曬效果已經過了保守間隔——建議重新塗抹再開始計時。`
    : `入水超過 ${limitLabel}，連標示最強的耐水防曬乳都已經失效——建議先補擦再繼續。`;
}
