import { describe, expect, it } from "vitest";
import {
  APPLICATION_MAX_MINUTES_AGO,
  describeTooLongAgo,
  minutesAgo,
  WATER_START_MAX_MINUTES_AGO
} from "./timeEntryCaps";

/**
 * 2026-08-31 使用者裁決的兩個上限。
 *
 * **這兩個數字不是輸入便利，是產品失效的實際邊界**，所以它們的值本身要被
 * 守住——有人「順手」把 80 調成 90 的話，畫面不會壞、測試若只驗「有提示」
 * 也不會紅，但規則已經跟耐水標示的級距脫節了。
 */
describe("時間輸入上限", () => {
  it("塗抹時間對齊沒有標示時的保守補擦間隔（120 分鐘）", () => {
    expect(APPLICATION_MAX_MINUTES_AGO).toBe(120);
  });

  it("入水時間對齊耐水標示的最大級距（80 分鐘）", () => {
    expect(WATER_START_MAX_MINUTES_AGO).toBe(80);
  });
});

describe("minutesAgo", () => {
  it("回傳距離現在的分鐘數", () => {
    const now = new Date("2026-08-31T12:00:00.000Z");
    const at = new Date("2026-08-31T10:30:00.000Z");

    expect(minutesAgo(at, now)).toBe(90);
  });
});

describe("describeTooLongAgo", () => {
  /*
   * 邊界值本身**不算超過**。差一分鐘的判斷若寫成 `<`，剛好等於上限的
   * 選擇會被誤判成失效——那是使用者最可能挑的值（例如「兩小時前擦的」）。
   */
  it("剛好等於上限時不提示", () => {
    expect(describeTooLongAgo(120, 120, "application")).toBeNull();
    expect(describeTooLongAgo(80, 80, "water_start")).toBeNull();
  });

  it("超過一分鐘就提示", () => {
    expect(describeTooLongAgo(121, 120, "application")).not.toBeNull();
    expect(describeTooLongAgo(81, 80, "water_start")).not.toBeNull();
  });

  /*
   * 兩種文案要真的不一樣：塗抹是「重新塗抹再開始計時」，入水是「先補擦
   * 再繼續」。只斷言「有提示」的話，把兩者寫成同一句也會全綠，而它們的
   * 下一步其實不同。
   */
  it("塗抹時間的建議是重新塗抹", () => {
    const message = describeTooLongAgo(200, 120, "application");

    expect(message).toContain("2 小時");
    expect(message).toContain("重新塗抹");
  });

  it("入水時間的建議是先補擦，並說明耐水已失效", () => {
    const message = describeTooLongAgo(200, 80, "water_start");

    expect(message).toContain("80 分鐘");
    expect(message).toContain("耐水");
    expect(message).toContain("補擦");
  });

  /* 全站一致用「你」不用「您」（2026-08-23 copy fixes §2.3）。 */
  it("不使用「您」", () => {
    for (const kind of ["application", "water_start"] as const) {
      expect(describeTooLongAgo(999, 60, kind)).not.toContain("您");
    }
  });
});
