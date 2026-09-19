<script setup lang="ts">
import { computed } from "vue";
import BottomSheet from "../common/BottomSheet.vue";
import IntradayUvCurve from "./IntradayUvCurve.vue";
import {
  getHourlyForecastItems,
  type IntradayUvCurveModel,
  type UvRiskLevel
} from "../../features/uv/solarUvCurve";

interface Props {
  open: boolean;
  curve: IntradayUvCurveModel | null;
  regionName?: string | null | undefined;
  reapplyHours?: number[] | undefined;
}

const props = withDefaults(defineProps<Props>(), {
  regionName: null,
  reapplyHours: () => []
});

const emit = defineEmits<{
  close: [];
}>();

const hourlyItems = computed(() => {
  if (!props.curve) return [];
  return getHourlyForecastItems(props.curve, 6, 18);
});

function riskLabel(level: UvRiskLevel): string {
  switch (level) {
    case "low":
      return "低量";
    case "moderate":
      return "中量";
    case "high":
      return "高量";
    case "very_high":
      return "過量";
    case "extreme":
      return "危險";
    default:
      return "低量";
  }
}

function formatHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour % 1) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
</script>

<template>
  <BottomSheet
    :open="open"
    :title="regionName ? `${regionName}・今日 UV 走勢` : '今日 UV 走勢'"
    labelled-by-id="intraday-uv-sheet-title"
    @close="emit('close')"
  >
    <div v-if="curve" class="intraday-uv-sheet__content">
      <!-- 走勢圖表 -->
      <IntradayUvCurve
        :curve="curve"
        :reapply-hours="reapplyHours"
        compact
      />

      <!-- 彈窗獨家深層資訊 1：逐小時指數橫向滑動列表 -->
      <section class="intraday-uv-sheet__section" aria-labelledby="hourly-title">
        <div class="intraday-uv-sheet__section-header">
          <h2 id="hourly-title" class="intraday-uv-sheet__section-title" data-typography-role="section-title">
            日間逐時指數
          </h2>
          <span class="intraday-uv-sheet__section-sub" data-typography-role="supporting">
            橫向滑動檢視各時段強度
          </span>
        </div>

        <div class="intraday-uv-sheet__hourly-scroll" role="region" aria-label="逐小時紫外線指數列表">
          <div
            v-for="item in hourlyItems"
            :key="item.hour"
            class="intraday-uv-sheet__hour-chip"
            :class="{
              'intraday-uv-sheet__hour-chip--current': item.isCurrent,
              'intraday-uv-sheet__hour-chip--peak': item.isPeak
            }"
          >
            <span class="intraday-uv-sheet__hour-time">{{ item.timeLabel }}</span>
            <span
              class="intraday-uv-sheet__hour-uv"
              :class="`intraday-uv-sheet__hour-uv--${item.riskLevel}`"
            >
              {{ item.uv }}
            </span>
            <span
              class="intraday-uv-sheet__hour-badge"
              :class="`intraday-uv-sheet__hour-badge--${item.riskLevel}`"
            >
              {{ riskLabel(item.riskLevel) }}
            </span>
            <span v-if="item.isCurrent" class="intraday-uv-sheet__now-indicator">現在</span>
          </div>
        </div>
      </section>

      <!-- 彈窗獨家深層資訊 2：補擦防曬歷史記錄 -->
      <section v-if="reapplyHours.length > 0" class="intraday-uv-sheet__section">
        <h2 class="intraday-uv-sheet__section-title" data-typography-role="section-title">
          今日補擦紀錄
        </h2>
        <ul class="intraday-uv-sheet__reapply-list">
          <li
            v-for="(h, idx) in reapplyHours"
            :key="idx"
            class="intraday-uv-sheet__reapply-item"
          >
            <span class="intraday-uv-sheet__reapply-pin" aria-hidden="true" />
            <span class="intraday-uv-sheet__reapply-time">{{ formatHour(h) }}</span>
            <span class="intraday-uv-sheet__reapply-desc">防曬補擦已記錄</span>
          </li>
        </ul>
      </section>
    </div>
  </BottomSheet>
</template>

<style scoped>
.intraday-uv-sheet__content {
  display: grid;
  gap: var(--space-4);
  padding-bottom: var(--space-3);
}

.intraday-uv-sheet__section {
  display: grid;
  gap: var(--space-2);
}

.intraday-uv-sheet__section-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.intraday-uv-sheet__section-title {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-size-body);
  font-weight: 600;
}

.intraday-uv-sheet__section-sub {
  color: var(--text-secondary);
  font-size: var(--font-size-supporting);
}

.intraday-uv-sheet__hourly-scroll {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  padding: var(--space-1) 0;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

.intraday-uv-sheet__hour-chip {
  display: grid;
  gap: 2px;
  justify-items: center;
  flex: 0 0 60px;
  padding: var(--space-2) var(--space-1);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--color-surface-soft);
  position: relative;
  transition: border-color var(--duration-fast) var(--ease-out);
}

.intraday-uv-sheet__hour-chip--current {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface-soft));
}

.intraday-uv-sheet__hour-chip--peak {
  box-shadow: inset 0 2px 0 var(--color-soon-soft);
}

.intraday-uv-sheet__hour-time {
  color: var(--text-secondary);
  font-size: 11px;
  font-family: var(--font-family-supporting);
}

.intraday-uv-sheet__hour-uv {
  font-size: var(--font-size-body);
  font-weight: 700;
  color: var(--text-primary);
}

.intraday-uv-sheet__hour-badge {
  font-size: 9px;
  padding: 1px 4px;
  border-radius: var(--radius-pill);
  font-weight: 600;
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  background: var(--color-canvas);
}

.intraday-uv-sheet__hour-badge--low {
  border-color: color-mix(in srgb, var(--color-uvi-visual-low) 50%, transparent);
}

.intraday-uv-sheet__hour-badge--moderate {
  border-color: color-mix(in srgb, var(--color-uvi-visual-moderate) 50%, transparent);
}

.intraday-uv-sheet__hour-badge--high {
  border-color: color-mix(in srgb, var(--color-uvi-visual-high) 50%, transparent);
}

.intraday-uv-sheet__hour-badge--very_high {
  border-color: color-mix(in srgb, var(--color-uvi-visual-very-high) 50%, transparent);
}

.intraday-uv-sheet__hour-badge--extreme {
  border-color: color-mix(in srgb, var(--color-uvi-visual-extreme) 50%, transparent);
}

.intraday-uv-sheet__now-indicator {
  position: absolute;
  top: -6px;
  background: var(--color-primary);
  color: var(--color-canvas);
  font-size: 8px;
  padding: 0 4px;
  border-radius: var(--radius-pill);
  font-weight: 600;
}

.intraday-uv-sheet__reapply-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-2);
}

.intraday-uv-sheet__reapply-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--color-surface-soft);
  font-size: var(--font-size-supporting);
}

.intraday-uv-sheet__reapply-pin {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-pill);
  background: var(--color-tracking);
}

.intraday-uv-sheet__reapply-time {
  font-weight: 600;
  color: var(--text-primary);
}

.intraday-uv-sheet__reapply-desc {
  color: var(--text-secondary);
}
</style>
