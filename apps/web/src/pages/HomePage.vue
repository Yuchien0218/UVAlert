<script setup lang="ts">
import type { ActionKind } from "@sunshield/contracts";
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import HomeCountdown from "../components/home/HomeCountdown.vue";
import HomeLinkRow from "../components/home/HomeLinkRow.vue";
import HomeLocationPrompt from "../components/home/HomeLocationPrompt.vue";
import HomeNightNotice from "../components/home/HomeNightNotice.vue";
import HomeNightSession from "../components/home/HomeNightSession.vue";
import HomeUvHeadline from "../components/home/HomeUvHeadline.vue";
import SunLoader from "../components/feedback/SunLoader.vue";
import SessionEndControl from "../components/session/SessionEndControl.vue";
import { useCurrentTime } from "../composables/useCurrentTime";
import { buildHomeReminderClockPresentation } from "../features/reminder/homeReminderClockPresentation";
import { buildReminderPresentation } from "../features/reminder/reminderPresentation";
import { useWebAppServices } from "../app/injection";
import { resolveActionRoute } from "../helpers/resolveActionRoute";

/**
 * 提醒主頁——App 的首屏，五個狀態共用同一個版面骨架。
 *
 * 版面依 2026-08-23 的 wireframe 重做（見 `docs/decisions/
 * 2026-08-23-wireframe-copy-fixes.md`）。與先前實作最關鍵的差異是**資訊
 * 層級對調**：UV 資料從下方的「戶外資訊」卡片提到首屏頂端，倒數與主 CTA
 * 緊接其後，次要入口一律降級成細分隔線連結，不再是同重量的卡片
 * （DESIGN.md 第六節「避免每一塊內容都變成同重量的卡片」）。
 *
 * 五個狀態與各自的主要行動：
 *
 * | 狀態 | 主要行動 |
 * | --- | --- |
 * | 有提醒＋白天 | 記錄補擦 |
 * | 有提醒＋夜間 | 結束提醒 |
 * | 無提醒＋白天＋有地區 | 開始防曬提醒 |
 * | 無提醒＋夜間 | 無主 CTA（理由見 HomeNightNotice） |
 * | 無提醒＋無地區 | 設定地區 |
 */

const { boot, sessionControl, uvForecast } = useWebAppServices();
const router = useRouter();
const currentTime = useCurrentTime();

onMounted(() => {
  void uvForecast.ensureLoaded();
});

const session = computed(() => boot.currentSession.value);
const hasSession = computed(() => session.value !== null);
const isNight = computed(() => uvForecast.isEvening.value);
const hasRegion = computed(() => uvForecast.region.value !== null);

const forecastDays = computed(() => uvForecast.forecast.value?.days ?? []);

/** 依本地日期挑預報。offset 0 是今天、1 是明天。 */
function findDay(offsetDays: number) {
  const target = new Date(currentTime.value);
  target.setDate(target.getDate() + offsetDays);
  const key = [
    target.getFullYear(),
    String(target.getMonth() + 1).padStart(2, "0"),
    String(target.getDate()).padStart(2, "0")
  ].join("-");
  return forecastDays.value.find((day) => day.localDate === key) ?? null;
}

const today = computed(() => findDay(0));
const tomorrow = computed(() => findDay(1));

/**
 * 夜間顯示明日預報，白天顯示今日。
 *
 * 夜間看「今天的 UV」沒有行動價值——今天已經過完了。使用者晚上會想知道
 * 的是明天要不要防曬。
 */
const headlineDay = computed(() =>
  isNight.value ? tomorrow.value : today.value
);

const headlineEyebrow = computed(() =>
  isNight.value ? "明日 UV 預報" : "今日 UV"
);

/**
 * 標題右側的註記。
 *
 * 白天寫「地區預報」——資料是地區預報不是即時測站觀測，必須講清楚，這是
 * `copy-audit.md` 既有的規則。wireframe 原本的「12:00 最強」已移除：CWA
 * 的 `F-D0047-091` 沒有尖峰時段欄位，寫出來會是捏造的。
 *
 * 夜間改成今明對比，這個可以由兩天的 uvi 實際算出來。
 */
const headlineNote = computed<string | null>(() => {
  if (!isNight.value) {
    return headlineDay.value === null ? null : "地區預報";
  }

  const todayUvi = today.value?.uvi;
  const tomorrowUvi = tomorrow.value?.uvi;
  if (todayUvi === undefined || tomorrowUvi === undefined) return null;

  const diff = tomorrowUvi - todayUvi;
  if (diff === 0) return "與今天相同";
  return diff > 0 ? "明天比今天高 " + diff : "明天比今天低 " + -diff;
});

const clockPresentation = computed(() => {
  if (session.value === null) return null;
  return buildHomeReminderClockPresentation(session.value, currentTime.value);
});

const reminderPresentation = computed(() => {
  if (session.value === null) return null;
  return buildReminderPresentation({
    primaryAction: session.value.primaryAction,
    zones: session.value.zones,
    connectivity: boot.connectivity.value,
    now: currentTime.value
  });
});

const trackedZoneCount = computed(
  () =>
    session.value?.zones.filter((zone) => zone.zoneTimerStartedAt !== null)
      .length ?? 0
);

const trackedZoneDetail = computed(
  () => trackedZoneCount.value + " 個追蹤部位"
);

function handleAction(kind: ActionKind): void {
  void router.push(resolveActionRoute(kind));
}

function handleStartSetup(): void {
  void router.push("/setup");
}

function handleEndSession(): void {
  const current = session.value;
  if (current === null) return;
  void sessionControl.endCurrentSession(current);
}
</script>

