<script setup lang="ts">
import { computed } from "vue";
import {
  createChartScale,
  getEquidistantTicks,
  pointsToAreaPath,
  pointsToSmoothPath,
  type IntradayUvCurveModel
} from "../../features/uv/solarUvCurve";

interface Props {
  curve: IntradayUvCurveModel;
  reapplyHours?: number[] | undefined;
  compact?: boolean | undefined;
}

const props = withDefaults(defineProps<Props>(), {
  reapplyHours: () => [],
  compact: false
});

const chartWidth = 340;
const chartHeight = 180;
const padding = { top: 28, right: 20, bottom: 28, left: 30 };

// 採用均勻等距 Y 軸刻度配置（解決刻度疏密不均與缺少 0 基準線問題）
const equidistantConfig = computed(() => getEquidistantTicks(props.curve.peak.uv));

const scale = computed(() =>
  createChartScale({
    width: chartWidth,
    height: chartHeight,
    padding,
    hourRange: props.curve.hourRange,
    maxUv: equidistantConfig.value.topUv
  })
);

const baselineY = chartHeight - padding.bottom;

const linePath = computed(() => pointsToSmoothPath(props.curve.points, scale.value));
const areaPath = computed(() =>
  pointsToAreaPath(props.curve.points, scale.value, baselineY)
);

// 均勻等距水平參考線
const thresholdLines = computed(() =>
  equidistantConfig.value.ticks.map((tick) => ({
    uvi: tick.uvi,
    label: tick.label,
    y: scale.value.yScale(tick.uvi)
  }))
);

// X 軸時間標記（每 3 小時一格：06:00, 09:00, 12:00, 15:00, 18:00）
const timeTicks = computed(() => {
  const [start, end] = props.curve.hourRange;
  const ticks: { hour: number; label: string; x: number }[] = [];
  for (let h = Math.ceil(start / 3) * 3; h <= end; h += 3) {
    ticks.push({
      hour: h,
      label: `${String(h).padStart(2, "0")}:00`,
      x: scale.value.xScale(h)
    });
  }
  return ticks;
});

// 尖峰時段矩形
const peakBox = computed(() => {
  if (!props.curve.peakWindow) return null;
  const x1 = scale.value.xScale(props.curve.peakWindow.startHour);
  const x2 = scale.value.xScale(props.curve.peakWindow.endHour);
  return {
    x: x1,
    y: padding.top - 8,
    width: Math.max(16, x2 - x1),
    height: baselineY - (padding.top - 8),
    startLabel: props.curve.peakWindow.startLabel,
    endLabel: props.curve.peakWindow.endLabel
  };
});

// 當前時間是否落在圖表 X 軸範圍內（05:00–19:00）
const isWithinChartHours = computed(() => {
  const [start, end] = props.curve.hourRange;
  const h = props.curve.current.hour;
  return h >= start && h <= end;
});

// 現在時間位置指示點（全天候只要在日間視窗內皆顯示，避免夜間或清晨無標記的失落感）
const currentPoint = computed(() => {
  if (!isWithinChartHours.value) return null;
  const x = scale.value.xScale(props.curve.current.hour);
  const y = scale.value.yScale(props.curve.current.uv);
  return {
    x,
    y,
    uv: props.curve.current.uv
  };
});

// 補擦紀錄標記
const reapplyMarkers = computed(() =>
  props.reapplyHours.map((hour) => {
    const uv = props.curve.uvAtTime(new Date(2026, 0, 1, Math.floor(hour), (hour % 1) * 60));
    return {
      x: scale.value.xScale(hour),
      y: scale.value.yScale(uv),
      hour
    };
  })
);
</script>

