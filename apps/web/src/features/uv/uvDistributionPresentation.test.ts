import type { NationwideUvCounty } from "@sunshield/contracts";
import { describe, expect, it } from "vitest";
import {
  getUviFillPercent,
  getUvRiskClassSuffix,
  getUvRiskPresentation,
  groupNationwideCounties,
  UV_RISK_PRESENTATIONS
} from "./uvDistributionPresentation";

const COUNTIES: NationwideUvCounty[] = [
  "63000",
  "65000",
  "10017",
  "68000",
  "10018",
  "10004",
  "10002",
  "10005",
  "66000",
  "10007",
  "10008",
  "10009",
  "10020",
  "10010",
  "67000",
  "64000",
  "10013",
  "10015",
  "10014",
  "10016",
  "09020",
  "09007"
].map((countyCode, index) => ({
  countyCode,
  displayName: `縣市 ${index + 1}`,
  uvi: index,
  riskLevel: "low"
}));

describe("UV 分布展示規則", () => {
  it("依低到危險級提供 CWA 名稱、區間與 CSS 後綴", () => {
    expect(
      UV_RISK_PRESENTATIONS.map((presentation) => presentation.level)
    ).toEqual(["low", "moderate", "high", "very_high", "extreme"]);
    expect(getUvRiskPresentation("very_high")).toEqual({
      level: "very_high",
      label: "過量級",
      rangeLabel: "8–10",
      classSuffix: "very-high",
      visualToken: "--color-uvi-visual-very-high"
    });
    expect(getUvRiskClassSuffix("extreme")).toBe("extreme");
    expect(getUvRiskPresentation("extreme").rangeLabel).toBe("11+");
  });

  it("以 11 為固定滿格門檻，且無效數字不會畫出色條", () => {
    expect(getUviFillPercent(0)).toBe(0);
    expect(getUviFillPercent(6)).toBeCloseTo(6 / 11);
    expect(getUviFillPercent(11)).toBe(1);
    expect(getUviFillPercent(15)).toBe(1);
    expect(getUviFillPercent(-1)).toBe(0);
    expect(getUviFillPercent(Number.NaN)).toBe(0);
    expect(getUviFillPercent(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("依固定臺灣區域順序分組，且每個輸入縣市只出現一次", () => {
    const groups = groupNationwideCounties([...COUNTIES].reverse());

    expect(groups.map((group) => [group.id, group.label])).toEqual([
      ["north", "北部"],
      ["central", "中部"],
      ["south", "南部"],
      ["east", "東部"],
      ["islands", "外島"]
    ]);
    expect(
      groups.map((group) => group.counties.map((county) => county.countyCode))
    ).toEqual([
      ["63000", "65000", "10017", "68000", "10018", "10004", "10002"],
      ["10005", "66000", "10007", "10008", "10009"],
      ["10020", "10010", "67000", "64000", "10013"],
      ["10015", "10014"],
      ["10016", "09020", "09007"]
    ]);
    expect(groups.flatMap((group) => group.counties)).toHaveLength(
      COUNTIES.length
    );
  });

  it("拒絕沒有歸屬區域的縣市代碼", () => {
    const unknownCounty: NationwideUvCounty = {
      countyCode: "99999",
      displayName: "未知縣市",
      uvi: 0,
      riskLevel: "low"
    };

    expect(() => groupNationwideCounties([unknownCounty])).toThrow("99999");
  });
});
