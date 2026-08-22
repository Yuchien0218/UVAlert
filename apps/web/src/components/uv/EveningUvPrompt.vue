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
        {{ forecast.region.displayName }}的白日時段，最高預報為 UVI
        <span class="stat-figure stat-figure--inline">
          {{ highestDay.uvi }}
        </span>（{{
          getUvRiskLevelLabel(highestDay.riskLevel)
        }}）。建議準備遮蔭和防曬用品。
      </p>
      <button
        class="button button--quiet evening-prompt__view"
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
      aria-label="今晚不再顯示五日 UV 預報"
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
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  background: var(--color-untimed-soft);
  transition: all var(--duration-fast) var(--ease-out);
}

.evening-prompt:hover {
  border-color: var(--color-untimed);
}

.evening-prompt__icon {
  margin-top: 0.125rem;
  color: var(--color-untimed);
  flex-shrink: 0;
}

.evening-prompt__content {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
  min-width: 0;
}

.evening-prompt__eyebrow,
.evening-prompt__title,
.evening-prompt__body {
  margin: 0;
}

.evening-prompt__title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-primary);
}

.evening-prompt__body {
  color: var(--text-secondary);
  font-size: var(--font-size-body);
  line-height: 1.6;
}

/* 不要在這裡寫 min-height：.button 已經帶 min-height: var(--tap-target)，
   區域覆寫只會把點擊目標壓到 44px 以下（先前是 2.5rem = 40px）。 */
.evening-prompt__view {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  font-weight: 500;
  margin-top: var(--space-1);
}

.evening-prompt__dismiss {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.evening-prompt__dismiss:hover {
  background: var(--border-subtle);
  color: var(--text-primary);
}

@media (max-width: 24rem) {
  .evening-prompt {
    grid-template-columns: 1fr auto;
    gap: var(--space-3);
  }

  .evening-prompt__icon {
    display: none;
  }

  .evening-prompt__view {
    width: 100%;
    justify-content: center;
  }
}
</style>
