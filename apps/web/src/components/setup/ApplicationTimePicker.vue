<script setup lang="ts">
import { computed } from "vue";

/**
 * 塗抹時間只提供四個相對時間快選。
 *
 * 2026-08-24 使用者裁決：移除自訂時間（datetime-local）與每個選項下方的
 * 絕對時刻。這頁的第一考量是「當計時器用」，選項愈少、文字愈少愈好。
 *
 * **已知取捨**：超過一小時前塗抹的情況現在無法在設定時記錄，只能選「1
 * 小時前」。若之後回報這是問題，再考慮加回自訂時間或延長快選範圍。
 */

const value = defineModel<string | null>({ required: true });

const referenceNow = new Date();

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
  value.value = new Date(
    referenceNow.getTime() - minutesAgo * 60_000
  ).toISOString();
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
      </button>
    </div>
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
 * 一大段高度，是這頁太長的主因之一。改成一律兩欄兩列，媒體查詢因此
 * 可以整個拿掉。
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

</style>
