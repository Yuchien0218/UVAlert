<script setup lang="ts">
import type { FiveDayUvForecast, UvRiskLevel } from "@sunshield/contracts";
import Icon from "../icons/Icon.vue";
import type {
  UvForecastError,
  UvForecastPhase
} from "../../features/uv/createUvForecastController";
import { getUvRiskLevelLabel } from "../../features/uv/uvForecastRules";
import {
  formatDate,
  formatMonthDayTime,
  formatWeekday
} from "../../helpers/datetime";

interface Props {
  phase: UvForecastPhase;
  error: UvForecastError;
  forecast: FiveDayUvForecast | null;
}

defineProps<Props>();

const emit = defineEmits<{
  refresh: [];
}>();

function toLocalDate(localDate: string): Date {
  const [year, month, day] = localDate.split("-").map((part) => Number(part));
  /* 正午：避開日光節約與時區換算把日期推到前後一天。 */
  return new Date(year!, month! - 1, day!, 12);
}

/** 今天的本地日期，格式與預報的 `localDate` 相同。 */
function todayLocalDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * 卡片上顯示的日子（2026-09-04 使用者要求：「改成今天、週一、週二」）。
 *
 * 原本是「9/4」這種月／日。五天全部是月日的話，要先在心裡把數字換算成
 * 「這是後天」；改成星期之後那一步就不必做了。
 *
 * **第一格用「今天」而不是它的星期**：星期名回答的是「哪一天」，而第一格
 * 使用者真正要問的是「現在」。
 *
 * 判斷用日期字串比對，不是用陣列索引——預報可能是昨天存下來、今天離線時
 * 讀出來的快取，那時第一格並不是今天。
 */
function forecastDayLabel(localDate: string): string {
  return localDate === todayLocalDate()
    ? "今天"
    : formatWeekday(toLocalDate(localDate));
}

function formatUpdatedAt(instant: string): string {
  return formatMonthDayTime(instant, { timeZone: "Asia/Taipei" });
}

/**
 * 等級名稱轉成 class 後綴：`very_high` → `very-high`。
 *
 * **2026-09-04：兩個地方共用同一個函式，因為它們曾經漂移。** 卡片外框走
 * 這裡（有 `replace`），等級藥丸卻在模板裡直接內插 `riskLevel`——於是
 * `very_high` 產生 `uv-day__level-badge--very_high`，而 CSS 寫的是
 * `--very-high`。結果「過量級」那一顆完全沒有底色，變成一段裸文字
 * （實測 `background-color: rgba(0, 0, 0, 0)`）。
 *
 * 五個等級裡只有 `very_high` 帶底線，所以另外四個一直是對的——這也是它
 * 能活這麼久的原因。
 */
function riskSuffix(riskLevel: UvRiskLevel): string {
  return riskLevel.replace("_", "-");
}

function riskClass(riskLevel: UvRiskLevel): string {
  return `uv-day--${riskSuffix(riskLevel)}`;
}

function levelBadgeClass(riskLevel: UvRiskLevel): string {
  return `uv-day__level-badge--${riskSuffix(riskLevel)}`;
}

function getUnavailableMessage(error: UvForecastError): string {
  switch (error) {
    case "offline":
      return "目前離線，且這台裝置沒有仍可使用的五日預報。";
    case "storage_error":
      return "目前無法讀取已儲存的地區與預報資料。";
    case "network_error":
      return "暫時無法取得中央氣象署五日預報。";
    case "no_usable_data":
      return "目前沒有仍在有效時段內的五日 UV 預報。";
    case null:
      return "目前沒有可顯示的五日 UV 預報。";
  }
}
</script>

