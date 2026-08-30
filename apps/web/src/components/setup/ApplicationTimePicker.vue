<script setup lang="ts">
import { computed, shallowRef, useId } from "vue";

/**
 * 塗抹時間：一個預設快選加一個手動調整入口。
 *
 * **調整史（避免又反覆橫跳）**
 *
 * 1. 原本是四個快選（剛剛／15／30／1 小時前）＋ datetime-local 自訂欄位，
 *    每個選項下方還標絕對時刻。
 * 2. 2026-08-24 使用者裁決移除自訂時間與絕對時刻，只留四個快選——理由是
 *    「這頁的第一考量是當計時器用，選項愈少、文字愈少愈好」。
 * 3. 2026-08-30 使用者裁決（B 批，裁決 2A）改成兩個入口：預設「1 分鐘前」
 *    ＋「調整時間」。**這一步把第 2 點移除的自訂時間加了回來**，是明知的
 *    反轉：四個快選佔 249px，是這頁第三高的區塊，而多數人開這頁就是剛擦
 *    完，其餘情況交給手動調整更省版面。
 *
 * 手動調整用 datetime-local 而不是「輸入幾分鐘前」的數字欄：使用者可能
 * 不確定該填分鐘、時間長度還是時刻，時間選擇器沒有這個歧義。
 *
 * 調整欄位是**就地展開**，不是 bottom sheet。一個欄位不需要 modal——不必
 * 攔截焦點、不必蓋住整頁，也少一層可能出錯的浮層。「輸入框不要常駐」的
 * 需求靠展開收合就足夠。
 */

const value = defineModel<string | null>({ required: true });

const referenceNow = new Date();
const DEFAULT_MINUTES_AGO = 1;

const adjusting = shallowRef(false);
const draftLocalValue = shallowRef("");
/** aria-controls 需要穩定 id；同頁可能有多個實例，用 useId 不寫死。 */
const adjustPanelId = useId();

function isoFor(minutesAgo: number): string {
  return new Date(referenceNow.getTime() - minutesAgo * 60_000).toISOString();
}

/** datetime-local 需要不含時區的本地字串。 */
function toLocalInputValue(date: Date): string {
  const pad = (part: number): string => String(part).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

const selectedAt = computed(() =>
  value.value === null ? null : new Date(Date.parse(value.value))
);

/** 目前選的時間距離現在幾分鐘（四捨五入到分鐘）。 */
const minutesAgo = computed(() => {
  const at = selectedAt.value;
  if (at === null) return null;
  return Math.round((referenceNow.getTime() - at.getTime()) / 60_000);
});

/** 預設快選是否正在生效——允許幾秒誤差，避免時鐘跳動造成閃爍。 */
const usingDefault = computed(() => {
  const at = selectedAt.value;
  if (at === null) return false;
  return Math.abs(at.getTime() - (referenceNow.getTime() - 60_000)) < 30_000;
});

const adjustedLabel = computed(() => {
  const minutes = minutesAgo.value;
  if (minutes === null || usingDefault.value) return null;
  if (minutes < 1) return "剛剛";
  if (minutes < 60) return `${minutes} 分鐘前`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} 小時前` : `${hours} 小時 ${rest} 分鐘前`;
});

function selectDefault(): void {
  value.value = isoFor(DEFAULT_MINUTES_AGO);
}

function toggleAdjust(): void {
  if (adjusting.value) {
    adjusting.value = false;
    return;
  }
  draftLocalValue.value = toLocalInputValue(
    selectedAt.value ?? new Date(referenceNow.getTime() - 60_000)
  );
  adjusting.value = true;
}

function applyAdjustment(): void {
  if (draftLocalValue.value === "") return;
  const parsed = Date.parse(draftLocalValue.value);
  if (Number.isNaN(parsed)) return;
  value.value = new Date(parsed).toISOString();
  adjusting.value = false;
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
        class="time-option app-card"
        :class="{ 'option-selected': usingDefault }"
        type="button"
        @click="selectDefault"
      >
        <span class="time-option__label">
          <span class="stat-figure stat-figure--inline">1</span>
          分鐘前
        </span>
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
      <label class="time-adjust__field">
        <span>實際塗抹時間</span>
        <input
          v-model="draftLocalValue"
          type="datetime-local"
          :max="toLocalInputValue(referenceNow)"
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

    <!-- 調整後要看得出目前選了什麼，否則按鈕上只寫「調整時間」等於沒有回饋。 -->
    <p
      v-else-if="adjustedLabel !== null"
      class="time-picker__result"
      role="status"
    >
      已調整為 {{ adjustedLabel }}
    </p>
  </fieldset>
</template>

<style scoped>
/*
 * 2026-08-24：這張卡原本自己刻了一整套 fieldset＋legend＋說明的版面
 * （legend 用 clamp(0.95rem, 4vw, 1.05rem) 魔術數字、靠負的 margin-bottom
 * 補間距、又重寫一次 app-card 已經提供的 border），跟正下方結構完全相同的
 * SunscreenClaimQuickQuestion 長得不一樣——那張用的是共用的 .question-card。
 * （那個元件已於 2026-08-30 移除；共用類別的結論不變。）
 * 同一頁兩張同構的卡片標題大小與間距不同，就是「排版像舊實作」的來源。
 * 改用共用的 .question-card，這裡只留這張卡特有的東西。
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
  transition:
    background-color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out);
}

/* 理由同 app.css 的 .choice-grid label:hover——避免 hover 跟已選取同色。 */
.time-option:hover {
  background-color: var(--color-hairline-soft);
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

.time-picker__result {
  margin: 0;
  color: var(--text-secondary);
  line-height: var(--line-height-body);
}

.time-adjust {
  display: grid;
  gap: var(--space-3);
  justify-items: start;
}

.time-adjust__field {
  display: grid;
  gap: var(--space-2);
  width: 100%;
}
</style>
