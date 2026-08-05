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
    <legend>這些部位實際何時塗抹？</legend>
    <p>
      請確認實際時間。系統會保存絕對時間，重新開啟後再計算提醒狀態。
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
        <strong>
          <template v-if="option.figure === null">{{ option.label }}</template>
          <template v-else>
            <span class="stat-figure stat-figure--inline">{{ option.figure }}</span>
            {{ option.suffix }}
          </template>
        </strong>
        <small class="stat-figure stat-figure--inline">
          {{ formatAbsolute(option.minutesAgo) }}
        </small>
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
  gap: var(--space-4);
  min-width: 0;
  margin: 0;
  padding: var(--space-5);
  border: 1px solid var(--border-subtle);
}

.time-picker legend {
  padding: 0;
  font-size: 1.08rem;
  font-weight: 500;
}

.time-picker > p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.7;
}

.time-picker__quick {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

.time-option {
  display: grid;
  min-height: 4.25rem;
  align-content: center;
  gap: var(--space-1);
  padding: var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
}

.time-option--selected {
  border: 2px solid var(--text-primary);
  background: var(--page-background);
}

.time-option strong {
  font-weight: 500;
}

.time-option small {
  color: var(--text-secondary);
}

.time-picker__custom {
  display: grid;
  gap: var(--space-2);
}

.time-picker__custom span {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.time-picker__custom input {
  min-height: var(--tap-target);
  padding: var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--page-background);
  color: var(--text-primary);
  color-scheme: light dark;
}

@media (max-width: 24rem) {
  .time-picker__quick {
    grid-template-columns: 1fr;
  }
}
</style>
