<script setup lang="ts">
import type { FiveDayUvForecast } from "@sunshield/contracts";
import { ArrowDown, MoonStar, X } from "@lucide/vue";
import { computed } from "vue";
import {
  getHighestForecastDay,
  getUvRiskLevelLabel
} from "../../features/uv/uvForecastRules";

interface Props {
  forecast: FiveDayUvForecast;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  view: [];
  dismiss: [];
}>();

const highestDay = computed(() =>
  getHighestForecastDay(props.forecast)
);
</script>

<template>
  <aside
    class="evening-prompt"
    aria-labelledby="evening-uv-title"
  >
    <MoonStar
      class="evening-prompt__icon"
      :size="24"
      :stroke-width="1.6"
      aria-hidden="true"
    />
    <div class="evening-prompt__content">
      <h2 id="evening-uv-title" class="evening-prompt__title">
        晚上先看接下來 5 天 UV
      </h2>
      <p class="evening-prompt__body">
        {{ forecast.region.displayName }}接下來的白日時段，最高預報為
        UVI
        <span class="stat-figure stat-figure--inline">
          {{ highestDay.uvi }}
        </span>（{{
          getUvRiskLevelLabel(highestDay.riskLevel)
        }}）。可以先安排遮蔭、衣物、帽子與防曬用品。
      </p>
      <button
        class="evening-prompt__view"
        type="button"
        @click="emit('view')"
      >
        查看五日 UV
        <ArrowDown :size="17" aria-hidden="true" />
      </button>
    </div>
    <button
      class="evening-prompt__dismiss"
      type="button"
      aria-label="今晚不再顯示五日 UV 提醒"
      @click="emit('dismiss')"
    >
      <X :size="19" aria-hidden="true" />
    </button>
  </aside>
</template>

<style scoped>
.evening-prompt {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: start;
  gap: var(--space-3);
  padding: var(--space-5);
  border-radius: var(--radius-md);
  background: var(--color-untimed-soft);
}

.evening-prompt__icon {
  margin-top: var(--space-1);
  color: var(--color-untimed);
}

.evening-prompt__content {
  display: grid;
  justify-items: start;
  gap: var(--space-2);
}

.evening-prompt__eyebrow,
.evening-prompt__title,
.evening-prompt__body {
  margin: 0;
}

.evening-prompt__title {
  font-size: 1.1rem;
  font-weight: 500;
}

.evening-prompt__body {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.7;
}

.evening-prompt__view,
.evening-prompt__dismiss {
  border: 0;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
}

.evening-prompt__view {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 2.5rem;
  padding: var(--space-2) 0;
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 0.25rem;
}

.evening-prompt__dismiss {
  display: grid;
  width: var(--tap-target);
  height: var(--tap-target);
  place-items: center;
  padding: 0;
  border-radius: var(--radius-pill);
}

@media (max-width: 24rem) {
  .evening-prompt {
    grid-template-columns: 1fr auto;
  }

  .evening-prompt__icon {
    display: none;
  }
}
</style>
