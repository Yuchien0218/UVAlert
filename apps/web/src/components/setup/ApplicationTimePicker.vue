<script setup lang="ts">
import { computed, shallowRef, useId } from "vue";
import {
  APPLICATION_MAX_MINUTES_AGO,
  describeTooLongAgo,
  minutesAgo as minutesBetween
} from "../../features/setup/timeEntryCaps";

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

/**
 * 2026-08-31：錯誤改由這張卡自己顯示（使用者要求）。
 *
 * 原本沒填塗抹時間時，「請確認這次實際的塗抹時間。」印在頁面**最下方**的
 * 錯誤區——離出問題的欄位有整整一個畫面遠，使用者的原話是「不然使用者
 * 不知道哪裡沒寫」。訊息現在跟著欄位走，卡片同時上紅框。
 *
 * 這是 WCAG 3.3.1（錯誤要指出是哪一項）與 3.3.3（要說怎麼修）的基本做法。
 */
const props = defineProps<{ error?: string | null }>();

const value = defineModel<string | null>({ required: true });

/** 錯誤訊息的 id：欄位群用 aria-describedby 指過來，關係才是真的。 */
const errorId = useId();

/** 讓 SetupPage 在送出失敗時把焦點送進來——捲到定位還不夠，鍵盤要能接上。 */
const defaultButton = shallowRef<HTMLButtonElement | null>(null);
defineExpose({
  focus(): void {
    defaultButton.value?.focus();
  }
});

/**
 * 這個選擇器的「現在」。
 *
 * **2026-09-02：改成在互動當下重新取樣，不再凍結在掛載那一刻。**
 *
 * 改動前是 `const referenceNow = new Date()`，於是頁面開著愈久偏得愈多：
 *
 * - 「1 分鐘前」實際上是「開頁前一分鐘」，開著十分鐘就變成十一分鐘前
 * - `max` 停在開頁那一刻，**選不了比開頁更晚的時間**
 *
 * **刻意不用 ticker。** `useCurrentTime` 那類每秒跳動的時鐘會讓畫面在使用者
 * 眼前漂移：選了「1 分鐘前」之後放著不動，過一分鐘就會自己變成「已調整為
 * 2 分鐘前」、選取高亮還會跳到另一顆——使用者什麼都沒做，畫面卻在變。
 *
 * 只在**使用者動作的當下**重新取樣（按快選、展開調整面板），兩個真正壞掉的
 * 行為就都好了，而且沒有任何東西會自己動。
 *
 * 已知的殘留：展開面板之後放很久才選，`max` 會是展開當下的值。那時送出仍有
 * 控制器的「不能晚於目前時間」把關，不會寫進未來的時間。
 */
const referenceNow = shallowRef(new Date());

/** 在使用者動作的當下把「現在」對回真正的現在。 */
function syncNow(): void {
  referenceNow.value = new Date();
}
const DEFAULT_MINUTES_AGO = 1;

const adjusting = shallowRef(false);
const draftLocalValue = shallowRef("");
/** aria-controls 需要穩定 id；同頁可能有多個實例，用 useId 不寫死。 */
const adjustPanelId = useId();

function isoFor(minutesAgo: number): string {
  return new Date(
    referenceNow.value.getTime() - minutesAgo * 60_000
  ).toISOString();
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
  return Math.round((referenceNow.value.getTime() - at.getTime()) / 60_000);
});

/** 預設快選是否正在生效——允許幾秒誤差，避免時鐘跳動造成閃爍。 */
const usingDefault = computed(() => {
  const at = selectedAt.value;
  if (at === null) return false;
  return (
    Math.abs(at.getTime() - (referenceNow.value.getTime() - 60_000)) < 30_000
  );
});

/**
 * 超過上限時的提示（2026-08-31 裁決 #9）。
 *
 * **不擋輸入**：超過 120 分鐘時真正的下一步是重新塗抹，不是把一個已經
 * 失效的時間記進去。硬擋會讓使用者卡在表單裡填不出任何值。datetime-local
 * 的 min 只是讓瀏覽器的選擇器先收窄，手動打字繞過時由這句話接住。
 */
const tooLongAgoNotice = computed(() => {
  const at = selectedAt.value;
  if (at === null) return null;
  return describeTooLongAgo(
    minutesBetween(at, referenceNow.value),
    APPLICATION_MAX_MINUTES_AGO,
    "application"
  );
});

const earliestLocalValue = computed(() =>
  toLocalInputValue(
    new Date(
      referenceNow.value.getTime() - APPLICATION_MAX_MINUTES_AGO * 60_000
    )
  )
);

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
  syncNow();
  value.value = isoFor(DEFAULT_MINUTES_AGO);
}

function toggleAdjust(): void {
  if (adjusting.value) {
    adjusting.value = false;
    return;
  }
  syncNow();
  draftLocalValue.value = toLocalInputValue(
    selectedAt.value ?? new Date(referenceNow.value.getTime() - 60_000)
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
  <fieldset
    class="time-picker question-card app-card"
    :class="{ 'time-picker--invalid': props.error }"
    :aria-describedby="props.error ? errorId : undefined"
  >
    <legend>塗抹時間</legend>
    <p class="question-card__helper">
      請選擇實際塗抹時間。系統會以此重新計算提醒狀態。
    </p>

    <!--
      訊息放在選項**上方**：由上往下讀時，先知道這裡出了什麼事，再看到要
      操作的東西。放在下方的話，使用者已經看完選項才被告知「剛剛那個要填」。
    -->
    <p v-if="props.error" :id="errorId" class="time-picker__error" role="alert">
      {{ props.error }}
    </p>

    <div class="time-picker__quick">
      <button
        ref="defaultButton"
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

    <div v-if="adjusting" :id="adjustPanelId" class="time-adjust">
      <label class="time-adjust__field">
        <span>實際塗抹時間</span>
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

    <p v-if="tooLongAgoNotice !== null" class="time-picker__cap" role="alert">
      {{ tooLongAgoNotice }}
    </p>

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
/*
 * `.time-picker--invalid`／`.time-picker__error` 2026-09-03 移到 app.css。
 * 入水時間選擇器也要同一套紅框與警示文字，留在 scoped 裡它會完全吃不到
 * ——理由同 2026-08-31 把 `.time-option`／`.time-adjust` 搬出去那次。
 */

.time-picker__cap {
  margin: 0;
  color: var(--color-due);
  font-size: var(--font-size-supporting);
  line-height: var(--line-height-body);
}

.time-picker__quick {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

/* .time-option／.time-adjust 2026-08-31 移到 app.css——入水時間選擇器
   改成同一個形狀之後它們變成兩個元件共用，留在 scoped style 裡的話
   WaterStartPicker 會完全吃不到。 */

.time-picker__result {
  margin: 0;
  color: var(--text-secondary);
  line-height: var(--line-height-body);
}
</style>
