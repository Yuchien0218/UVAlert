<script setup lang="ts">
import Icon from "../icons/Icon.vue";
import type { IconName } from "../../generated/icons.generated";
import type { ReapplyReason } from "../../features/reapplication/createReapplicationController";

/**
 * 「為什麼補擦？」
 *
 * `2026-09-02-event-means-reapply.md` 階段一。使用者的原則是「這款 App 的主要
 * 功能就是提醒要補擦防曬乳，遇到了事件＝需要補擦」——照那條原則，損耗事件是
 * 補擦的**理由**，不該是另一條要自己走完的流程。
 *
 * **預設是「時間到了」（`null`），不是必填。** 例行補擦是最常見的情況，強迫
 * 每次都挑一個原因會讓多數人被迫回答一個沒有答案的問題。
 *
 * **不含「離水」是刻意的**：離水還會關閉一段水中區間（需要
 * `activityIntervalId`），那是狀態轉換不是註記，留在「記錄狀況」流程。
 *
 * 選項與圖示沿用 `createContextEventController` 的既有定義所對應的那四顆
 * `event-*` 圖示，文案也逐字相同——同一件事在兩個地方不該有兩種說法。
 */

const model = defineModel<ReapplyReason | null>({ required: true });

/**
 * 「現在還不能補擦」的出口（階段二，2026-09-03）。
 *
 * 元件本身不換頁——導航屬於頁面。這裡只說「使用者想離開這條路」，
 * 由 `ReapplyPage` 決定去哪。
 */
defineEmits<{ exit: [] }>();

interface Choice {
  value: ReapplyReason | null;
  label: string;
  icon: IconName | null;
}

const CHOICES: Choice[] = [
  { value: null, label: "時間到了", icon: null },
  { value: "heavy_sweat", label: "大量流汗", icon: "event-heavy-sweat" },
  { value: "towel", label: "擦毛巾", icon: "event-towel" },
  { value: "friction", label: "明顯摩擦", icon: "event-friction" },
  { value: "hand_wash", label: "洗手", icon: "event-hand-wash" }
];
</script>

<template>
  <fieldset class="reason-picker question-card app-card">
    <legend>為什麼補擦？</legend>
    <p class="question-card__helper">
      選了原因會一起記錄下來；只是時間到了就不用選。
    </p>

    <div class="choice-grid">
      <label v-for="choice in CHOICES" :key="choice.label">
        <input
          v-model="model"
          type="radio"
          name="reapply-reason"
          :value="choice.value"
        />
        <span class="reason-picker__label">
          <Icon v-if="choice.icon !== null" :name="choice.icon" :size="20" />
          {{ choice.label }}
        </span>
      </label>
    </div>

    <!--
      階段二：記錄狀況從首頁的提問卡降級成這裡的出口。
      文字連結不是按鈕——這是「這條路不適用」的離開，不是一個並列的選擇。
    -->
    <button
      class="text-link reason-picker__exit"
      data-typography-role="body"
      type="button"
      @click="$emit('exit')"
    >
      現在還不能補擦，先記錄狀況
    </button>
  </fieldset>
</template>

<style scoped>
/*
 * `.choice-grid` 的 label 是「auto ＋ 1fr」兩欄（radio ＋ 內容），所以圖示要
 * 跟文字一起待在第二欄裡，不能自己再開一欄——那會讓沒有圖示的「時間到了」
 * 跟其他四項對不齊。
 */
.reason-picker__label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.reason-picker__label svg {
  flex: none;
}

/* 出口貼齊卡片左緣，並保有可點區高度。 */
.reason-picker__exit {
  justify-self: start;
  min-height: var(--tap-target);
}
</style>
