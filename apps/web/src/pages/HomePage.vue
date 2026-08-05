<script setup lang="ts">
import type { ActionKind } from "@sunshield/contracts";
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import EveningUvPrompt from "../components/uv/EveningUvPrompt.vue";
import FiveDayUvCard from "../components/uv/FiveDayUvCard.vue";
import HomeReminderSummary from "../components/home/HomeReminderSummary.vue";
import OutdoorContextCard from "../components/home/OutdoorContextCard.vue";
import SunLoader from "../components/feedback/SunLoader.vue";
import ZoneStatusList from "../components/reminder/ZoneStatusList.vue";
import SessionEndControl from "../components/session/SessionEndControl.vue";
import { useWebAppServices } from "../app/injection";

const { boot, sessionControl, uvForecast } = useWebAppServices();
const router = useRouter();

onMounted(() => {
  void uvForecast.ensureLoaded();
});

function handleAction(kind: ActionKind): void {
  void router.push({
    name: "reminder-action",
    params: { kind }
  });
}

function handleEndSession(): void {
  const currentSession = boot.currentSession.value;
  if (currentSession === null) return;
  void sessionControl.endCurrentSession(currentSession);
}

function handleViewForecast(): void {
  uvForecast.dismissEveningPrompt();
  globalThis.document
    .getElementById("five-day-uv")
    ?.scrollIntoView({ block: "start" });
}
</script>

<template>
  <div class="page-stack">
    <section
      v-if="
        boot.phase.value === 'opening_database' ||
        boot.phase.value === 'restoring_session'
      "
      class="home-state home-state--loading"
      role="status"
    >
      <SunLoader label="正在恢復本機提醒" />
      <p>正在恢復本機提醒…</p>
    </section>

    <section
      v-else-if="boot.phase.value === 'error'"
      class="home-state"
      role="alert"
    >
      <h2>無法讀取本機提醒</h2>
      <p>既有資料不會被空白狀態覆蓋，請重新嘗試讀取。</p>
      <button
        class="button button--primary"
        type="button"
        @click="boot.ensureBooted"
      >
        重新嘗試
      </button>
    </section>

    <template v-else>
      <HomeReminderSummary
        :session="boot.currentSession.value"
        :connectivity="boot.connectivity.value"
        @action="handleAction"
      />
      <!-- 太陽低調放射轉場線 -->
      <div v-if="boot.currentSession.value !== null" class="sun-divider" aria-hidden="true">
        <div class="sun-divider__line"></div>
        <svg class="sun-divider__sun" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="10" />
          <line x1="24" y1="2" x2="24" y2="8" />
          <line x1="24" y1="40" x2="24" y2="46" />
          <line x1="2" y1="24" x2="8" y2="24" />
          <line x1="40" y1="24" x2="46" y2="24" />
          <line x1="8.4" y1="8.4" x2="12.7" y2="12.7" />
          <line x1="35.3" y1="35.3" x2="39.6" y2="39.6" />
          <line x1="8.4" y1="39.6" x2="12.7" y2="35.3" />
          <line x1="35.3" y1="12.7" x2="39.6" y2="8.4" />
        </svg>
        <div class="sun-divider__line"></div>
      </div>
      <ZoneStatusList
        v-if="boot.currentSession.value !== null"
        :primary-action="boot.currentSession.value.primaryAction"
        :zones="boot.currentSession.value.zones"
      />
    </template>

    <OutdoorContextCard
      :region-name="uvForecast.region.value?.displayName ?? null"
    />

    <EveningUvPrompt
      v-if="
        uvForecast.showEveningPrompt.value &&
        uvForecast.forecast.value !== null
      "
      :forecast="uvForecast.forecast.value"
      @view="handleViewForecast"
      @dismiss="uvForecast.dismissEveningPrompt"
    />

    <SessionEndControl
      v-if="boot.currentSession.value !== null"
      :phase="sessionControl.endPhase.value"
      :error="sessionControl.endError.value"
      @confirm="handleEndSession"
      @reset-error="sessionControl.clearEndError"
    />

    <FiveDayUvCard
      :phase="uvForecast.phase.value"
      :error="uvForecast.error.value"
      :forecast="uvForecast.forecast.value"
      @refresh="uvForecast.refresh"
    />

    <p class="safety-note">
      防曬提醒是協助你回看紀錄的工具，不是安全曝曬時間或防護效果保證。
    </p>
  </div>
</template>

<style scoped>
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
  font-size: 1.25rem;
  font-weight: 500;
}

/* 太陽低調放射轉場線：卡片之間的裝飾分隔，維持極輕的存在感，
   不跟真正代表狀態的太陽圖示（CountdownSunTime）搶戲 */
.sun-divider {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-1) 0;
}

.sun-divider__line {
  flex: 1;
  height: 1px;
  background: var(--border-subtle);
}

.sun-divider__sun {
  width: 1.25rem;
  height: 1.25rem;
  flex: 0 0 auto;
  opacity: 0.5;
}

.sun-divider__sun circle,
.sun-divider__sun line {
  fill: none;
  stroke: var(--text-secondary);
  stroke-width: 1.75;
  stroke-linecap: round;
}
</style>
