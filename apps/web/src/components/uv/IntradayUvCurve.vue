<script setup lang="ts">
import { computed } from "vue";
import {
  createChartScale,
  pointsToAreaPath,
  pointsToSmoothPath,
  type IntradayUvCurveModel
} from "../../features/uv/solarUvCurve";
import UvRiskLegend from "./UvRiskLegend.vue";

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

const maxChartUv = computed(() => {
  const peak = props.curve.peak.uv;
  if (peak <= 5) return 6;
  if (peak <= 7) return 8;
  if (peak <= 10) return 11;
  return Math.ceil(peak + 1);
});

const scale = computed(() =>
  createChartScale({
    width: chartWidth,
    height: chartHeight,
    padding,
    hourRange: props.curve.hourRange,
    maxUv: maxChartUv.value
  })
);

const baselineY = chartHeight - padding.bottom;

const linePath = computed(() => pointsToSmoothPath(props.curve.points, scale.value));
const areaPath = computed(() =>
  pointsToAreaPath(props.curve.points, scale.value, baselineY)
);

// WHO 門檻水平參考線
const thresholdLines = computed(() => {
  const levels = [
    { uvi: 3, label: "3 中" },
    { uvi: 6, label: "6 高" },
    { uvi: 8, label: "8 過量" },
    { uvi: 11, label: "11 危險" }
  ];
  return levels
    .filter((lvl) => lvl.uvi <= maxChartUv.value)
    .map((lvl) => ({
      ...lvl,
      y: scale.value.yScale(lvl.uvi)
    }));
});

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

// 現在時間位置
const currentPoint = computed(() => {
  if (!props.curve.current.isDaytime) return null;
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

        <!-- WHO 水平門檻參考線 -->
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
              :x="padding.left - 4"
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

        <!-- 曲線面積填充與主線條 -->
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

        <!-- 當前時間指示線與圓點 -->
        <g v-if="currentPoint" class="intraday-uv__current">
          <line
            :x1="currentPoint.x"
            :y1="currentPoint.y"
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
          <!-- 懸浮提示文字 -->
          <text
            :x="currentPoint.x > chartWidth * 0.72 ? currentPoint.x - 8 : currentPoint.x + 8"
            :y="Math.max(padding.top + 6, currentPoint.y - 8)"
            :text-anchor="currentPoint.x > chartWidth * 0.72 ? 'end' : 'start'"
            class="intraday-uv__current-label"
          >
            現在・UV {{ currentPoint.uv }}
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

    <!-- 底部資訊與圖例 -->
    <div class="intraday-uv__summary">
      <div v-if="curve.peakWindow" class="intraday-uv__peak-notice">
        <strong data-typography-role="body">
          尖峰防護時段：{{ curve.peakWindow.startLabel }} 至 {{ curve.peakWindow.endLabel }}
        </strong>
        <span data-typography-role="supporting">
          預測峰值約 {{ curve.peak.timeLabel }} 達最高 UV {{ curve.peak.uv }}，建議此時段加強防護與遮蔭。
        </span>
      </div>

      <UvRiskLegend v-if="!compact" />

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
  stroke-width: 2.25;
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

.intraday-uv__tick-label {
  fill: var(--text-secondary);
  font-family: var(--font-family-supporting);
  font-size: 10px;
  user-select: none;
}

.intraday-uv__summary {
  display: grid;
  gap: var(--space-3);
  padding-top: var(--space-2);
}

.intraday-uv__peak-notice {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-soon-soft) 40%, var(--color-surface-soft));
  color: var(--color-body);
}

.intraday-uv__peak-notice strong {
  color: var(--text-primary);
  font-size: var(--font-size-body);
}

.intraday-uv__peak-notice span {
  color: var(--text-secondary);
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
