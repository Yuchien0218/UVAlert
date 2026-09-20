<script setup lang="ts">
import { computed } from "vue";
import {
  createChartScale,
  getEquidistantTicks,
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
const chartHeight = 186;
const padding = { top: 34, right: 20, bottom: 28, left: 30 };

// 均勻等距 Y 軸刻度配置
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

// 均勻等距水平參考線
const thresholdLines = computed(() =>
  equidistantConfig.value.ticks.map((tick) => ({
    uvi: tick.uvi,
    label: tick.label,
    y: scale.value.yScale(tick.uvi)
  }))
);

// X 軸時間標記（日間等距標記：06:00, 09:00, 12:00, 15:00, 18:00）
const timeTicks = computed(() => {
  const [start, end] = props.curve.hourRange;
  const step = 3;
  const ticks: { hour: number; label: string; x: number }[] = [];
  for (let h = start; h <= end; h += step) {
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

// 當前時間是否落在日間圖表範圍內（06:00–18:00）
const isWithinChartHours = computed(() => {
  const [start, end] = props.curve.hourRange;
  const h = props.curve.current.hour;
  return h >= start && h <= end;
});

// 日間所在時段的圓形標示（數值四捨五入為整數，與全站一致）
const currentPoint = computed(() => {
  if (!isWithinChartHours.value) return null;

  const h = props.curve.current.hour;
  const x = scale.value.xScale(h);
  const y = scale.value.yScale(props.curve.current.uv);

  return {
    x,
    y,
    uv: Math.round(props.curve.current.uv)
  };
});

// 貼在點正上方的小圓角對話泡泡配置（永遠不與曲線或尖峰標籤碰撞）
const bubbleConfig = computed(() => {
  if (!currentPoint.value) return null;

  const width = 76;
  const height = 24;
  const radius = 9;
  const gap = 7; // 與圓點的垂直間隔

  // 水平置中對齊圓點，並限制左右邊界防裁切
  const minX = padding.left - 4;
  const maxX = chartWidth - padding.right - width + 4;
  const idealX = currentPoint.value.x - width / 2;
  const x = Math.max(minX, Math.min(maxX, idealX));

  // 永遠位於圓點正上方（曲線正上方必為空，且尖峰已搬出圖表，保證不撞線）
  const y = Math.max(2, currentPoint.value.y - height - gap);

  return {
    x,
    y,
    width,
    height,
    radius
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
    <!-- 尖峰文字移出圖表區，成為頂部獨立說明列，不與浮動的「現在」標籤競爭內部空間 -->
    <div v-if="peakBox" class="intraday-uv__header">
      <span class="intraday-uv__peak-header-label">
        尖峰 {{ peakBox.startLabel }}–{{ peakBox.endLabel }}
      </span>
    </div>

    <div class="intraday-uv__chart-wrapper">
      <svg
        :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
        class="intraday-uv__svg"
        role="img"
        aria-label="今日紫外線強度時間曲線圖"
      >
        <!-- 尖峰警戒區域背景遮罩（灰色遮罩保留，文字已移出） -->
        <g v-if="peakBox" class="intraday-uv__peak-zone">
          <rect
            :x="peakBox.x"
            :y="peakBox.y"
            :width="peakBox.width"
            :height="peakBox.height"
            rx="4"
            class="intraday-uv__peak-rect"
          />
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

        <!-- 主線條（Catmull-Rom Spline 光滑曲線，無漸層） -->
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

        <!-- 目前所在時段：正上方對話泡泡標籤與時間參考線 -->
        <g v-if="currentPoint && bubbleConfig" class="intraday-uv__current">
          <!-- 從泡泡底部接下去到 X 軸的參考線，兼作現在時間參考線 -->
          <line
            :x1="currentPoint.x"
            :y1="bubbleConfig.y + bubbleConfig.height"
            :x2="currentPoint.x"
            :y2="baselineY"
            class="intraday-uv__current-line"
          />
          <!-- 圓形標示外圈光暈 -->
          <circle
            :cx="currentPoint.x"
            :cy="currentPoint.y"
            r="7"
            class="intraday-uv__current-halo"
          />
          <!-- 圓形標示核心實心圓 -->
          <circle
            :cx="currentPoint.x"
            :cy="currentPoint.y"
            r="4"
            class="intraday-uv__current-dot"
          />
          <!-- 貼在點正上方的小圓角對話泡泡標籤 -->
          <g class="intraday-uv__bubble">
            <rect
              :x="bubbleConfig.x"
              :y="bubbleConfig.y"
              :width="bubbleConfig.width"
              :height="bubbleConfig.height"
              :rx="bubbleConfig.radius"
              class="intraday-uv__bubble-bg"
            />
            <text
              :x="bubbleConfig.x + bubbleConfig.width / 2"
              :y="bubbleConfig.y + bubbleConfig.height / 2 + 4"
              class="intraday-uv__bubble-text"
              text-anchor="middle"
            >
              現在・UV {{ currentPoint.uv }}
            </text>
          </g>
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

    <!-- 底部資訊：夜間時以文字帶過，並附最小字級之靠左註記 -->
    <div class="intraday-uv__summary">
      <p v-if="!isWithinChartHours" class="intraday-uv__night-note" data-typography-role="caption">
        目前為夜間時段，紫外線指數為 0。
      </p>
      <p class="intraday-uv__note" data-typography-role="caption">
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

.intraday-uv__header {
  display: flex;
  justify-content: center;
  align-items: center;
}

.intraday-uv__peak-header-label {
  color: var(--color-primary-text);
  font-family: var(--font-family-supporting);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.intraday-uv__chart-wrapper {
  width: 100%;
  overflow: visible;
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

.intraday-uv__current-halo {
  fill: var(--color-primary);
  opacity: 0.22;
}

.intraday-uv__current-dot {
  fill: var(--color-primary);
  stroke: var(--color-canvas);
  stroke-width: 2;
}

.intraday-uv__bubble-bg {
  fill: color-mix(in srgb, var(--color-primary) 70%, var(--color-canvas));
  stroke: var(--color-primary);
  stroke-width: 0.75;
  stroke-opacity: 0.35;
}

.intraday-uv__bubble-text {
  fill: var(--color-on-primary);
  font-family: var(--font-family-supporting);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
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
  gap: var(--space-1);
  padding-top: var(--space-1);
}

.intraday-uv__night-note {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  line-height: var(--line-height-caption);
  text-align: start;
}

.intraday-uv__note {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  line-height: var(--line-height-caption);
  text-align: start;
}
</style>
