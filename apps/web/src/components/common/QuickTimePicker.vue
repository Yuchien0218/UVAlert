<script setup lang="ts">
import { computed, ref, useId } from "vue";
import { formatDateTime } from "../../helpers/datetime";

/**
 * 「這件事什麼時候發生的」時間選擇器。
 *
 * **2026-08-31 改成「預設值 ＋ 調整時間」兩顆，不再是四顆快捷鈕。**
 *
 * 原本是「剛剛／15 分鐘前／30 分鐘前／60 分鐘前」四顆並排，底下再加一個
 * **常駐**的 `datetime-local` 欄位與確認時間那一行。使用者的原話是「取消
 * 剛剛、另一個按鈕改為時間調整器」——因為進到記錄狀況那一頁時，時間本來
 * 就已經是現在，「剛剛」那顆按鈕按下去什麼也不會變。
 *
 * 新的形狀跟 `ApplicationTimePicker`（塗抹時間）與 `WaterStartPicker`
 * （入水時間）一致：一顆顯示目前值、一顆展開調整。**這個 App 現在只有
 * 一種時間選擇器的樣子**，不是三種。
 *
 * 常駐的日期欄位改成展開才出現：它是少數情況才要用的東西，而它在收合前
 * 佔掉約 120px，直接把下方的主要行動推出畫面。
 *
 * **這個元件被三頁共用**（記錄補擦、記錄狀況、更正紀錄），所以三頁一起改。
 * 留兩種形狀才是問題——這一整批收斂做的就是這件事。
 */

interface Props {
  appliedAt: string;
  referenceNow: string;
  error: string | undefined;
  heading?: string;
  idPrefix?: string;
  summaryLabel?: string;
  /** 預設那一顆的文字，例如「1 分鐘前」。 */
  defaultLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  heading: "實際何時補擦？",
  idPrefix: "reapply-time",
  summaryLabel: "確認時間：",
  defaultLabel: "1 分鐘前"
});

const emit = defineEmits<{
  change: [value: string];
  quick: [minutesAgo: number];
}>();

const adjusting = ref(false);
const draftLocalValue = ref("");
const adjustPanelId = `${useId()}-adjust`;

function localValue(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/** 目前選的時間距離參考時點幾分鐘。 */
const minutesAgo = computed(() =>
  Math.round(
    (Date.parse(props.referenceNow) - Date.parse(props.appliedAt)) / 60_000
  )
);

/**
 * 一分鐘以內都當成「還沒調整過」，跟預設那一顆是同一件事。
 *
 * 2026-09-03：上界從「< 1」放寬成「<= 1」。預設那一顆改成送出「1 分鐘前」
 * 之後，若仍以 1 分鐘為界，按下去反而會讓它自己取消選取。
 */
const usingDefault = computed(() => minutesAgo.value <= 1);

const adjustedLabel = computed(() => {
  if (usingDefault.value) return null;
  const minutes = minutesAgo.value;
  if (minutes < 60) return `${minutes} 分鐘前`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} 小時前` : `${hours} 小時 ${rest} 分鐘前`;
});

/**
 * 預設那一顆送出的是「1 分鐘前」，不是「現在」（2026-09-03，使用者要求把
 * 文字從「剛剛」改成「1 分鐘前」）。
 *
 * 塗抹時間（`ApplicationTimePicker`）與入水時間（`WaterStartPicker`）的
 * `DEFAULT_MINUTES_AGO` 本來就是 1，按鈕上寫的也是「1 分鐘前」。這個元件
 * 是三頁共用的第三種時間選擇器，卻自己寫「剛剛」、自己送 0——同一個 App
 * 裡的同一顆按鈕有兩種說法。文字與送出的值一起改，才不會出現「寫著 1
 * 分鐘前、存進去卻是現在」。
 */
function selectDefault(): void {
  emit("quick", 1);
}

function toggleAdjust(): void {
  if (adjusting.value) {
    adjusting.value = false;
    return;
  }
  draftLocalValue.value = localValue(props.appliedAt);
  adjusting.value = true;
}

function applyAdjustment(): void {
  if (draftLocalValue.value === "") return;
  const parsed = Date.parse(draftLocalValue.value);
  if (Number.isNaN(parsed)) return;
  emit("change", new Date(parsed).toISOString());
  adjusting.value = false;
}
</script>

<template>
  <section class="app-card time-section" :aria-labelledby="`${idPrefix}-title`">
    <h2 :id="`${idPrefix}-title`" data-typography-role="card-title">
      {{ heading }}
    </h2>

    <div class="time-picker__quick">
      <button
        class="time-option app-card"
        :class="{ 'option-selected': usingDefault }"
        type="button"
        @click="selectDefault"
      >
        <span class="time-option__label">{{ defaultLabel }}</span>
      </button>

      <button
        class="time-option app-card"
        :class="{ 'option-selected': adjustedLabel !== null }"
        type="button"
        :aria-expanded="adjusting"
        :aria-controls="adjustPanelId"
        @click="toggleAdjust"
      >
        <span class="time-option__label">調整時間</span>
      </button>
    </div>

    <div v-if="adjusting" :id="adjustPanelId" class="time-adjust">
      <label class="time-adjust__field" :for="idPrefix">
        <span>自訂日期與時間</span>
        <input
          :id="idPrefix"
          v-model="draftLocalValue"
          type="datetime-local"
          :max="localValue(referenceNow)"
          :aria-describedby="error ? `${idPrefix}-error` : `${idPrefix}-summary`"
        />
      </label>
      <button
        class="button button--primary"
        type="button"
        @click="applyAdjustment"
      >
        套用
      </button>
    </div>

    <!--
      調整後要看得出目前選了什麼，否則按鈕上只寫「調整時間」等於沒有回饋。
      沿用 ApplicationTimePicker 的處理。
    -->
    <p
      v-if="adjustedLabel !== null"
      :id="`${idPrefix}-summary`"
      class="time-summary"
      role="status"
    >
      {{ summaryLabel }}{{ formatDateTime(appliedAt) }}
    </p>

    <p v-if="error" :id="`${idPrefix}-error`" class="form-error" role="alert">
      {{ error }}
    </p>
  </section>
</template>

<style scoped>
.time-section {
  display: grid;
  gap: var(--space-4);
  padding: var(--card-padding);
}

h2,
p {
  margin: 0;
}

.time-section h2 {
  font-size: var(--font-size-card-title);
}

/* .time-option／.time-adjust 的樣式在 app.css，與塗抹時間共用同一份。 */
/* 兩欄固定，與 ApplicationTimePicker 同一組數值——兩者要長得一樣。 */
.time-picker__quick {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

.time-summary {
  color: var(--text-secondary);
}
</style>