<template>
  <div class="page-stack home">
    <!--
      首頁依 wireframe 沒有可見的頁面標題——版面直接從 UV 資料開始。
      但每一頁仍需要一個 h1，否則螢幕閱讀器的標題導覽在這一頁是空的。
      舊版的 h1 在 HomeReminderSummary 裡，拆掉那個元件時一併消失了。
    -->
    <h1 class="screen-reader-only">提醒</h1>

    <section
      v-if="
        boot.phase.value === 'opening_database' ||
        boot.phase.value === 'restoring_session'
      "
      class="home-state home-state--loading"
      role="status"
    >
      <SunLoader label="正在讀取這台裝置上的提醒" />
      <p>正在讀取這台裝置上的提醒…</p>
    </section>

    <section
      v-else-if="boot.phase.value === 'error'"
      class="home-state"
      role="alert"
    >
      <h2>無法讀取提醒</h2>
      <p>原有資料不會被空白內容取代，請重新讀取。</p>
      <button
        class="button button--primary"
        type="button"
        @click="boot.ensureBooted"
      >
        重新讀取
      </button>
    </section>

    <!-- 夜間＋提醒進行中：主要行動是結束提醒，不是補擦。 -->
    <template v-else-if="hasSession && isNight">
      <HomeNightSession :session="session!" />

      <SessionEndControl
        :phase="sessionControl.endPhase.value"
        :error="sessionControl.endError.value"
        @confirm="handleEndSession"
        @reset-error="sessionControl.clearEndError"
      />

      <nav class="home__links" aria-label="次要入口">
        <HomeLinkRow label="查看最近紀錄" to="/reminder" />
      </nav>
    </template>

    <!-- 白天＋提醒進行中。 -->
    <template v-else-if="hasSession">
      <HomeCountdown
        v-if="clockPresentation !== null"
        :presentation="clockPresentation"
      />

      <button
        v-if="reminderPresentation !== null"
        class="button button--primary home__cta"
        type="button"
        @click="handleAction(reminderPresentation.actionKind)"
      >
        {{ reminderPresentation.actionLabel }}
      </button>

      <nav class="home__links" aria-label="提醒入口">
        <HomeLinkRow
          label="查看完整狀態"
          :detail="trackedZoneDetail"
          to="/reminder"
        />
      </nav>

      <HomeUvHeadline
        :eyebrow="headlineEyebrow"
        :uvi="headlineDay?.uvi ?? null"
        :risk-level="headlineDay?.riskLevel ?? null"
        :region-name="uvForecast.region.value?.displayName ?? null"
        :temperature-celsius="headlineDay?.temperatureCelsius ?? null"
        :note="headlineNote"
      />

      <nav class="home__links" aria-label="UV 入口">
        <HomeLinkRow label="五日 UV 預報" to="/forecast" />
      </nav>
    </template>

    <!-- 以下都是沒有提醒進行中的狀態。 -->
    <template v-else>
      <HomeUvHeadline
        :eyebrow="headlineEyebrow"
        :uvi="headlineDay?.uvi ?? null"
        :risk-level="headlineDay?.riskLevel ?? null"
        :region-name="uvForecast.region.value?.displayName ?? null"
        :temperature-celsius="headlineDay?.temperatureCelsius ?? null"
        :note="headlineNote"
      />

      <!-- 沒有地區就沒有 UV 可看，先解決這件事。 -->
      <HomeLocationPrompt v-if="!hasRegion" />

      <!-- 夜間不放主 CTA，改用說明加逃生出口。 -->
      <HomeNightNotice v-else-if="isNight" @start="handleStartSetup" />

      <button
        v-else
        class="button button--primary home__cta"
        type="button"
        @click="handleStartSetup"
      >
        開始防曬提醒
      </button>

      <nav class="home__links" aria-label="次要入口">
        <HomeLinkRow label="五日 UV 預報" to="/forecast" />
        <!--
          「查看最近紀錄」刻意不顯示筆數（2026-08-23 裁決）。事件流只查得
          到目前 session，沒有提醒進行中時算不出今天有幾筆——寧可不顯示，
          也不顯示假數字。夜間那張 wireframe 沒有這一列，所以也不放。
        -->
        <HomeLinkRow v-if="!isNight" label="查看最近紀錄" to="/reminder" />
      </nav>
    </template>

    <div class="home__spacer" />

    <p class="safety-note">
      這是協助你記得補擦的提醒，不是安全曝曬時間或防護效果保證。
    </p>
  </div>
</template>

<style scoped>
/*
 * 首屏要在不捲動的情況下顯示 UV、下一步與主 CTA（DESIGN.md 第四節：
 * 「單一畫面要在不捲動的情況下顯示倒數、狀態與下一步」），所以整體間距
 * 比其他頁緊湊，並用 spacer 把安全提示壓到底部。
 */
.home {
  gap: var(--space-5);
}

.home__cta {
  width: 100%;
}

.home__links {
  display: grid;
}

.home__spacer {
  min-height: var(--space-4);
}

.home-state {
  display: grid;
  justify-items: start;
  gap: var(--space-4);
  padding: clamp(1.25rem, 5vw, 2rem) 0;
  color: var(--text-secondary);
}

.home-state--loading {
  justify-items: center;
  text-align: center;
  padding: clamp(2rem, 8vw, 3rem) 0;
}

.home-state h2,
.home-state p {
  margin: 0;
}

.home-state h2 {
  color: var(--text-primary);
  font-size: var(--font-size-title);
}
</style>
