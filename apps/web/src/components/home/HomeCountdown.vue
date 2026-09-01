<script setup lang="ts">
import { computed } from "vue";
import Icon from "../icons/Icon.vue";
import type { HomeReminderClockPresentation } from "../../features/reminder/homeReminderClockPresentation";

/**
 * 首頁的補擦倒數。
 *
 * **平面線性進度條，不是深色面板加進度環**（2026-08-23 裁決）。DESIGN.md
 * 第五節原本規定 `countdown-panel` 是濃縮咖啡深色卡片配 `countdown-ring`；
 * wireframe 改成畫布上的線性進度條，使用者確認採用 wireframe 版本，
 * DESIGN.md 第五、七、十一節已一併回寫。
 *
 * 進度條顏色跟著狀態走（追蹤中／即將到期／已到期），但顏色**永遠搭配
 * 文字標示**——DESIGN.md 第十一節「不要單靠顏色傳達狀態」。剩餘時間、
 * 部位名稱與預計時間都是文字，色彩只是加強。
 *
 * **2026-08-29 補上狀態圖示。** 規則其實是「狀態必須同時有色彩、圖示與
 * 文字」（docs/design/current-direction.md），但這裡一直只有色彩與文字——
 * state-tracking／soon／due 三顆剩餘量計量表圖示畫好了卻沒有任何地方引用。
 * 那組圖示的造型是為了這個位置收斂的（icon-system README 第十節記了五個
 * 被否決的概念），格數承載意義，灰階與色盲情況下仍可區分。
 *
 * 狀態切換是這個 App 最重要的一刻——時間跨過補擦門檻。原本它是硬切：
 * 只有進度條寬度有 transition，顏色與文字瞬間變。現在圖示交叉淡入、
 * 顏色也跟著過渡，用 --duration-slow 而不是 --duration-base，因為這不是
 * 回應手指的操作，是自己發生的事，慢一點才讀得到。
 */

const props = defineProps<{
  presentation: HomeReminderClockPresentation;
}>();

/** 沒有可信期限時 progressPercent 為 null，此時不畫進度條而不是畫 0%。 */
const hasProgress = computed(() => props.presentation.progressPercent !== null);

const toneClass = computed(() => `countdown--${props.presentation.tone}`);

/**
 * tone 的三個值跟圖示 id 是 1:1 的，但仍然明寫成對照表而不是字串拼接——
 * 拼接會讓 IconName 的字面量聯集失效，之後改名也不會被 typecheck 抓到。
 */
const STATE_ICON = {
  tracking: "state-tracking",
  soon: "state-soon",
  due: "state-due"
} as const;

const stateIcon = computed(() => STATE_ICON[props.presentation.tone]);
</script>

