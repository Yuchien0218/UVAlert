import { describe, expect, it } from "vitest";
import {
  buildIntradayUvCurve,
  calculateSolarElevationDeg,
  createChartScale,
  getDayOfYear,
  getEquidistantTicks,
  getHourlyForecastItems,
  pointsToAreaPath,
  pointsToSmoothPath,
  resolveCoordinatesForRegion,
  solarDeclinationDeg
} from "./solarUvCurve";

describe("solarUvCurve", () => {
  describe("太陽幾何公式", () => {
    it("正確計算一年中的天數", () => {
      expect(getDayOfYear(new Date(2026, 0, 1))).toBe(1);
      expect(getDayOfYear(new Date(2026, 0, 31))).toBe(31);
      expect(getDayOfYear(new Date(2026, 1, 1))).toBe(32);
    });

    it("計算夏至與冬至的赤緯角度", () => {
      // 夏至約 6/21（第 172 天左右），赤緯應接近 +23.45°
      const summerDecl = solarDeclinationDeg(172);
      expect(summerDecl).toBeGreaterThan(23.0);
      expect(summerDecl).toBeLessThanOrEqual(23.5);

      // 冬至約 12/21（第 355 天左右），赤緯應接近 -23.45°
      const winterDecl = solarDeclinationDeg(355);
      expect(winterDecl).toBeLessThan(-23.0);
    });

    it("臺灣正午太陽仰角在夏至極高，夜間為負值", () => {
      // 2026-06-21 12:00（臺北）
      const summerNoon = new Date("2026-06-21T12:00:00+08:00");
      const elevSummerNoon = calculateSolarElevationDeg(summerNoon, 25.04, 121.56);
      expect(elevSummerNoon).toBeGreaterThan(80);

      // 2026-06-21 23:00（夜間）
      const nightTime = new Date("2026-06-21T23:00:00+08:00");
      const elevNight = calculateSolarElevationDeg(nightTime, 25.04, 121.56);
      expect(elevNight).toBeLessThan(0);
    });
  });

  describe("行政區坐標對應", () => {
    it("依鄉鎮代碼取得正確的縣市坐標", () => {
      // 臺北市松山區
      const taipei = resolveCoordinatesForRegion("63000010");
      expect(taipei.lat).toBeCloseTo(25.037, 2);

      // 高雄市三民區
      const kaohsiung = resolveCoordinatesForRegion("64000050");
      expect(kaohsiung.lat).toBeCloseTo(22.627, 2);

      // 缺少或無效代碼時回退至臺灣中心點
      const fallback = resolveCoordinatesForRegion(null);
      expect(fallback.lat).toBe(23.97);
    });
  });

  describe("buildIntradayUvCurve 鐘形模型推算", () => {
    const testDate = new Date("2026-07-15T00:00:00+08:00");

    it("峰值高度準確縮放至官方預報最大值", () => {
      const now = new Date("2026-07-15T10:00:00+08:00");
      const curve = buildIntradayUvCurve({
        date: testDate,
        now,
        officialMaxUv: 9.0,
        latitude: 25.04,
        longitude: 121.56
      });

      expect(curve.peak.uv).toBe(9.0);
      // 峰值時間應在 11:30–12:30 之間
      expect(curve.peak.hour).toBeGreaterThanOrEqual(11.5);
      expect(curve.peak.hour).toBeLessThanOrEqual(12.5);

      // 清晨 05:00 應接近 0
      const morningPoint = curve.points[0]!;
      expect(morningPoint.uv).toBeLessThan(1.0);
    });

    it("識別出 10:00–14:00 前後的高峰警戒區間", () => {
      const now = new Date("2026-07-15T12:00:00+08:00");
      const curve = buildIntradayUvCurve({
        date: testDate,
        now,
        officialMaxUv: 10.0,
        latitude: 25.04,
        longitude: 121.56
      });

      expect(curve.peakWindow).not.toBeNull();
      if (curve.peakWindow) {
        expect(curve.peakWindow.startHour).toBeGreaterThanOrEqual(9.0);
        expect(curve.peakWindow.startHour).toBeLessThanOrEqual(11.0);
        expect(curve.peakWindow.endHour).toBeGreaterThanOrEqual(13.5);
        expect(curve.peakWindow.endHour).toBeLessThanOrEqual(15.5);
        // 12:00 當前處於高峰期
        expect(curve.peakWindow.isCurrentlyPeak).toBe(true);
      }
    });

    it("正確認定夜間狀態", () => {
      const nightNow = new Date("2026-07-15T22:30:00+08:00");
      const curve = buildIntradayUvCurve({
        date: testDate,
        now: nightNow,
        officialMaxUv: 8.0
      });

      expect(curve.current.isDaytime).toBe(false);
      expect(curve.current.uv).toBe(0);
      expect(curve.current.riskLevel).toBe("low");
    });

    it("若當日預報 UV 為 0，安全降級且不報錯", () => {
      const now = new Date("2026-07-15T12:00:00+08:00");
      const curve = buildIntradayUvCurve({
        date: testDate,
        now,
        officialMaxUv: 0
      });

      expect(curve.peak.uv).toBe(0);
      expect(curve.current.uv).toBe(0);
      expect(curve.peakWindow).toBeNull();
      curve.points.forEach((p) => {
        expect(p.uv).toBe(0);
      });
    });
  });

  describe("SVG 路徑繪製生成", () => {
    it("正確產生三次方貝茲曲線路徑與封閉面積路徑", () => {
      const date = new Date("2026-08-01T00:00:00+08:00");
      const now = new Date("2026-08-01T12:00:00+08:00");
      const curve = buildIntradayUvCurve({
        date,
        now,
        officialMaxUv: 8.0
      });

      const scale = createChartScale({
        width: 320,
        height: 160,
        padding: { top: 16, right: 16, bottom: 24, left: 16 },
        hourRange: curve.hourRange,
        maxUv: 11
      });

      const linePath = pointsToSmoothPath(curve.points, scale);
      expect(linePath).toMatch(/^M\s/);
      expect(linePath).toContain("C");

      const areaPath = pointsToAreaPath(curve.points, scale, 136);
      expect(areaPath).toMatch(/^M\s/);
      expect(areaPath).toMatch(/Z$/);
    });
  });

  describe("等距刻度與逐小時明細輔助函數", () => {
    it("正確生成均勻等距的 Y 軸刻度", () => {
      const { ticks: ticksLow, topUv: topLow } = getEquidistantTicks(5);
      expect(topLow).toBe(6);
      expect(ticksLow.map((t) => t.uvi)).toEqual([0, 2, 4, 6]);

      const { ticks: ticksHigh, topUv: topHigh } = getEquidistantTicks(8);
      expect(topHigh).toBe(9);
      expect(ticksHigh.map((t) => t.uvi)).toEqual([0, 3, 6, 9]);

      const { ticks: ticksExtreme, topUv: topExtreme } = getEquidistantTicks(11);
      expect(topExtreme).toBe(12);
      expect(ticksExtreme.map((t) => t.uvi)).toEqual([0, 3, 6, 9, 12]);
    });

    it("正確生成日間逐小時預估清單", () => {
      const date = new Date("2026-08-01T00:00:00+08:00");
      const now = new Date("2026-08-01T12:30:00+08:00");
      const curve = buildIntradayUvCurve({
        date,
        now,
        officialMaxUv: 8.0
      });

      const hourly = getHourlyForecastItems(curve, 6, 18);
      expect(hourly).toHaveLength(13);
      expect(hourly[0]!.timeLabel).toBe("06:00");
      expect(hourly[hourly.length - 1]!.timeLabel).toBe("18:00");

      const noon = hourly.find((h) => h.hour === 12);
      expect(noon).toBeDefined();
      expect(noon!.isCurrent).toBe(true);
      expect(noon!.uv).toBeGreaterThan(5);
    });
  });
});

