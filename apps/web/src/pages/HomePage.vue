<script setup lang="ts">
import type { ActionKind } from "@sunshield/contracts";
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import EveningUvPrompt from "../components/uv/EveningUvPrompt.vue";
import FiveDayUvCard from "../components/uv/FiveDayUvCard.vue";
import HomeReminderSummary from "../components/home/HomeReminderSummary.vue";
import OutdoorContextCard from "../components/home/OutdoorContextCard.vue";
import { useWebAppServices } from "../app/injection";

const { boot, uvForecast } = useWebAppServices();
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
      class="home-state app-card"
      role="status"
    >
      正在恢復本機提醒…
    </section>

    <section
      v-else-if="boot.phase.value === 'error'"
      class="home-state home-state--error app-card"
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
  padding: clamp(1.25rem, 5vw, 2rem);
  color: var(--text-secondary);
}

.home-state--error {
  border-top: 0.35rem solid var(--color-due);
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
