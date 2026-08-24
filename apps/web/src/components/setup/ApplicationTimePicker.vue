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
  <fieldset class="time-picker question-card app-card">
    <legend>塗抹時間</legend>
    <p class="question-card__helper">
      請選擇實際塗抹時間。系統會以此重新計算提醒狀態。
    </p>

    <div class="time-picker__quick">
      <button
        v-for="option in quickOptions"
        :key="option.minutesAgo"
        class="time-option app-card"
        :class="{
          'option-selected': selectedQuick === option.minutesAgo
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
/*
 * 2026-08-24：這張卡原本自己刻了一整套 fieldset＋legend＋說明的版面
 * （legend 用 clamp(0.95rem, 4vw, 1.05rem) 魔術數字、靠負的 margin-bottom
 * 補間距、又重寫一次 app-card 已經提供的 border），跟正下方結構完全相同的
 * SunscreenClaimQuickQuestion 長得不一樣——那張用的是共用的 .question-card。
 * 同一頁兩張同構的卡片標題大小與間距不同，就是「排版像舊實作」的來源。
 * 改用共用的 .question-card，這裡只留這張卡特有的東西。
 */
/*
 * 2026-08-24：手機版原本是一欄四列（桌面才兩欄），四個快選項目就佔掉
 * 一大段高度，是這頁太長的主因之一。改成一律兩欄兩列，並把時刻放到
 * 標籤下方而不是右側——原本桌面版就是這個排法，現在變成共用的基準，
 * 媒體查詢因此可以整個拿掉。
 */
.time-picker__quick {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

.time-option {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
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

.time-option__label {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-weight: 500;
}

.time-option__time {
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  white-space: nowrap;
}

.time-picker__custom {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.time-picker__custom span {
  color: var(--text-secondary);
  font-size: var(--font-size-label);
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
</style>