<template>
  <section class="countdown" :class="toneClass" data-testid="home-countdown">
    <p class="countdown__eyebrow">補擦倒數</p>

    <!--
      2026-08-31：狀態圖示從說明那一行搬到讀數旁邊，並從 20px 放大到 32px。

      使用者回報「提醒頁太空」「圖示都太小了」。20px 的圖示夾在 16px 的
      說明文字裡，讀起來是標點符號而不是狀態——而狀態切換（時間跨過補擦
      門檻）是這個 App 最重要的一刻。放在讀數旁邊，它才跟它描述的東西同一
      個量級。

      仍然只有一顆，不是兩個位置各放一顆：同一件事講兩次會稀釋掉它。
    -->
    <div class="countdown__value">
      <Transition name="countdown-state" mode="out-in">
        <Icon
          :key="presentation.tone"
          :name="stateIcon"
          :size="32"
          class="countdown__state-icon"
        />
      </Transition>
      <span class="stat-figure stat-figure--display countdown__figure">
        {{ presentation.remainingMinutes }}
      </span>
      <span class="countdown__unit">分鐘</span>
    </div>

    <!--
      2026-08-30：進度條移到讀數正下方，排在說明文字之前。
      原本順序是 讀數 → 說明 → 進度條 →（頁面的）主行動按鈕，進度條夾在
      說明與按鈕之間，視覺上讀起來像按鈕的裝飾條。它描述的是倒數，貼著
      它描述的數字才對。
    -->
    <div
      v-if="hasProgress"
      class="countdown__track"
      role="progressbar"
      :aria-valuenow="presentation.progressPercent ?? 0"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="`距離補擦還有 ${presentation.remainingMinutes} 分鐘`"
    >
      <div
        class="countdown__fill"
        :style="{ width: `${presentation.progressPercent}%` }"
      />
    </div>

    <p class="countdown__detail">
      <span>{{ presentation.title }}・{{ presentation.timeLabel }}</span>
    </p>

    <!--
      2026-08-31：水上活動進行中時，倒數底下多一道波浪與一句說明。

      **這是波浪在整個 App 裡唯一的非衛教用途**（使用者裁決）。它不是裝飾：
      這段時間的倒數是照防曬乳的耐水標示在算，不是一般的補擦間隔——規則
      不一樣，而畫面上原本沒有任何地方說得出這件事。

      文案寫「耐水規則」而不是「耐水標示」：標示沒說耐水多久時（reducer 的
      WATER_RESISTANCE_UNKNOWN）這裡一樣會出現，那時並沒有一個標示數字可以
      依據——規則仍然適用，只是結果是「不計時」，細節由「各部位狀態」的
      「抗水標示不明」那一則負責說明。

      波浪與文字一起出現，不單獨承載資訊（DESIGN.md 第十一節「不要單靠
      顏色／圖形傳達狀態」）。波浪本身 aria-hidden，文字才是無障礙的內容。
    -->
    <p v-if="presentation.inWater" class="countdown__water">
      <span class="wave-divider countdown__water-wave" aria-hidden="true" />
      水上活動進行中，補擦時間改依耐水規則計算。
    </p>
  </section>
</template>

<style scoped>
.countdown {
  display: grid;
  gap: var(--space-2);
}

.countdown__eyebrow {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}

.countdown__value {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
}

.countdown__unit {
  padding-bottom: 0.375rem;
  color: var(--text-secondary);
  font-size: var(--font-size-body);
}

.countdown__detail {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--font-size-body);
}

.countdown__water {
  display: grid;
  justify-items: start;
  gap: var(--space-2);
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  line-height: var(--line-height-body);
}

/* 這裡的波浪比衛教長文那條窄一些——它是行內的標記，不是章節分隔。 */
.countdown__water-wave {
  width: 4rem;
}

/*
 * 圖示繼承 --tone-color。狀態圖示是單色的（icon-system README 第二節），
 * 就是為了這種情境——一份幾何走遍所有狀態，顏色由外層語意色決定。
 */
.countdown__state-icon {
  flex: none;
  /*
   * 讀數是 display 級的大字，字框比數字本身高出一截（上緣留給沒有出現的
   * 注音與拉丁字母 ascender）。整列是 align-items: flex-end，圖示會貼齊
   * 字框底部，看起來就偏低——往上推 8px 之後圖示中心對到數字的視覺中心。
   *
   * 實測（瀏覽器量的，不是估的）：圖示中心 155px、數字字框中心 150px、
   * 數字本身的中心約 151px。
   */
  margin-bottom: 0.5rem;
  color: var(--tone-color, var(--color-tracking));
  transition: color var(--duration-slow) var(--ease-out);
}

.countdown-state-enter-active,
.countdown-state-leave-active {
  transition: opacity var(--duration-slow) var(--ease-out);
}

.countdown-state-enter-from,
.countdown-state-leave-to {
  opacity: 0;
}

.countdown__track {
  height: 8px;
  margin-top: var(--space-2);
  border-radius: var(--radius-xs);
  background: var(--color-surface-card);
  overflow: hidden;
}

.countdown__fill {
  height: 100%;
  background: var(--tone-color, var(--color-tracking));
  transition:
    width var(--duration-base) var(--ease-out),
    background-color var(--duration-slow) var(--ease-out);
}

.countdown--tracking {
  --tone-color: var(--color-tracking);
}

.countdown--soon {
  --tone-color: var(--color-soon);
}

.countdown--due {
  --tone-color: var(--color-due);
}

@media (prefers-reduced-motion: reduce) {
  .countdown__fill,
  .countdown__state-icon,
  .countdown-state-enter-active,
  .countdown-state-leave-active {
    transition: none;
  }
}
</style>