<template>
  <div class="intraday-uv" :class="{ 'intraday-uv--compact': compact }">
    <div class="intraday-uv__chart-wrapper">
      <svg
        :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
        class="intraday-uv__svg"
        role="img"
        aria-label="今日紫外線強度時間曲線圖"
      >
        <defs>
          <linearGradient
            id="intraday-gradient"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.28" />
            <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0.02" />
          </linearGradient>
        </defs>

        <!-- 尖峰警戒區域背景遮罩 -->
        <g v-if="peakBox" class="intraday-uv__peak-zone">
          <rect
            :x="peakBox.x"
            :y="peakBox.y"
            :width="peakBox.width"
            :height="peakBox.height"
            rx="4"
            class="intraday-uv__peak-rect"
          />
          <text
            :x="peakBox.x + peakBox.width / 2"
            :y="peakBox.y - 4"
            class="intraday-uv__peak-label"
            text-anchor="middle"
          >
            尖峰 {{ peakBox.startLabel }}–{{ peakBox.endLabel }}
          </text>
        </g>

        <!-- 等距水平參考線 -->
        <g class="intraday-uv__thresholds">
          <template v-for="line in thresholdLines" :key="line.uvi">
            <line
              :x1="padding.left"
              :y1="line.y"
              :x2="chartWidth - padding.right"
              :y2="line.y"
              class="intraday-uv__threshold-line"
            />
            <text
              :x="padding.left - 6"
              :y="line.y + 3"
              class="intraday-uv__threshold-label"
              text-anchor="end"
            >
              {{ line.label }}
            </text>
          </template>
        </g>

        <!-- X 軸基準線 -->
        <line
          :x1="padding.left"
          :y1="baselineY"
          :x2="chartWidth - padding.right"
          :y2="baselineY"
          class="intraday-uv__axis-line"
        />

        <!-- 曲線面積填充與主線條（Catmull-Rom Spline 光滑曲線） -->
        <path
          v-if="areaPath"
          :d="areaPath"
          fill="url(#intraday-gradient)"
        />
        <path
          v-if="linePath"
          :d="linePath"
          class="intraday-uv__curve-line"
        />

        <!-- 補擦紀錄點 -->
        <template v-for="(marker, idx) in reapplyMarkers" :key="idx">
          <circle
            :cx="marker.x"
            :cy="marker.y"
            r="3.5"
            class="intraday-uv__reapply-dot"
          />
        </template>

        <!-- 當前時間指示線與圓點（全天候提示現在位置） -->
        <g v-if="currentPoint" class="intraday-uv__current">
          <line
            :x1="currentPoint.x"
            :y1="Math.min(currentPoint.y, baselineY)"
            :x2="currentPoint.x"
            :y2="baselineY"
            class="intraday-uv__current-line"
          />
          <circle
            :cx="currentPoint.x"
            :cy="currentPoint.y"
            r="4.5"
            class="intraday-uv__current-dot"
          />
          <text
            :x="currentPoint.x > chartWidth * 0.72 ? currentPoint.x - 8 : currentPoint.x + 8"
            :y="Math.max(padding.top + 6, currentPoint.y - 8)"
            :text-anchor="currentPoint.x > chartWidth * 0.72 ? 'end' : 'start'"
            class="intraday-uv__current-label"
          >
            現在・UV {{ currentPoint.uv }}
          </text>
        </g>

        <!-- 若處於夜間視窗之外，右上角貼心提示 -->
        <g v-else-if="!isWithinChartHours" class="intraday-uv__night-badge">
          <text
            :x="chartWidth - padding.right"
            :y="padding.top - 6"
            text-anchor="end"
            class="intraday-uv__night-text"
          >
            🌙 目前為夜間時段
          </text>
        </g>

        <!-- X 軸時間標記 -->
        <g class="intraday-uv__ticks">
          <template v-for="tick in timeTicks" :key="tick.hour">
            <text
              :x="tick.x"
              :y="baselineY + 16"
              class="intraday-uv__tick-label"
              text-anchor="middle"
            >
              {{ tick.label }}
            </text>
          </template>
        </g>
      </svg>
    </div>

    <!-- 底部資訊：專注於防護行動建議，不再重複圖上的尖峰時段與峰值數字 -->
    <div class="intraday-uv__summary">
      <div v-if="curve.peakWindow" class="intraday-uv__action-advice">
        <span class="intraday-uv__advice-icon" aria-hidden="true">☀️</span>
        <span data-typography-role="body" class="intraday-uv__advice-text">
          尖峰時段紫外線累積快速，戶外活動建議加強遮蔭與防曬裝備。
        </span>
      </div>
      <div v-else class="intraday-uv__action-advice">
        <span class="intraday-uv__advice-icon" aria-hidden="true">🌿</span>
        <span data-typography-role="body" class="intraday-uv__advice-text">
          今日全天紫外線指數溫和，戶外日常活動無需過度防護。
        </span>
      </div>

      <p class="intraday-uv__note" data-typography-role="supporting">
        ※ 晴空強度趨勢示意（依氣象署當日預報最高值校準），實際紫外線指數受即時雲量影響。
      </p>
    </div>
  </div>
</template>

<style scoped>
.intraday-uv {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-surface-soft);
}

.intraday-uv--compact {
  padding: var(--space-3);
  border: none;
  background: transparent;
}

.intraday-uv__chart-wrapper {
  width: 100%;
  overflow: hidden;
}

.intraday-uv__svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.intraday-uv__peak-rect {
  fill: var(--color-soon-soft);
  opacity: 0.65;
}

.intraday-uv__peak-label {
  fill: var(--color-primary-text);
  font-family: var(--font-family-supporting);
  font-size: 10px;
  font-weight: 600;
}

.intraday-uv__threshold-line {
  stroke: var(--border-subtle);
  stroke-width: 1;
  stroke-dasharray: 3 3;
}

.intraday-uv__threshold-label {
  fill: var(--text-secondary);
  font-family: var(--font-family-supporting);
  font-size: 9px;
  user-select: none;
}

.intraday-uv__axis-line {
  stroke: var(--border-subtle);
  stroke-width: 1;
}

.intraday-uv__curve-line {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.intraday-uv__reapply-dot {
  fill: var(--color-tracking);
  stroke: var(--color-canvas);
  stroke-width: 1.5;
}

.intraday-uv__current-line {
  stroke: var(--color-primary);
  stroke-width: 1.5;
  stroke-dasharray: 3 3;
}

.intraday-uv__current-dot {
  fill: var(--color-primary);
  stroke: var(--color-canvas);
  stroke-width: 2;
}

.intraday-uv__current-label {
  fill: var(--color-primary-text);
  font-family: var(--font-family-supporting);
  font-size: 11px;
  font-weight: 600;
}

.intraday-uv__night-text {
  fill: var(--text-secondary);
  font-family: var(--font-family-supporting);
  font-size: 10px;
  user-select: none;
}

.intraday-uv__tick-label {
  fill: var(--text-secondary);
  font-family: var(--font-family-supporting);
  font-size: 10px;
  user-select: none;
}

.intraday-uv__summary {
  display: grid;
  gap: var(--space-2);
  padding-top: var(--space-1);
}

.intraday-uv__action-advice {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-soon-soft) 45%, var(--color-surface-soft));
}

.intraday-uv__advice-icon {
  font-size: var(--font-size-body);
  line-height: var(--line-height-body);
  flex-shrink: 0;
}

.intraday-uv__advice-text {
  color: var(--text-primary);
  font-size: var(--font-size-supporting);
  line-height: var(--line-height-supporting);
}

.intraday-uv__note {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-supporting);
  line-height: var(--line-height-supporting);
  text-align: center;
}
</style>
