import type { SessionEventStreamV1 } from "@sunshield/contracts";
import { describe, expect, it } from "vitest";
import {
  currentSessionContext,
  hasOpenWaterInterval,
  showsWaterActivityEntry
} from "./waterActivityEntry";

/**
 * 使用者回報：「選水上活動以外的也會出現水上活動（下水／離水）」。
 *
 * 裁決：情境是水上活動、或已經有進行中的水中區間時才顯示。
 */

function stream(
  initialContext: string,
  contextEvents: unknown[] = []
): SessionEventStreamV1 {
  return {
    sessionStarted: { initialContext },
    contextEvents
  } as unknown as SessionEventStreamV1;
}

const waterStart = (id: string) => ({
  contextType: "water_start",
  activityIntervalId: id
});
const waterEnd = (id: string) => ({
  contextType: "water_end",
  activityIntervalId: id
});

describe("currentSessionContext", () => {
  it("沒有變更過就用起始情境", () => {
    expect(currentSessionContext(stream("outdoor_general"))).toBe(
      "outdoor_general"
    );
  });

  /* `context_changed` 會覆蓋起始值，取最後一次。 */
  it("取最後一次情境變更", () => {
    const result = currentSessionContext(
      stream("outdoor_general", [
        { contextType: "context_changed", context: "indoor" },
        { contextType: "context_changed", context: "water_active" }
      ])
    );

    expect(result).toBe("water_active");
  });

  it("沒有 sessionStarted 時是 null", () => {
    expect(currentSessionContext(null)).toBeNull();
  });
});

describe("hasOpenWaterInterval", () => {
  it("有下水沒離水就是開著", () => {
    expect(
      hasOpenWaterInterval(stream("outdoor_general", [waterStart("iv-1")]))
    ).toBe(true);
  });

  it("配對到離水就不算開著", () => {
    expect(
      hasOpenWaterInterval(
        stream("outdoor_general", [waterStart("iv-1"), waterEnd("iv-1")])
      )
    ).toBe(false);
  });

  /*
   * 用 `activityIntervalId` 配對而不是數個數：更正事件可能讓順序不是嚴格的
   * 一進一出。這裡的離水對到的是另一段區間，第一段仍然開著。
   */
  it("離水對不上的區間仍然算開著", () => {
    expect(
      hasOpenWaterInterval(
        stream("outdoor_general", [waterStart("iv-1"), waterEnd("iv-2")])
      )
    ).toBe(true);
  });
});

describe("showsWaterActivityEntry", () => {
  it.each(["water_preparing", "water_active"])("%s 顯示", (context) => {
    expect(showsWaterActivityEntry(stream(context))).toBe(true);
  });

  /* 使用者回報的那個情況：一般戶外不該看到。 */
  it.each(["outdoor_general", "outdoor_sport", "indoor"])(
    "%s 不顯示",
    (context) => {
      expect(showsWaterActivityEntry(stream(context))).toBe(false);
    }
  );

  /*
   * **反向：區間開著就一定要顯示，不管情境是什麼。**
   *
   * 這是離水的唯一保障——只守情境的話，臨時去玩水的人記完下水之後就再也
   * 關不掉那段區間。
   */
  it("情境不是水上，但區間開著仍然顯示", () => {
    expect(
      showsWaterActivityEntry(
        stream("outdoor_general", [waterStart("iv-1")])
      )
    ).toBe(true);
  });

  it("區間關掉之後就不再顯示", () => {
    expect(
      showsWaterActivityEntry(
        stream("outdoor_general", [waterStart("iv-1"), waterEnd("iv-1")])
      )
    ).toBe(false);
  });

  it("還沒有事件流時不顯示", () => {
    expect(showsWaterActivityEntry(null)).toBe(false);
  });
});