<template>
  <section
    id="five-day-uv"
    class="uv-forecast"
    aria-label="未來五日 UV 預報"
  >
    <!--
      2026-08-31：拿掉卡片自己的 h2。這張卡只用在 /forecast，而那一頁的
      h1 已經是「五日 UV 預報」——兩個標題講同一件事，使用者回饋重複。
      無障礙名稱改用 aria-label 掛在 section 上，語意不受影響。
    -->
    <div class="uv-forecast__heading">
      <Icon name="feature-uv-forecast" :size="24" />
    </div>

    <div
      v-if="phase === 'idle' || phase === 'loading'"
      class="uv-forecast__state"
      role="status"
    >
      <strong>正在讀取白日時段預報…</strong>
      <span>不會影響目前的本機補擦提醒。</span>
    </div>

    <div v-else-if="phase === 'no_region'" class="uv-forecast__state">
      <span>
        請先
        <RouterLink class="text-link" to="/region">設定地區</RouterLink>
        ，才能查看五日 UV 預報。
      </span>
    </div>

    <div
      v-else-if="phase === 'unavailable' || forecast === null"
      class="uv-forecast__state uv-forecast__state--error"
      role="status"
    >
      <strong>五日 UV 暫時無法顯示</strong>
      <span>{{ getUnavailableMessage(error) }}</span>
      <button
        class="button button--quiet uv-forecast__retry"
        type="button"
        @click="emit('refresh')"
      >
        <Icon name="tool-refresh" :size="20" />
        再試一次
      </button>
    </div>

    <template v-else>
      <div class="uv-forecast__meta">
        <strong>{{ forecast.region.displayName }}</strong>
        <span v-if="phase === 'cached'" class="uv-forecast__badge">
          已儲存資料
        </span>
        <span v-else class="uv-forecast__badge"> 地區預報 </span>
      </div>

      <ol class="uv-forecast__days" aria-label="未來五日白日時段紫外線預報">
        <li
          v-for="day in forecast.days"
          :key="day.localDate"
          class="uv-day"
          :class="riskClass(day.riskLevel)"
        >
          <!--
            `stat-figure`（等寬數字）拿掉了：這一格現在是「今天／週四」，
            沒有數字要對齊。完整日期留給螢幕閱讀器——畫面上省掉的脈絡，
            聽的人本來就沒有旁邊四格可以對照。
          -->
          <span class="uv-day__date">
            <span class="screen-reader-only"
              >{{ formatDate(toLocalDate(day.localDate)) }}
            </span>
            {{ forecastDayLabel(day.localDate) }}
          </span>
          <strong class="uv-day__value stat-figure">
            <span class="screen-reader-only">紫外線指數</span>
            {{ day.uvi }}
          </strong>
          <span
            class="uv-day__level-badge"
            :class="levelBadgeClass(day.riskLevel)"
            :aria-label="`風險等級：${getUvRiskLevelLabel(day.riskLevel)}`"
          >
            {{ getUvRiskLevelLabel(day.riskLevel) }}
          </span>
        </li>
      </ol>

      <!--
        2026-08-31：更新時間不再換行（使用者要求）。

        原本「更新時間」與時間值是兩個巢狀的 span，時間那層用 stat-figure
        （等寬數字），兩者之間有換行機會，實測就是斷成兩行。改成同一個
        span 並禁止在中間斷行——「更新時間 9/1 14:23」是一個詞組。
      -->
      <p class="uv-forecast__source">
        {{ forecast.sourceDisplayName }}・日間紫外線預報
        <span class="uv-forecast__updated">
          更新時間
          <span class="uv-forecast__updated-at stat-figure">{{
            formatUpdatedAt(forecast.fetchedAt)
          }}</span>
        </span>
      </p>
    </template>
  </section>
</template>

<style scoped>
.uv-forecast {
  display: grid;
  gap: var(--space-5);
  padding-top: var(--space-5);
  border-top: 1px solid var(--border-subtle);
  scroll-margin-top: var(--space-6);
}

.uv-forecast__heading,
.uv-forecast__meta {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: var(--space-4);
}

.uv-forecast__title {
  margin: 0;
  font-size: var(--font-size-section-title);
}

.uv-forecast__state {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
  color: var(--text-secondary);
  line-height: var(--line-height-body);
}

.uv-forecast__state strong,
.uv-forecast__meta strong {
  display: block;
  margin: 0;
  color: var(--text-primary);
  font-weight: 600;
  font-size: var(--font-size-body);
  line-height: 1.4;
}

.uv-forecast__state span {
  display: block;
  font-size: var(--font-size-body);
}

.uv-forecast__state--error strong {
  color: var(--color-due);
}

/* 不要在這裡寫 min-height：.button 已經帶 min-height: var(--tap-target)，
   區域覆寫只會把點擊目標壓到 44px 以下（先前是 2.5rem = 40px）。 */
.uv-forecast__retry {
  padding: var(--space-3) var(--space-4);
  font-size: var(--font-size-body);
  font-weight: 500;
}

.uv-forecast__meta {
  align-items: center;
}

.uv-forecast__badge {
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  white-space: nowrap;
}

.uv-forecast__days {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--space-2);
  padding: 0;
  margin: 0;
  list-style: none;
}

