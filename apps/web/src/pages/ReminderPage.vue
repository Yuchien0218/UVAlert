<script setup lang="ts">
import type { ActionKind } from "@sunshield/contracts";
import { computed, nextTick, onMounted, shallowRef, watch } from "vue";
import { useRouter } from "vue-router";
import { useWebAppServices } from "../app/injection";
import { resolveActionDestination } from "../helpers/resolveActionRoute";
import type { SecondaryActionKind } from "../features/reminder/reminderPresentation";
import PrimaryReminderPanel from "../components/reminder/PrimaryReminderPanel.vue";
import RecentEventsList from "../components/reminder/RecentEventsList.vue";
import ReminderEmptyState from "../components/reminder/ReminderEmptyState.vue";
import ZoneStatusList from "../components/reminder/ZoneStatusList.vue";
import SessionEndControl from "../components/session/SessionEndControl.vue";
import NightWindDownPrompt from "../components/reminder/NightWindDownPrompt.vue";
import FiveDayUvCard from "../components/uv/FiveDayUvCard.vue";
import { useCurrentTime } from "../composables/useCurrentTime";
import { getEveningCycleKey } from "../features/uv/uvForecastRules";

/** 夜間收工提示的每晚一次記憶，比照 EVENING_UV_DISMISSAL_STORAGE_KEY。 */
const NIGHT_PROMPT_DISMISSAL_KEY = "sunshield.night-wind-down-dismissed-cycle";

const { boot, sessionControl, sessionEvents, productSettings, uvForecast } =
  useWebAppServices();
const router = useRouter();

/** `view_product_label` 的原地展開；規格語意是「正在等待，不要離開」。 */
const productLabelExpanded = shallowRef(false);
const clockNotice = shallowRef<string | null>(null);
const recentEventsRef =
  shallowRef<{ expand?: () => void } | null>(null);

onMounted(() => {
  if (boot.currentSession.value !== null) {
    void sessionEvents.ensureLoaded();
    void productSettings.ensureLoaded();
  }
  void uvForecast.ensureLoaded();
});

// Session 換人或剛建立時重讀事件流，否則清單會停留在上一個 Session。
watch(
  () => boot.currentSession.value?.sessionId ?? null,
  (sessionId, previous) => {
    if (sessionId !== null && sessionId !== previous) {
      void sessionEvents.refresh();
    }
  }
);

/**
 * 時鐘可信度來自 reducer 的 reason code，不是連線狀態——
 * 離線不必然表示時鐘不可信，兩者是獨立訊號。
 */
const clockTrusted = computed(
  () =>
    !(
      boot.currentSession.value?.primaryAction.reasonCodes ?? []
    ).includes("CLOCK_UNTRUSTED")
);

/**
 * S-07 的動作分派。原地行為不換頁——離開頁面會讓使用者失去狀態脈絡，
 * 這是 2026-08-06 裁決「13 個 ActionKind 不新增畫面」的落點。
 */
function handleAction(kind: ActionKind): void {
  const destination = resolveActionDestination(kind);
  if (destination.kind === "route") {
    void router.push(destination.to);
    return;
  }

  switch (destination.behavior) {
    case "anchor_zones":
      void scrollToZones();
      return;
    case "expand_product_label":
      productLabelExpanded.value = true;
      return;
    case "recalibrate_clock":
      // 校準子系統尚未實作（platform 沒有對應 port）。
      // 明講現況勝過靜默失敗或假裝已校準。
      clockNotice.value =
        "目前無法自動校準時間。請將裝置的日期與時間設為自動，再重新開啟本頁。";
      return;
    case "ended_state":
      // Session 結束後 currentSession 會轉為 null，畫面自然落到空白狀態。
      void boot.refresh();
      return;
  }
}

