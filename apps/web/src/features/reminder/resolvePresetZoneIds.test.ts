import type { ZoneProjection } from "@sunshield/contracts";
import { describe, expect, it } from "vitest";
import { resolvePresetZoneIds } from "./createContextEventController";

/**
 * 選好事件之後預設勾哪些部位。
 *
 * 2026-08-31 使用者裁決乙：流汗／擦毛巾／明顯摩擦改成沿用上一次的選擇。
 * 原本一律空的，每記錄一次就要重新勾八個部位一遍。
 *
 * S-09 規格的三條（洗手、下水、離水）不動——這裡也各守一條，確認乙沒有
 * 順手改到它們。
 */

function zone(
  zoneInstanceId: string,
  bodyZoneCode: ZoneProjection["bodyZoneCode"] = "face_forehead"
): ZoneProjection {
  return { zoneInstanceId, bodyZoneCode } as ZoneProjection;
}

const ZONES = [
  zone("z-forehead", "face_forehead"),
  zone("z-hands", "hand_backs"),
  zone("z-arms", "arms")
];

function resolve(
  kind: Parameters<typeof resolvePresetZoneIds>[0]["kind"],
  lastZoneIdsByKind: Record<string, string[]> = {},
  openWaterInterval: Parameters<
    typeof resolvePresetZoneIds
  >[0]["openWaterInterval"] = null
) {
  return resolvePresetZoneIds({
    kind,
    selectableZones: ZONES,
    openWaterInterval,
    lastZoneIdsByKind
  });
}

describe("resolvePresetZoneIds", () => {
  /*
   * 三種「自行確認」的事件分開列，不是只測一種——它們走同一條分支，但
   * 只測 heavy_sweat 的話，之後有人只把它特判掉也不會被抓到。
   */
  it.each(["heavy_sweat", "towel", "friction"] as const)(
    "%s 沿用上一次選的部位",
    (kind) => {
      expect(resolve(kind, { [kind]: ["z-forehead", "z-arms"] })).toEqual([
        "z-forehead",
        "z-arms"
      ]);
    }
  );

  it("第一次記錄（沒有歷史）維持空的", () => {
    expect(resolve("heavy_sweat")).toEqual([]);
  });

  /*
   * 上次記錄之後部位可能被停止追蹤或被衣物遮住。留著會送出一個現在無效的
   * zoneInstanceId——那不是「方便」，是壞掉的命令。
   */
  it("過濾掉現在已經不能選的部位", () => {
    expect(
      resolve("heavy_sweat", { heavy_sweat: ["z-forehead", "z-gone"] })
    ).toEqual(["z-forehead"]);
  });

  /* 各事件的歷史互不干擾——流汗選的部位不該變成擦毛巾的預設。 */
  it("不同事件各有各的歷史", () => {
    const history = { heavy_sweat: ["z-forehead"], towel: ["z-arms"] };

    expect(resolve("heavy_sweat", history)).toEqual(["z-forehead"]);
    expect(resolve("towel", history)).toEqual(["z-arms"]);
  });

  // --- S-09 規格的三條，確認乙沒有順手改到 ---

  it("洗手仍然只預選手背，不看歷史", () => {
    expect(resolve("hand_wash", { hand_wash: ["z-forehead"] })).toEqual([
      "z-hands"
    ]);
  });

  it("下水仍然預選全部外露部位，不看歷史", () => {
    expect(resolve("water_start", { water_start: ["z-forehead"] })).toEqual([
      "z-forehead",
      "z-hands",
      "z-arms"
    ]);
  });

  it("離水仍然沿用入水時的集合，不看歷史", () => {
    expect(
      resolve("water_end", { water_end: ["z-forehead"] }, {
        activityIntervalId: "interval-1",
        zoneInstanceIds: ["z-arms"],
        startConfidence: "confirmed",
        activityStartedAt: "2026-08-31T10:00:00.000Z"
      })
    ).toEqual(["z-arms"]);
  });
});
