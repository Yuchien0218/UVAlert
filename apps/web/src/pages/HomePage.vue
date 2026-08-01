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
  if (kind === "record_reapplication") {
    void router.push({ name: "reminder-reapply" });
    return;
  }
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

</style>
