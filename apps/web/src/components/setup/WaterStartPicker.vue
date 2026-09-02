<script setup lang="ts">
import { computed, shallowRef, useId } from "vue";
import type { WaterStartFormValue } from "../../features/setup/createSetupController";
import {
  describeTooLongAgo,
  minutesAgo as minutesBetween,
  WATER_START_MAX_MINUTES_AGO
} from "../../features/setup/timeEntryCaps";

/**
 * 入水時間。
 *
 * **2026-08-31 改成與「塗抹時間」同一個形狀**（使用者裁決）。原本是三顆
 * 藥丸（剛剛入水／約 15 分鐘前／不確定）＋一個**常駐**的 datetime-local
 * 欄位；現在是「1 分鐘前」＋「調整時間」兩顆，調整欄位就地展開，跟
 * `ApplicationTimePicker` 一致。同一頁兩個時間輸入長得不一樣，本來就是
 * 使用者反映「跑版」的來源之一。
 *
 * **「不確定」保留，而且是刻意的。** 它對應 `confidence: "unknown"`，
 * reducer 會走保守路徑而不猜測入水時間。拿掉它等於逼使用者猜一個時間，
 * 那比誠實地說不知道更糟。
 *
 * 上限 80 分鐘的理由見 `timeEntryCaps.ts`：那是耐水標示的最大級距，超過
 * 之後連標示最強的防曬乳都已經失效，該做的是補擦而不是記錄。
 */

const value = defineModel<WaterStartFormValue | null>({
  required: true
});

/**
 * 這次提醒的塗抹時間。
 *
 * **2026-09-02 新增（使用者回報）。** 在這之前這個元件不知道塗抹時間，
 * 於是可以選出「入水早於塗抹」——實測填得出「塗抹 4 分鐘前 ＋ 入水 59
 * 分鐘前」而毫無阻攔，那在物理上不可能。
 *
 * 表單層讓它選不到，控制器層再擋一次手動打字（`validateWaterStart`）。
 * 兩層都要：`min` 只收窄瀏覽器的選擇器，打字繞得過去。
 */
const props = defineProps<{ appliedAt?: string | null }>();

const referenceNow = new Date();
const DEFAULT_MINUTES_AGO = 1;

const adjusting = shallowRef(false);
const draftLocalValue = shallowRef("");
/** aria-controls 需要穩定 id；同頁可能有多個實例，用 useId 不寫死。 */
const adjustPanelId = useId();

