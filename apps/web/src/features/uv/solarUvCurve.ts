import type { UvRiskLevel } from "@sunshield/contracts";
export type { UvRiskLevel };

/**
 * 依 WHO 紫外線指數標準對應風險等級：
 * 0–2: low (低量)
 * 3–5: moderate (中量)
 * 6–7: high (高量)
 * 8–10: very_high (過量)
 * 11+: extreme (危險)
 */
export function riskLevelForUvi(uvi: number): UvRiskLevel {
  const rounded = Math.round(uvi);
  if (rounded <= 2) return "low";
  if (rounded <= 5) return "moderate";
  if (rounded <= 7) return "high";
  if (rounded <= 10) return "very_high";
  return "extreme";
}

export const UV_RISK_VISUAL_TOKENS: Readonly<Record<UvRiskLevel, string>> = {
  low: "--color-uvi-visual-low",
  moderate: "--color-uvi-visual-moderate",
  high: "--color-uvi-visual-high",
  very_high: "--color-uvi-visual-very-high",
  extreme: "--color-uvi-visual-extreme"
};

/**
 * 依 UV 指數取得對應的風險等級視覺色 Design Token。
 */
export function getUvVisualTokenForUvi(uvi: number): string {
  const risk = riskLevelForUvi(uvi);
  return UV_RISK_VISUAL_TOKENS[risk];
}

/**
 * 臺灣各縣市代表經緯度對照表（用於太陽仰角計算，避免存取或留存使用者真實 GPS）。
 */
export const COUNTY_COORDINATES: Readonly<Record<string, { lat: number; lng: number }>> = {
  // 6 都
  "63000": { lat: 25.037, lng: 121.564 }, // 臺北市
  "65000": { lat: 25.011, lng: 121.465 }, // 新北市
  "68000": { lat: 24.993, lng: 121.301 }, // 桃園市
  "66000": { lat: 24.162, lng: 120.647 }, // 臺中市
  "67000": { lat: 22.997, lng: 120.202 }, // 臺南市
  "64000": { lat: 22.627, lng: 120.301 }, // 高雄市
  // 北部
  "10017": { lat: 25.127, lng: 121.739 }, // 基隆市
  "10018": { lat: 24.813, lng: 120.967 }, // 新竹市
  "10004": { lat: 24.838, lng: 121.017 }, // 新竹縣
  "10002": { lat: 24.757, lng: 121.753 }, // 宜蘭縣
  // 中部
  "10005": { lat: 24.565, lng: 120.821 }, // 苗栗縣
  "10007": { lat: 24.081, lng: 120.538 }, // 彰化縣
  "10008": { lat: 23.916, lng: 120.686 }, // 南投縣
  "10009": { lat: 23.709, lng: 120.431 }, // 雲林縣
  // 南部
  "10020": { lat: 23.481, lng: 120.453 }, // 嘉義市
  "10010": { lat: 23.452, lng: 120.255 }, // 嘉義縣
  "10013": { lat: 22.682, lng: 120.487 }, // 屏東縣
  // 東部
  "10015": { lat: 23.991, lng: 121.611 }, // 花蓮縣
  "10014": { lat: 22.756, lng: 121.144 }, // 臺東縣
  // 離島
  "10016": { lat: 23.565, lng: 119.579 }, // 澎湖縣
  "09020": { lat: 24.432, lng: 118.322 }, // 金門縣
  "09007": { lat: 26.155, lng: 119.939 } // 連江縣
};

/** 臺灣預設地理幾何中心（南投埔里附近） */
export const DEFAULT_TAIWAN_COORDINATES = { lat: 23.97, lng: 120.98 } as const;

/**
 * 依據 regionCode（8碼鄉鎮市區或5碼縣市代碼）取得推算用的代表坐標。
 */
export function resolveCoordinatesForRegion(
  regionCode?: string | null
): { lat: number; lng: number } {
  if (!regionCode || regionCode.length < 5) {
    return DEFAULT_TAIWAN_COORDINATES;
  }
  const countyCode = regionCode.slice(0, 5);
  return COUNTY_COORDINATES[countyCode] ?? DEFAULT_TAIWAN_COORDINATES;
}

