<script setup lang="ts">
import { computed, shallowRef } from "vue";

const value = defineModel<string | null>({ required: true });

const referenceNow = new Date();
const customValue = shallowRef(
  value.value === null ? "" : toLocalInputValue(new Date(value.value))
);

const quickOptions = [
  { label: "剛剛", figure: null, suffix: null, minutesAgo: 0 },
  { label: null, figure: 15, suffix: "分鐘前", minutesAgo: 15 },
  { label: null, figure: 30, suffix: "分鐘前", minutesAgo: 30 },
  { label: null, figure: 1, suffix: "小時前", minutesAgo: 60 }
] as const;

const selectedQuick = computed(() => {
  if (value.value === null) return null;
  const selectedMs = Date.parse(value.value);
  return (
    quickOptions.find(
      (option) =>
        Math.abs(
          selectedMs -
            (referenceNow.getTime() - option.minutesAgo * 60_000)
        ) < 5_000
    )?.minutesAgo ?? null
  );
});

function selectQuick(minutesAgo: number): void {
  const selected = new Date(
    referenceNow.getTime() - minutesAgo * 60_000
  );
  value.value = selected.toISOString();
  customValue.value = toLocalInputValue(selected);
}

function selectCustom(): void {
  if (customValue.value === "") {
    value.value = null;
    return;
  }
  const selected = new Date(customValue.value);
  value.value = Number.isNaN(selected.getTime())
    ? null
    : selected.toISOString();
}

function formatAbsolute(minutesAgo: number): string {
  return new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(
    new Date(referenceNow.getTime() - minutesAgo * 60_000)
  );
}

function toLocalInputValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs)
    .toISOString()
    .slice(0, 16);
}
</script>

<template>
  <fieldset class="time-picker app-card">
    <legend>塗抹時間</legend>
    <p>
      請選擇實際塗抹時間。系統會以此重新計算提醒狀態。
    </p>

    <div class="time-picker__quick">
      <button
        v-for="option in quickOptions"
        :key="option.minutesAgo"
        class="time-option"
        :class="{
          'time-option--selected':
            selectedQuick === option.minutesAgo
        }"
        type="button"
        @click="selectQuick(option.minutesAgo)"
      >
        <span class="time-option__label">
          <template v-if="option.figure === null">{{ option.label }}</template>
          <template v-else>
            <span class="stat-figure stat-figure--inline">{{ option.figure }}</span>
            {{ option.suffix }}
          </template>
        </span>
        <span class="time-option__time stat-figure stat-figure--inline">
          {{ formatAbsolute(option.minutesAgo) }}
        </span>
      </button>
    </div>

    <label class="time-picker__custom">
      <span>自訂時間</span>
      <input
        v-model="customValue"
        class="stat-figure"
        type="datetime-local"
        :max="toLocalInputValue(new Date())"
        @change="selectCustom"
      >
    </label>
  </fieldset>
</template>

<style scoped>
.time-picker {
  display: grid;
  gap: var(--space-5);
  min-width: 0;
  margin: 0;
  padding: var(--space-5);
  border: 1px solid var(--border-subtle);
}

.time-picker legend {
  padding: 0;
  font-size: clamp(0.95rem, 4vw, 1.05rem);
  font-weight: 500;
  margin-bottom: calc(var(--space-3) * -1);
}

.time-picker > p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.8rem;
  line-height: 1.6;
}

.time-picker__quick {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
}

.time-option {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
  transition: background-color var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

.time-option:hover {
  background-color: var(--border-subtle);
}

.time-option:active {
  filter: brightness(0.92);
}

.time-option--selected {
  border: 2px solid var(--color-tracking);
  background: var(--color-tracking-soft);
  color: var(--text-primary);
}

.time-option__label {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-weight: 500;
}

.time-option__time {
  color: var(--text-secondary);
  font-size: 0.85rem;
  white-space: nowrap;
}

.time-option--selected .time-option__time {
  color: var(--text-secondary);
}

.time-picker__custom {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.time-picker__custom span {
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
}

.time-picker__custom input {
  min-height: var(--tap-target);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--page-background);
  color: var(--text-primary);
  color-scheme: light dark;
  font-size: 1rem;
}

@media (min-width: 36rem) {
  .time-picker__quick {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
  }

  .time-option {
    grid-template-columns: 1fr;
    gap: var(--space-1);
    padding: var(--space-3);
  }

  .time-option__time {
    font-size: 0.75rem;
  }
}
</style>