async function scrollToZones(): Promise<void> {
  await nextTick();
  globalThis.document
    .querySelector("#zone-status")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * S-07 四則次要 CTA（2026-08-07 裁決）。
 * 全數指向既有畫面或原地行為，不新增畫面。
 */
async function handleSecondaryAction(
  kind: SecondaryActionKind
): Promise<void> {
  switch (kind) {
    case "view_saved_records":
      // 資料就在本頁下方；離開頁面反而失去脈絡，所以錨點並展開。
      recentEventsRef.value?.expand?.();
      await nextTick();
      globalThis.document
        .querySelector("#recent-events")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    case "view_handling_guidance":
      // 不得預先帶入症狀、產品名稱或任何使用者輸入（S-07 裁決附註）。
      void router.push({ name: "special-situation" });
      return;
    case "update_protection_record":
      void router.push({ name: "reminder-reapply" });
      return;
    case "update_protection_method":
      // 規格目的地是 S-04 原地 sheet，但該 sheet 只寫入 SetupDraft，
      // 沒有變更 active Session 部位的命令路徑。
      //
      // 2026-08-08：原本落在 `/reminder/action/:kind` placeholder，該路由
      // 已隨死路由清理移除，這裡改導向 S-08——記錄實際塗抹是目前唯一
      // 真的能解除 CLOTHING_COVERED 的動作，比停在說明頁誠實。
      // 待裁決的另一個選項是補 Session 部位變更命令。
      void router.push({ name: "reminder-reapply" });
      return;
  }
}

/** S-10 唯一入口：最近事件清單的每一列。 */
function handleCorrectEvent(eventId: string): void {
  void router.push({
    name: "reminder-event-correct",
    params: { id: eventId }
  });
}

function handleEndSession(): void {
  const currentSession = boot.currentSession.value;
  if (currentSession === null) return;
  void sessionControl.endCurrentSession(currentSession);
}

/**
 * 夜間收工提示。
 *
 * 只在夜間、有進行中 Session、且這個夜間週期還沒關掉時出現。
 * **不會停止倒數**——見 NightWindDownPrompt 的註解與
 * `docs/decisions/2026-08-08-night-behavior.md`。
 */
const currentTime = useCurrentTime();
const nightCycle = computed(() => getEveningCycleKey(currentTime.value));
const dismissedNightCycle = shallowRef<string | null>(
  readDismissedNightCycle()
);

const showNightPrompt = computed(
  () =>
    nightCycle.value !== null &&
    boot.currentSession.value !== null &&
    dismissedNightCycle.value !== nightCycle.value
);

function readDismissedNightCycle(): string | null {
  try {
    return globalThis.localStorage.getItem(NIGHT_PROMPT_DISMISSAL_KEY);
  } catch {
    return null;
  }
}

function dismissNightPrompt(): void {
  const cycle = nightCycle.value;
  if (cycle === null) return;
  dismissedNightCycle.value = cycle;
  try {
    globalThis.localStorage.setItem(NIGHT_PROMPT_DISMISSAL_KEY, cycle);
  } catch {
    /* 存不進去頂多這一晚再問一次，不影響功能 */
  }
}
</script>

<template>
  <div class="page-stack">
    <header class="page-heading">
      <h1 class="page-heading__title">目前提醒</h1>
    </header>

    <section
      v-if="
        boot.phase.value === 'opening_database' ||
        boot.phase.value === 'restoring_session'
      "
      class="loading-state app-card"
      role="status"
    >
      正在讀取這台裝置上的提醒…
    </section>

    <section
      v-else-if="boot.phase.value === 'error'"
      class="error-state app-card"
      role="alert"
    >
      <h2>無法讀取提醒</h2>
      <p>目前無法使用資料庫。你可以重新讀取；原有資料不會被空白內容取代。</p>
      <button class="button button--primary" type="button" @click="boot.ensureBooted">
        重新讀取
      </button>
    </section>

    <ReminderEmptyState
      v-else-if="boot.currentSession.value === null"
    />

    <template v-else>
      <PrimaryReminderPanel
        :primary-action="boot.currentSession.value.primaryAction"
        :zones="boot.currentSession.value.zones"
        :connectivity="boot.connectivity.value"
        @action="handleAction"
        @secondary-action="handleSecondaryAction"
      />

      <p v-if="clockNotice" class="inline-notice" role="status">
        {{ clockNotice }}
      </p>

      <!-- view_product_label：原地展開，語意是「正在等待，不要離開」 -->
      <section
        v-if="productLabelExpanded && productSettings.snapshot.value"
        class="product-label app-card"
        aria-labelledby="product-label-title"
      >
        <h2 id="product-label-title">目前防曬乳的包裝標示</h2>
        <ul>
          <li>
            {{
              productSettings.snapshot.value.preExposureWaitStatus ===
                'explicit_minutes' &&
              productSettings.snapshot.value.preExposureWaitMinutes !== null
                ? `擦上後需等待 ${productSettings.snapshot.value.preExposureWaitMinutes} 分鐘`
                : '包裝沒有寫擦上後要等多久'
            }}
          </li>
          <li>
            {{
              productSettings.snapshot.value.reapplicationIntervalStatus ===
                'explicit_minutes' &&
              productSettings.snapshot.value.reapplicationIntervalMinutes !==
                null
                ? `包裝標示的補擦間隔為 ${productSettings.snapshot.value.reapplicationIntervalMinutes} 分鐘`
                : '包裝沒有寫明補擦間隔'
            }}
          </li>
        </ul>
        <button
          class="button button--quiet"
          type="button"
          @click="productLabelExpanded = false"
        >
          收合
        </button>
      </section>

      <ZoneStatusList
        :primary-action="boot.currentSession.value.primaryAction"
        :zones="boot.currentSession.value.zones"
      />
      <FiveDayUvCard
        :phase="uvForecast.phase.value"
        :error="uvForecast.error.value"
        :forecast="uvForecast.forecast.value"
        @refresh="uvForecast.refresh"
      />
      <RecentEventsList
        ref="recentEventsRef"
        id="recent-events"
        :zones="boot.currentSession.value.zones"
        :events="sessionEvents.stream.value"
        :clock-trusted="clockTrusted"
        @correct="handleCorrectEvent"
      />
      <NightWindDownPrompt
        v-if="showNightPrompt"
        :ending="sessionControl.endPhase.value === 'ending'"
        @end="handleEndSession"
        @keep="dismissNightPrompt"
      />
      <SessionEndControl
        :phase="sessionControl.endPhase.value"
        :error="sessionControl.endError.value"
        @confirm="handleEndSession"
        @reset-error="sessionControl.clearEndError"
      />
      <p class="safety-note">
        這是協助你記得補擦的提醒，不代表你可以在陽光下待多久。
      </p>
    </template>
  </div>
</template>

<style scoped>
.loading-state,
.error-state {
  padding: clamp(1.25rem, 5vw, 2rem);
}

.loading-state {
  color: var(--text-secondary);
}

.error-state {
  display: grid;
  justify-items: start;
  gap: var(--space-4);
  border-top: 0.35rem solid var(--color-due);
}

.error-state h2,
.error-state p {
  margin: 0;
}

.error-state p {
  color: var(--text-secondary);
  line-height: 1.7;
}

.inline-notice {
  margin: 0;
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--surface-soft);
  color: var(--text-secondary);
  line-height: 1.7;
}

.product-label {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
  padding: var(--space-5);
}

.product-label h2 {
  margin: 0;
  font-size: 1rem;
}

.product-label ul {
  margin: 0;
  padding-inline-start: 1.3rem;
  list-style: disc;
  color: var(--text-secondary);
  line-height: 1.7;
}
</style>
