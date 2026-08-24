<script setup lang="ts">
import { shallowRef } from "vue";
import type { WaterStartFormValue } from "../../features/setup/createSetupController";

const value = defineModel<WaterStartFormValue | null>({
  required: true
});

const referenceNow = new Date();
const customValue = shallowRef(
  value.value?.activityStartedAt == null
    ? ""
    : toLocalInputValue(new Date(value.value.activityStartedAt))
);

function selectKnown(minutesAgo: number): void {
  const selected = new Date(
    referenceNow.getTime() - minutesAgo * 60_000
  );
  value.value = {
    confidence: "confirmed",
    activityStartedAt: selected.toISOString()
  };
  customValue.value = toLocalInputValue(selected);
}

function selectUnknown(): void {
  value.value = {
    confidence: "unknown",
    activityStartedAt: null
  };
  customValue.value = "";
}

function selectCustom(): void {
  if (customValue.value === "") {
    value.value = null;
    return;
  }
  const selected = new Date(customValue.value);
  value.value = Number.isNaN(selected.getTime())
    ? null
    : {
        confidence: "confirmed",
        activityStartedAt: selected.toISOString()
      };
}

function toLocalInputValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs)
    .toISOString()
    .slice(0, 16);
}
</script>

<template>
  <fieldset class="water-start app-card">
    <legend>實際何時開始入水？</legend>
    <p>
      若無法確認，可以選擇不確定；系統會保守處理，不會猜測入水時間。
    </p>
    <div class="water-start__options">
      <button type="button" @click="selectKnown(0)">剛剛入水</button>
      <button type="button" @click="selectKnown(15)">
        約
        <span class="stat-figure stat-figure--inline">15</span>
        分鐘前
      </button>
      <button
        type="button"
        :class="{
          'water-start__selected': value?.confidence === 'unknown'
        }"
        @click="selectUnknown"
      >
        不確定
      </button>
    </div>
    <label>
      <span>自訂入水時間</span>
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
.water-start {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
  margin: 0;
  padding: var(--space-5);
  border: 1px solid var(--border-subtle);
}

.water-start legend {
  padding: 0;
  font-size: var(--font-size-title-sm);
  font-weight: 500;
}

.water-start > p {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-body);
  line-height: 1.7;
}

.water-start__options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.water-start__options button {
  min-height: var(--tap-target);
  padding: 0 var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
}

.water-start__options button:focus,
.water-start__selected {
  border-color: var(--text-primary) !important;
  background: var(--page-background) !important;
}

.water-start label {
  display: grid;
  gap: var(--space-2);
}

.water-start label span {
  color: var(--text-secondary);
  font-size: var(--font-size-body);
}

.water-start input {
  min-height: var(--tap-target);
  padding: var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--page-background);
  color: var(--text-primary);
  color-scheme: light dark;
}
</style>
