import type { UvRiskLevel } from "@sunshield/contracts";

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
    startHour = 5,
    endHour = 19,
    stepMinutes = 15,
    exponent = 1.2
  } = options;

  const rawUvAt = (t: Date): number => {
    const elevDeg = calculateSolarElevationDeg(t, latitude, longitude, timezoneOffsetHours);
    if (elevDeg <= 0) return 0;
    const elevRad = elevDeg * (Math.PI / 180);
    return Math.pow(Math.sin(elevRad), exponent);
  };

  // 1. 先計算全日的未縮放理論仰角曲線，並尋找峰值
  const startMinutes = Math.round(startHour * 60);
  const endMinutes = Math.round(endHour * 60);
  let rawPeak = 0;
  let rawPeakMinute = 12 * 60;

  const rawPoints: { minute: number; rawUv: number }[] = [];
  for (let m = startMinutes; m <= endMinutes; m += stepMinutes) {
    const t = new Date(date);
    t.setHours(0, m, 0, 0);
    const rawUv = rawUvAt(t);
    rawPoints.push({ minute: m, rawUv });
    if (rawUv > rawPeak) {
      rawPeak = rawUv;
      rawPeakMinute = m;
    }
  }

  // 2. 依氣象署 officialMaxUv 校正縮放比率
  const scale = rawPeak > 0 ? officialMaxUv / rawPeak : 0;

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

  const uvAtTime = (t: Date): number => {
    const raw = rawUvAt(t);
    return Math.round(raw * scale * 10) / 10;
  };

  // 3. 當前時間狀態
  const nowMinuteOfDay = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const currentHour = nowMinuteOfDay / 60;
  const currentUv = uvAtTime(now);
  const currentRisk = riskLevelForUvi(currentUv);
  const rawProgress = (currentHour - startHour) / (endHour - startHour);
  const currentProgress = Math.max(0, Math.min(1, rawProgress));
  const isDaytime = currentHour >= startHour && currentHour <= endHour && currentUv > 0;

  // 4. 峰值資訊
  const peakHour = rawPeakMinute / 60;
  const peakH = Math.floor(rawPeakMinute / 60);
  const peakM = rawPeakMinute % 60;
  const peakTimeLabel = `${String(peakH).padStart(2, "0")}:${String(peakM).padStart(2, "0")}`;
  const peakUv = Math.round(officialMaxUv * 10) / 10;

  // 5. 尖峰時段判定（頂峰強度區間，取頂峰的 72% 以上，在盛夏約落在 10:00–14:15）
  const peakThreshold = Math.max(3, peakUv * 0.72);
  const peakPoints = points.filter((p) => p.uv >= peakThreshold && peakThreshold > 1);
  let peakWindow: PeakWindow | null = null;
  if (peakPoints.length >= 2 && peakUv >= 3) {
    const first = peakPoints[0]!;
    const last = peakPoints[peakPoints.length - 1]!;
    const isCurrentlyPeak = currentHour >= first.hour && currentHour <= last.hour;
    peakWindow = {
      startLabel: first.timeLabel,
      endLabel: last.timeLabel,
      startHour: first.hour,
      endHour: last.hour,
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
    }
  };
}

/**
 * 將點位轉換為平滑的三次方貝茲曲線路徑字串。
 */
export function pointsToSmoothPath(points: IntradayUvPoint[], scale: ChartScale): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${scale.xScale(points[0]!.hour).toFixed(1)} ${scale.yScale(points[0]!.uv).toFixed(1)}`;
  }

  const coords = points.map((p) => [scale.xScale(p.hour), scale.yScale(p.uv)] as const);
  let d = `M ${coords[0]![0].toFixed(1)},${coords[0]![1].toFixed(1)}`;

  for (let i = 0; i < coords.length - 1; i++) {
    const [x0, y0] = coords[i]!;
    const [x1, y1] = coords[i + 1]!;
    const dx = (x1 - x0) / 2;
    const cp1x = (x0 + dx).toFixed(1);
    const cp1y = y0.toFixed(1);
    const cp2x = (x1 - dx).toFixed(1);
    const cp2y = y1.toFixed(1);
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x1.toFixed(1)},${y1.toFixed(1)}`;
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
