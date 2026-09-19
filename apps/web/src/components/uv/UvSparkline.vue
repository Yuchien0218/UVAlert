<script setup lang="ts">
import { computed } from "vue";
import {
  createChartScale,
  pointsToAreaPath,
  pointsToSmoothPath,
  type IntradayUvCurveModel
} from "../../features/uv/solarUvCurve";

interface Props {
  curve: IntradayUvCurveModel;
  width?: number;
  height?: number;
  interactive?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  width: 84,
  height: 26,
  interactive: true
});

const emit = defineEmits<{
  open: [];
}>();

const scale = computed(() =>
  createChartScale({
    width: props.width,
    height: props.height,
    padding: { top: 3, right: 3, bottom: 3, left: 3 },
    hourRange: props.curve.hourRange,
    maxUv: Math.max(props.curve.peak.uv, 1)
  })
);

const linePath = computed(() => pointsToSmoothPath(props.curve.points, scale.value));
const areaPath = computed(() =>
  pointsToAreaPath(props.curve.points, scale.value, props.height - 3)
);

const currentPoint = computed(() => {
  if (!props.curve.current.isDaytime) return null;
  return {
    x: scale.value.xScale(props.curve.current.hour),
    y: scale.value.yScale(props.curve.current.uv)
  };
});
</script>

<template>
  <button
    v-if="interactive"
    type="button"
    class="uv-sparkline uv-sparkline--interactive"
    :class="{ 'uv-sparkline--night': !curve.current.isDaytime }"
    aria-label="查看今日紫外線時間趨勢分佈"
    title="點擊查看今日紫外線時間趨勢分佈"
    @click="emit('open')"
  >
    <svg
      :width="width"
      :height="height"
      :viewBox="`0 0 ${width} ${height}`"
      class="uv-sparkline__svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="sparkline-gradient"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.25" />
          <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0.02" />
        </linearGradient>
      </defs>

      <path
        v-if="areaPath"
        :d="areaPath"
        fill="url(#sparkline-gradient)"
      />
      <path
        v-if="linePath"
        :d="linePath"
        class="uv-sparkline__line"
      />
      <circle
        v-if="currentPoint"
        :cx="currentPoint.x"
        :cy="currentPoint.y"
        r="3"
        class="uv-sparkline__dot"
      />
    </svg>
  </button>

  <div
    v-else
    class="uv-sparkline"
    :class="{ 'uv-sparkline--night': !curve.current.isDaytime }"
    aria-hidden="true"
  >
    <svg
      :width="width"
      :height="height"
      :viewBox="`0 0 ${width} ${height}`"
      class="uv-sparkline__svg"
    >
      <defs>
        <linearGradient
          id="sparkline-gradient-static"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.25" />
          <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0.02" />
        </linearGradient>
      </defs>

      <path
        v-if="areaPath"
        :d="areaPath"
        fill="url(#sparkline-gradient-static)"
      />
      <path
        v-if="linePath"
        :d="linePath"
        class="uv-sparkline__line"
      />
      <circle
        v-if="currentPoint"
        :cx="currentPoint.x"
        :cy="currentPoint.y"
        r="3"
        class="uv-sparkline__dot"
      />
    </svg>
  </div>
</template>

<style scoped>
.uv-sparkline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-1);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--color-surface-soft);
  cursor: default;
  transition: border-color var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out);
}

.uv-sparkline--interactive {
  cursor: pointer;
}

.uv-sparkline--interactive:hover {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 6%, var(--color-surface-soft));
}

.uv-sparkline--interactive:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.uv-sparkline--night {
  opacity: 0.55;
}

.uv-sparkline__svg {
  display: block;
  overflow: visible;
}

.uv-sparkline__line {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 1.75;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.uv-sparkline__dot {
  fill: var(--color-primary);
  stroke: var(--color-surface-soft);
  stroke-width: 1.5;
}
</style>
