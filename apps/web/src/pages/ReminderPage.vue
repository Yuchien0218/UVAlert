<script setup lang="ts">
import type { ActionKind } from "@sunshield/contracts";
import { useRouter } from "vue-router";
import { useWebAppServices } from "../app/injection";
import PrimaryReminderPanel from "../components/reminder/PrimaryReminderPanel.vue";
import ReminderEmptyState from "../components/reminder/ReminderEmptyState.vue";
import ZoneStatusList from "../components/reminder/ZoneStatusList.vue";
import SessionEndControl from "../components/session/SessionEndControl.vue";

const { boot, sessionControl } = useWebAppServices();
const router = useRouter();

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
      正在恢復本機提醒…
    </section>

    <section
      v-else-if="boot.phase.value === 'error'"
      class="error-state app-card"
      role="alert"
    >
      <h2>無法讀取本機提醒</h2>
      <p>資料庫目前無法使用。你可以重新嘗試，但系統不會用空白狀態覆蓋既有資料。</p>
      <button class="button button--primary" type="button" @click="boot.ensureBooted">
        重新嘗試
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
      />
      <ZoneStatusList
        :primary-action="boot.currentSession.value.primaryAction"
        :zones="boot.currentSession.value.zones"
      />
      <SessionEndControl
        :phase="sessionControl.endPhase.value"
        :error="sessionControl.endError.value"
        @confirm="handleEndSession"
        @reset-error="sessionControl.clearEndError"
      />
      <p class="safety-note">
        此時間是防曬檢查／補擦提醒，不代表安全曝曬時間。
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
</style>
