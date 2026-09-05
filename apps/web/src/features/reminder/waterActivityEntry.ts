import type {
  SessionContext,
  SessionEventStreamV1
} from "@sunshield/contracts";

/**
 * 首頁要不要顯示「水上活動」入口。
 *
 * **2026-09-03（使用者回報）：一般戶外／通勤的提醒也一直看得到這個連結。**
 *
 * 那是階段三搬過來時的行為，也是搬過來之前就有的——舊的「記錄狀況」選單
 * 同樣不分情境一律提供「游泳／下水」（`createContextEventController` 從來
 * 沒有讀過 `initialContext`）。理由站得住：選了「一般戶外」的人隨時可能
 * 跳進泳池。
 *
 * 但把它放上首頁之後，通勤的人每次打開 App 都會看到一個永遠用不到的連結。
 * 使用者裁決：**情境是水上活動、或已經有進行中的水中區間時才顯示。**
 *
 * ## 為什麼兩個條件都要
 *
 * 第二個條件是**離水的唯一保障**。情境不是水上活動、但使用者曾經記過一次
 * 下水時（例如臨時去玩水，那時連結還看得到嗎？看不到——這是這個裁決的
 * 已知取捨），區間會一直開著；只要區間開著，入口就必須在，否則關不掉。
 *
 * ## 為什麼從事件流算，不從投影算
 *
 * 兩個東西投影裡都沒有：
 *
 * - **情境**：`SessionProjection` 沒有這個欄位（`GearSharePage` 也是從事件流
 *   取的）
 * - **進行中的水中區間**：預設路徑（沒填包裝標示）的 eligibility 是
 *   `identity_unconfirmed`，reducer 的水上區間分支要求 `eligible`，所以
 *   投影裡完全沒有那段區間的痕跡（2026-09-03 實測，見階段三的落地）
 */

const WATER_CONTEXTS: readonly SessionContext[] = [
  "water_preparing",
  "water_active"
];

/** 目前情境：`sessionStarted` 的起始值，被後續的 `context_changed` 覆蓋。 */
export function currentSessionContext(
  stream: SessionEventStreamV1 | null
): SessionContext | null {
  if (stream?.sessionStarted == null) return null;
  const changes = (stream.contextEvents ?? []).filter(
    (event) => event.contextType === "context_changed"
  );
  const latest = changes.at(-1);
  return latest !== undefined && "context" in latest
    ? latest.context
    : stream.sessionStarted.initialContext;
}

/**
 * 有沒有還沒關閉的水中區間。
 *
 * 用 `activityIntervalId` 配對，不是數個數：更正事件可能讓順序不是嚴格的
 * 一進一出。
 */
export function hasOpenWaterInterval(
  stream: SessionEventStreamV1 | null
): boolean {
  /*
   * `contextEvents` 也要防一手：事件流是非同步載入的，首頁在 `ensureLoaded`
   * 回來之前拿到的可能是還沒成形的值。這裡回 false 就好——那時本來也還
   * 不知道有沒有區間。
   */
  const events = stream?.contextEvents ?? [];
  const ended = new Set<string>();
  for (const event of events) {
    if (event.contextType === "water_end") ended.add(event.activityIntervalId);
  }
  return events.some(
    (event) =>
      event.contextType === "water_start" &&
      !ended.has(event.activityIntervalId)
  );
}

export function showsWaterActivityEntry(
  stream: SessionEventStreamV1 | null
): boolean {
  const context = currentSessionContext(stream);
  if (context !== null && WATER_CONTEXTS.includes(context)) return true;
  return hasOpenWaterInterval(stream);
}