/** datetime-local 需要不含時區的本地字串。 */
function toLocalInputValue(date: Date): string {
  const pad = (part: number): string => String(part).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

const selectedAt = computed(() =>
  value.value?.activityStartedAt == null
    ? null
    : new Date(Date.parse(value.value.activityStartedAt))
);

const isUnknown = computed(() => value.value?.confidence === "unknown");

/** 預設快選是否正在生效——允許幾秒誤差，避免時鐘跳動造成閃爍。 */
const usingDefault = computed(() => {
  const at = selectedAt.value;
  if (at === null) return false;
  return Math.abs(at.getTime() - (referenceNow.getTime() - 60_000)) < 30_000;
});

const adjustedLabel = computed(() => {
  const at = selectedAt.value;
  if (at === null || usingDefault.value) return null;
  const minutes = minutesBetween(at, referenceNow);
  if (minutes < 1) return "剛剛";
  if (minutes < 60) return `${minutes} 分鐘前`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} 小時前` : `${hours} 小時 ${rest} 分鐘前`;
});

/**
 * 超過上限時的提示。**不擋輸入**——超過 80 分鐘時真正的下一步是補擦，
 * 不是把一個已經失效的時間記進去。`min` 只是讓瀏覽器的選擇器先收窄，
 * 手動打字繞過時由這句話接住。
 */
const tooLongAgoNotice = computed(() => {
  const at = selectedAt.value;
  if (at === null) return null;
  return describeTooLongAgo(
    minutesBetween(at, referenceNow),
    WATER_START_MAX_MINUTES_AGO,
    "water_start"
  );
});

/**
 * 可選的最早入水時間。
 *
 * 兩個下限取**較晚**的那個：耐水上限（80 分鐘）與塗抹時間。塗抹之後才
 * 可能入水，所以塗抹時間比 80 分鐘上限晚時，它才是真正的下限。
 *
 * 塗抹時間進位到下一分鐘：`datetime-local` 的精度只到分鐘，直接取整會
 * 讓「14:27:45 塗抹」允許選到 14:27:00——比塗抹早 45 秒，畫面允許但控制器
 * 會擋，那種前後不一致比擋不住更難懂。
 */
const earliestSelectable = computed(() => {
  const cap = referenceNow.getTime() - WATER_START_MAX_MINUTES_AGO * 60_000;
  const applied = props.appliedAt == null ? null : Date.parse(props.appliedAt);
  if (applied === null || !Number.isFinite(applied)) return new Date(cap);
  return new Date(Math.max(cap, Math.ceil(applied / 60_000) * 60_000));
});

const earliestLocalValue = computed(() =>
  toLocalInputValue(earliestSelectable.value)
);

/**
 * 快選的預設值也要夾在塗抹時間之後。
 *
 * 塗抹不到一分鐘前時，「1 分鐘前」入水在字面上就是不可能的；夾到塗抹
 * 當下等於「擦完就下水」，是那個情境下唯一說得通的解讀。
 */
function selectDefault(): void {
  const selected = new Date(
    Math.max(
      referenceNow.getTime() - DEFAULT_MINUTES_AGO * 60_000,
      earliestSelectable.value.getTime()
    )
  );
  value.value = {
    confidence: "confirmed",
    activityStartedAt: selected.toISOString()
  };
  adjusting.value = false;
}

function selectUnknown(): void {
  value.value = { confidence: "unknown", activityStartedAt: null };
  adjusting.value = false;
}

function toggleAdjust(): void {
  if (adjusting.value) {
    adjusting.value = false;
    return;
  }
  draftLocalValue.value = toLocalInputValue(
    selectedAt.value ??
      new Date(
        Math.max(
          referenceNow.getTime() - 60_000,
          earliestSelectable.value.getTime()
        )
      )
  );
  adjusting.value = true;
}

function applyAdjustment(): void {
  if (draftLocalValue.value === "") return;
  const parsed = Date.parse(draftLocalValue.value);
  if (Number.isNaN(parsed)) return;
  value.value = {
    confidence: "confirmed",
    activityStartedAt: new Date(parsed).toISOString()
  };
  adjusting.value = false;
}
</script>

<template>
  <fieldset class="water-start question-card app-card">
    <legend>實際何時開始入水？</legend>
    <p class="question-card__helper">
      若無法確認，可以選擇不確定；系統會保守處理，不會猜測入水時間。
    </p>

    <div class="water-start__quick">
      <button
        class="time-option app-card"
        :class="{ 'option-selected': usingDefault }"
        type="button"
        @click="selectDefault"
      >
        <span class="time-option__label">
          <span class="stat-figure">1</span>
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

    <!--
      「不確定」不與上面兩顆併排：它不是「另一個時間」，是「不給時間」。
      放在同一排會讀成三個等價的時間選項。
    -->
    <button
      class="text-link water-start__unknown"
      :class="{ 'water-start__unknown--selected': isUnknown }"
      type="button"
      @click="selectUnknown"
    >
      不確定入水時間
    </button>

    <div v-if="adjusting" :id="adjustPanelId" class="time-adjust">
      <label class="time-adjust__field">
        <span>實際入水時間</span>
        <input
          v-model="draftLocalValue"
          type="datetime-local"
          :min="earliestLocalValue"
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

    <p v-if="tooLongAgoNotice !== null" class="water-start__cap" role="alert">
      {{ tooLongAgoNotice }}
    </p>

    <p v-else-if="isUnknown" class="water-start__result" role="status">
      已選擇不確定，系統會保守處理。
    </p>

    <p
      v-else-if="!adjusting && adjustedLabel !== null"
      class="water-start__result"
      role="status"
    >
      已調整為 {{ adjustedLabel }}
    </p>
  </fieldset>
</template>

<style scoped>
/* 欄位外觀用 app.css 的共用宣告，這裡不再抄一份。 */

.water-start__quick {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

.water-start__unknown {
  justify-self: start;
}

.water-start__unknown--selected {
  color: var(--text-primary);
  font-weight: var(--font-weight-emphasis);
}

.water-start__cap {
  margin: 0;
  color: var(--color-due);
  font-size: var(--font-size-supporting);
  line-height: var(--line-height-body);
}

.water-start__result {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-supporting);
}
</style>