.uv-day {
  display: grid;
  grid-template-rows: auto 1fr auto;
  justify-items: center;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-4) var(--space-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--surface-primary);
  text-align: center;
  /*
   * 只有 border-color 會變（uv-day--* 等級色）；all 會連帶動到之後新增的
   * 任何屬性，見 DESIGN.md 第十二節。
   */
  transition: border-color var(--duration-fast) var(--ease-out);
}

/*
 * 2026-09-04 拿掉 `.uv-day:hover { border-color: var(--text-secondary) }`。
 *
 * 兩個問題：
 *
 *   1. **它是假的可點提示。** 這是 <li>，沒有 click、沒有連結、沒有
 *      cursor: pointer——滑過會亮起來，按下去什麼都不會發生。
 *   2. **它會蓋掉資訊。** `.uv-day:hover` 的特異性 (0,2,0) 高過
 *      `.uv-day--low` 那組 (0,1,0)，所以滑過的那一天**風險等級的邊框色
 *      會被中性灰換掉**——邊框在這裡是承載等級的，不是裝飾。
 */

.uv-day--low {
  border-color: var(--color-uvi-low);
}

.uv-day--moderate {
  border-color: var(--color-uvi-moderate);
}

.uv-day--high {
  border-color: var(--color-uvi-high);
}

.uv-day--very-high {
  border-color: var(--color-uvi-very-high);
}

.uv-day--extreme {
  border-color: var(--color-uvi-extreme);
}

/*
 * 2026-08-31：日期改回正常流排，置中。
 *
 * 原本是 position: absolute 貼在右上角，於是三個元素讀起來不是一個由上
 * 到下的層級（日期 → 數字 → 等級），而是「一個浮在角落的日期」加「兩個
 * 置中的東西」——數字看起來也因此偏離卡片的視覺中心。使用者回饋「框框內
 * 的日期／UV 指數／等級排版要調整」指的就是這個。
 *
 * 尺寸關係不變：日期最小、數字最大、等級居中。
 */
.uv-day__date {
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  font-weight: 500;
  line-height: 1;
}

.uv-day__value {
  font-size: clamp(1.8rem, 8vw, 2.5rem);
  font-weight: 600;
  line-height: 1;
}

.uv-day__level-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  padding: 0 var(--space-2);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-caption);
  font-weight: 600;
  white-space: nowrap;
}

.uv-day__level-badge--low {
  background: var(--color-uvi-low);
  color: var(--text-inverse);
}

.uv-day__level-badge--moderate {
  background: var(--color-uvi-moderate);
  color: var(--text-inverse);
}

.uv-day__level-badge--high {
  background: var(--color-uvi-high);
  color: var(--text-inverse);
}

.uv-day__level-badge--very-high {
  background: var(--color-uvi-very-high);
  color: var(--text-inverse);
}

.uv-day__level-badge--extreme {
  background: var(--color-uvi-extreme);
  color: var(--text-inverse);
}

/*
 * 來源與預報註記屬 supporting role；CJK 行高維持 1.5。
 */
.uv-forecast__source,
.uv-forecast__note {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-supporting);
  line-height: var(--line-height-caption);
}

/*
 * 2026-08-31：改成 `> span`（直接子代）。
 *
 * 原本是後代選擇器，所以「更新時間」外層與裡面那層 stat-figure **兩個都
 * 變成 block**——時間值因此被推到下一行，畫面上就是使用者截圖裡的兩行。
 * 外層要 block（它本來就自成一行），裡面那層必須留在行內。
 */
/*
 * 「更新時間」自成一行。
 *
 * 2026-09-04：補上一個 space-1 的上距。這兩行是**兩件事**——一行說資料
 * 從哪裡來、一行說它多新——貼著排時讀起來像第一句折行。行距 21px 之間
 * 再加 4px，剛好讓它們分開又不散開。
 */
.uv-forecast__source > span {
  display: block;
  margin-top: var(--space-1);
  white-space: nowrap;
}

@media (max-width: 24rem) {
  .uv-forecast__days {
    gap: var(--space-2);
  }

  .uv-day {
    padding: var(--space-3) var(--space-1);
    gap: var(--space-2);
  }

  .uv-day__date {
    font-size: 0.7rem;
  }

  .uv-day__value {
    font-size: clamp(1.5rem, 6vw, 2rem);
  }

  .uv-day__level-badge {
    min-width: 1.75rem;
    height: 1.75rem;
    font-size: 0.65rem;
  }
}
</style>
