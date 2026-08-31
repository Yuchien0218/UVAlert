import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 縣市輪廓產出物的守門（2026-08-31）。
 *
 * 這份 JSON 是由 13.5MB 的官方鄉鎮界線降精度而來，會進 bundle，所以三件事
 * 都要守：**一個縣市都不能少**、體積不能失控、來源與授權要跟著走。
 */

const outlines = JSON.parse(
  readFileSync("apps/web/src/generated/county-outlines.generated.json", "utf8")
) as {
  schemaVersion: string;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  counties: { countyCode: string; countyName: string; rings: number[][][] }[];
  source: { provider: string; license: string; boundaryDataVersion: string };
};

const regionIndex = JSON.parse(
  readFileSync("apps/web/src/generated/region-index.generated.json", "utf8")
) as { countyCode: string; countyName: string }[];

describe("county-outlines.generated.json", () => {
  /*
   * **第一版真的漏掉了連江縣。** 面積過濾原本是全域一刀切，馬祖的島全部
   * 小於門檻就整個消失了。一張少了一個縣市的地圖不是「簡化」，是錯的，
   * 而且那是使用者最可能發現的錯誤。
   *
   * 所以這條比對的是行政區索引裡**實際存在**的縣市集合，不是寫死 22——
   * 寫死的話，來源資料若增減縣市，這裡不會提醒任何人。
   */
  it("涵蓋行政區索引裡的每一個縣市，一個都不少", () => {
    const expected = [...new Set(regionIndex.map((row) => row.countyCode))].sort();
    const actual = outlines.counties.map((county) => county.countyCode).sort();

    expect(actual).toEqual(expected);
  });

  it("每個縣市至少有一個畫得出面積的環", () => {
    for (const county of outlines.counties) {
      expect(county.rings.length, county.countyName).toBeGreaterThan(0);
      for (const ring of county.rings) {
        expect(ring.length, county.countyName).toBeGreaterThanOrEqual(4);
      }
    }
  });

  /*
   * 體積上限：這份會進 bundle。原始來源 13.5MB，簡化後目前約 70KB；
   * 150KB 留了一倍餘裕，但擋得住「調鬆容差」造成的失控。
   */
  it("體積控制在 150KB 以內", () => {
    const bytes = Buffer.byteLength(JSON.stringify(outlines));

    expect(bytes).toBeLessThan(150 * 1024);
  });

  /*
   * 範圍要涵蓋離島。只檢查主島的話，把金門（東經 118.3）或連江（北緯
   * 26.1）弄丟仍然會綠。
   */
  it("經緯度範圍涵蓋本島與離島", () => {
    expect(outlines.bounds.minX).toBeLessThan(118.5); // 金門
    expect(outlines.bounds.maxY).toBeGreaterThan(26); // 連江
    expect(outlines.bounds.maxX).toBeGreaterThan(121.9); // 台東／花蓮東岸
    expect(outlines.bounds.minY).toBeLessThan(22); // 屏東南端
  });

  /*
   * 授權必須跟著資料走——這是政府資料開放授權條款的內容，衍生物一樣受
   * 拘束。掉了它就等於一份沒有出處的地理資料。
   */
  it("保留來源與授權", () => {
    expect(outlines.source.provider).toContain("國土測繪中心");
    expect(outlines.source.license).toContain("政府資料開放授權條款");
    expect(outlines.source.boundaryDataVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