/** 一年當中的第幾天 (1–366) */
export function getDayOfYear(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diffMs = date.getTime() - startOfYear.getTime();
  return Math.floor(diffMs / 86_400_000) + 1;
}

/** 太陽赤緯（度，Declination） */
export function solarDeclinationDeg(dayOfYear: number): number {
  const rad = Math.PI / 180;
  return 23.45 * Math.sin(rad * (360 / 365) * (284 + dayOfYear));
}

/** 均時差（分鐘，Equation of Time） */
export function equationOfTimeMinutes(dayOfYear: number): number {
  const rad = Math.PI / 180;
  const b = rad * (360 / 365) * (dayOfYear - 81);
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

/**
 * 計算指定時刻與地理坐標的太陽仰角（度）。
 * 仰角 <= 0 代表太陽處於地平線下（夜晚），UV 視為 0。
 */
export function calculateSolarElevationDeg(
  date: Date,
  latitude: number,
  longitude: number,
  timezoneOffsetHours = 8
): number {
  const rad = Math.PI / 180;
  const dayOfYear = getDayOfYear(date);
  const declDeg = solarDeclinationDeg(dayOfYear);
  const eotMin = equationOfTimeMinutes(dayOfYear);

  const localHours = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  const standardMeridianDeg = timezoneOffsetHours * 15;
  const timeCorrectionMin = 4 * (longitude - standardMeridianDeg) + eotMin;
  const solarTimeHours = localHours + timeCorrectionMin / 60;

  const hourAngleDeg = 15 * (solarTimeHours - 12);

  const sinElev =
    Math.sin(rad * latitude) * Math.sin(rad * declDeg) +
    Math.cos(rad * latitude) * Math.cos(rad * declDeg) * Math.cos(rad * hourAngleDeg);

  const clampedSin = Math.max(-1, Math.min(1, sinElev));
  return Math.asin(clampedSin) / rad;
}

export interface IntradayUvPoint {
  /** 距離當天 00:00 的分鐘數 */
  minuteOfDay: number;
  /** 小時數（例如 11.5 代表 11:30） */
  hour: number;
  /** 格式化時間標籤，如 "11:30" */
  timeLabel: string;
  /** 推估 UV 指數（四捨五入至小數第一位） */
  uv: number;
}

export interface PeakWindow {
  /** 開始時間標籤，例如 "10:15" */
  startLabel: string;
  /** 結束時間標籤，例如 "14:15" */
  endLabel: string;
  /** 開始與結束的小時數 */
  startHour: number;
  endHour: number;
  /** 當前時間是否落在此尖峰區間中 */
  isCurrentlyPeak: boolean;
}

export interface IntradayUvCurveModel {
  /** 取樣點陣列（預設每 15 分鐘一點） */
  points: IntradayUvPoint[];
  /** 繪製時間範圍 [起始小時, 結束小時] */
  hourRange: [number, number];
  /** 當前時間點資訊 */
  current: {
    hour: number;
    uv: number;
    riskLevel: UvRiskLevel;
    /** 當前時間在整體時間軸的進度比例 (0–1) */
    progress: number;
    /** 當前是否為白天（UV > 0 且太陽在視界內） */
    isDaytime: boolean;
  };
  /** 峰值估計 */
  peak: {
    hour: number;
    timeLabel: string;
    uv: number;
  };
  /** 尖峰警戒時段（預估 UV >= 6 或達高量級區間） */
  peakWindow: PeakWindow | null;
  /** 即時計算任意時刻的推估 UV */
  uvAtTime: (targetTime: Date) => number;
}

export interface BuildCurveOptions {
  /** 目標日期（年月日） */
  date: Date;
  /** 當前時間（用於定位現在點） */
  now: Date;
  /** 氣象署發布的當日最大預報 UV */
  officialMaxUv: number;
  /** 緯度（預設南投臺灣幾何中心） */
  latitude?: number;
  /** 經度 */
  longitude?: number;
  /** 時區偏移（臺灣預設 +8） */
  timezoneOffsetHours?: number;
  /** 取樣起始小時（預設 5:00） */
  startHour?: number;
  /** 取樣結束小時（預設 19:00） */
  endHour?: number;
  /** 取樣間隔分鐘數（預設 15 分鐘） */
  stepMinutes?: number;
  /** sin(仰角) 次方指數（預設 1.2） */
  exponent?: number;
}

/**
 * 建立一日紫外線鐘形曲線模型。
 * 完全由外部注入 date 與 now，不直接存取系統時鐘，保證純度與可測性。
 */
export function buildIntradayUvCurve(options: BuildCurveOptions): IntradayUvCurveModel {
  const {
    date,
    now,
    officialMaxUv,
    latitude = DEFAULT_TAIWAN_COORDINATES.lat,
    longitude = DEFAULT_TAIWAN_COORDINATES.lng,
    timezoneOffsetHours = 8,
    startHour = 6,
    endHour = 18,
    stepMinutes = 60,
    exponent = 1.2
  } = options;

  const rawUvAt = (t: Date): number => {
    const elevDeg = calculateSolarElevationDeg(t, latitude, longitude, timezoneOffsetHours);
    if (elevDeg <= 0) return 0;
    const elevRad = elevDeg * (Math.PI / 180);
    return Math.pow(Math.sin(elevRad), exponent);
  };

  // 1. 高精度搜尋全日峰值與尖峰時段（以 5 分鐘為間隔精確計算）
  const startMinutes = Math.round(startHour * 60);
  const endMinutes = Math.round(endHour * 60);
  let rawPeak = 0;
  let rawPeakMinute = 12 * 60;

  for (let m = startMinutes; m <= endMinutes; m += 5) {
    const t = new Date(date);
    t.setHours(0, m, 0, 0);
    const rawUv = rawUvAt(t);
    if (rawUv > rawPeak) {
      rawPeak = rawUv;
      rawPeakMinute = m;
    }
  }

  // 2. 依氣象署 officialMaxUv 校正縮放比率
  const scale = rawPeak > 0 ? officialMaxUv / rawPeak : 0;

  const uvAtTime = (t: Date): number => {
    const raw = rawUvAt(t);
    return Math.round(raw * scale * 10) / 10;
  };

  // 3. 錨點稀疏化：每小時取樣一個關鍵幾何錨點，交給 Catmull-Rom 補弧度，徹底避免密集折線的鋸齒感
  const rawPoints: { minute: number; rawUv: number }[] = [];
  for (let m = startMinutes; m <= endMinutes; m += stepMinutes) {
    const t = new Date(date);
    t.setHours(0, m, 0, 0);
    rawPoints.push({ minute: m, rawUv: rawUvAt(t) });
  }

  // 確保結尾剛好包含 endMinutes
  if (rawPoints[rawPoints.length - 1]!.minute < endMinutes) {
    const t = new Date(date);
    t.setHours(0, endMinutes, 0, 0);
    rawPoints.push({ minute: endMinutes, rawUv: rawUvAt(t) });
  }

  const points: IntradayUvPoint[] = rawPoints.map(({ minute, rawUv }) => {
    const h = Math.floor(minute / 60);
    const m = minute % 60;
    const timeLabel = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const scaledUv = Math.round(rawUv * scale * 10) / 10;
    return {
      minuteOfDay: minute,
      hour: minute / 60,
      timeLabel,
      uv: scaledUv
    };
  });

  // 4. 當前時間狀態
  const nowMinuteOfDay = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const currentHour = nowMinuteOfDay / 60;
  const currentUv = uvAtTime(now);
  const currentRisk = riskLevelForUvi(currentUv);
  const rawProgress = (currentHour - startHour) / (endHour - startHour);
  const currentProgress = Math.max(0, Math.min(1, rawProgress));
  const isDaytime = currentHour >= startHour && currentHour <= endHour && currentUv > 0;

  // 5. 峰值資訊
  const peakHour = rawPeakMinute / 60;
  const peakH = Math.floor(rawPeakMinute / 60);
  const peakM = rawPeakMinute % 60;
  const peakTimeLabel = `${String(peakH).padStart(2, "0")}:${String(peakM).padStart(2, "0")}`;
  const peakUv = Math.round(officialMaxUv * 10) / 10;

  // 6. 尖峰時段判定（頂峰強度區間，取頂峰的 72% 以上）
  const peakThreshold = Math.max(3, peakUv * 0.72);
  let firstPeakMinute = -1;
  let lastPeakMinute = -1;

  if (peakUv >= 3) {
    for (let m = startMinutes; m <= endMinutes; m += 5) {
      const t = new Date(date);
      t.setHours(0, m, 0, 0);
      const val = uvAtTime(t);
      if (val >= peakThreshold) {
        if (firstPeakMinute === -1) firstPeakMinute = m;
        lastPeakMinute = m;
      }
    }
  }

  let peakWindow: PeakWindow | null = null;
  if (firstPeakMinute !== -1 && lastPeakMinute !== -1) {
    const fH = Math.floor(firstPeakMinute / 60);
    const fM = firstPeakMinute % 60;
    const lH = Math.floor(lastPeakMinute / 60);
    const lM = lastPeakMinute % 60;
    const startHourNum = firstPeakMinute / 60;
    const endHourNum = lastPeakMinute / 60;
    const isCurrentlyPeak = currentHour >= startHourNum && currentHour <= endHourNum;

    peakWindow = {
      startLabel: `${String(fH).padStart(2, "0")}:${String(fM).padStart(2, "0")}`,
      endLabel: `${String(lH).padStart(2, "0")}:${String(lM).padStart(2, "0")}`,
      startHour: startHourNum,
      endHour: endHourNum,
      isCurrentlyPeak
    };
  }

  return {
    points,
    hourRange: [startHour, endHour],
    current: {
      hour: currentHour,
      uv: currentUv,
      riskLevel: currentRisk,
      progress: currentProgress,
      isDaytime
    },
    peak: {
      hour: peakHour,
      timeLabel: peakTimeLabel,
      uv: peakUv
    },
    peakWindow,
    uvAtTime
  };
}

export interface ChartScale {
  xScale: (hour: number) => number;
  yScale: (uv: number) => number;
  baselineY: number;
}

export function createChartScale(config: {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
  hourRange: [number, number];
  maxUv: number;
}): ChartScale {
  const { width, height, padding, hourRange, maxUv } = config;
  const [minHour, maxHour] = hourRange;
  const chartLeft = padding.left;
  const chartRight = width - padding.right;
  const chartTop = padding.top;
  const chartBottom = height - padding.bottom;

  // 避免除以 0
  const safeMaxUv = Math.max(1, maxUv);

  return {
    xScale: (hour) => {
      const ratio = (hour - minHour) / (maxHour - minHour);
      return chartLeft + ratio * (chartRight - chartLeft);
    },
    yScale: (uv) => {
      const ratio = uv / safeMaxUv;
      return chartBottom - ratio * (chartBottom - chartTop);
    },
    baselineY: chartBottom
  };
}

/**
 * 將點位以 Catmull-Rom Spline 演算法轉換為真正的圓滑三次方貝茲曲線路徑。
 * 每一段控制點參考前後兩點的切線方向，徹底消除密集直線或相鄰中點造成的波浪鋸齒感。
 */
export function pointsToSmoothPath(points: IntradayUvPoint[], scale: ChartScale): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${scale.xScale(points[0]!.hour).toFixed(1)} ${scale.yScale(points[0]!.uv).toFixed(1)}`;
  }

  const coords = points.map((p) => [scale.xScale(p.hour), scale.yScale(p.uv)] as [number, number]);
  const n = coords.length;
  const baseline = scale.baselineY;

  let d = `M ${coords[0]![0].toFixed(1)},${coords[0]![1].toFixed(1)}`;

  for (let i = 0; i < n - 1; i++) {
    const p0 = i > 0 ? coords[i - 1]! : [2 * coords[0]![0] - coords[1]![0], 2 * coords[0]![1] - coords[1]![1]] as [number, number];
    const p1 = coords[i]!;
    const p2 = coords[i + 1]!;
    const p3 = i < n - 2 ? coords[i + 2]! : [2 * coords[n - 1]![0] - coords[n - 2]![0], 2 * coords[n - 1]![1] - coords[n - 2]![1]] as [number, number];

    // Catmull-Rom to Cubic Bezier control points
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    let cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    let cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    // 若該區間前後均貼地（UV=0），強制平整避免過衝
    if (p1[1] >= baseline - 0.1 && p2[1] >= baseline - 0.1) {
      cp1y = baseline;
      cp2y = baseline;
    } else {
      // 避免向下過衝低於基準線 (UV < 0)
      cp1y = Math.min(cp1y, baseline);
      cp2y = Math.min(cp2y, baseline);
    }

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }

  return d;
}

/**
 * 將點位轉換為閉合的面積路徑（用於漸層填充或裁切）。
 */
export function pointsToAreaPath(
  points: IntradayUvPoint[],
  scale: ChartScale,
  baselineY: number
): string {
  const linePath = pointsToSmoothPath(points, scale);
  if (!linePath || points.length === 0) return "";

  const firstX = scale.xScale(points[0]!.hour).toFixed(1);
  const lastX = scale.xScale(points[points.length - 1]!.hour).toFixed(1);
  const base = baselineY.toFixed(1);

  return `${linePath} L ${lastX},${base} L ${firstX},${base} Z`;
}

export interface YAxisTick {
  uvi: number;
  label: string;
}

function formatUvTickLabel(u: number): string {
  if (u === 0) return "0";
  if (u <= 2) return `${u} 低`;
  if (u <= 5) return `${u} 中`;
  if (u <= 7) return `${u} 高`;
  if (u <= 10) return `${u} 過量`;
  return `${u} 危險`;
}

/**
 * 計算 Y 軸均勻等距刻度（例如 0, 2, 4, 6 或 0, 3, 6, 9），附帶風險等級提示，消除疏密不均。
 */
export function getEquidistantTicks(maxUv: number): { ticks: YAxisTick[]; topUv: number } {
  let step = 2;
  let topUv = 6;

  if (maxUv <= 4) {
    step = 2;
    topUv = 4;
  } else if (maxUv <= 6) {
    step = 2;
    topUv = 6;
  } else if (maxUv <= 9) {
    step = 3;
    topUv = 9;
  } else if (maxUv <= 12) {
    step = 3;
    topUv = 12;
  } else {
    step = 4;
    topUv = 16;
  }

  const ticks: YAxisTick[] = [];
  for (let u = 0; u <= topUv; u += step) {
    ticks.push({
      uvi: u,
      label: formatUvTickLabel(u)
    });
  }

  return { ticks, topUv };
}

export interface HourlyForecastItem {
  hour: number;
  timeLabel: string;
  uv: number;
  riskLevel: UvRiskLevel;
  isPeak: boolean;
  isCurrent: boolean;
}

/**
 * 產生日間逐小時的 UV 明細資料（用於彈窗或時間軸展開檢視）。
 */
export function getHourlyForecastItems(
  curve: IntradayUvCurveModel,
  startHour = 6,
  endHour = 18
): HourlyForecastItem[] {
  const currentHourFloor = Math.floor(curve.current.hour);
  const items: HourlyForecastItem[] = [];

  for (let h = startHour; h <= endHour; h++) {
    const dummyDate = new Date(2026, 0, 1, h, 0, 0);
    const uv = curve.uvAtTime(dummyDate);
    const timeLabel = `${String(h).padStart(2, "0")}:00`;
    const isPeak = curve.peakWindow
      ? h >= Math.floor(curve.peakWindow.startHour) && h <= Math.ceil(curve.peakWindow.endHour)
      : false;

    items.push({
      hour: h,
      timeLabel,
      uv,
      riskLevel: riskLevelForUvi(uv),
      isPeak,
      isCurrent: curve.current.isDaytime && currentHourFloor === h
    });
  }

  return items;
}
