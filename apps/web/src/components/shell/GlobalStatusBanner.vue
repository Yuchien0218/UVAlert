<script setup lang="ts">
import type { ConnectivityStatus } from "@sunshield/platform";
import { computed } from "vue";
import Icon from "../icons/Icon.vue";
import type {
  BootErrorCode,
  BootPhase
} from "../../app/createAppBootController";

interface Props {
  phase: BootPhase;
  errorCode: BootErrorCode | null;
  connectivity: ConnectivityStatus;
}

const props = defineProps<Props>();

const status = computed(() => {
  if (props.phase === "error" || props.errorCode !== null) {
    return {
      tone: "error",
      icon: "state-warning" as const,
      message: "目前無法讀取這台裝置上的提醒資料。請稍後重新整理。"
    };
  }
  if (
    props.phase === "opening_database" ||
    props.phase === "restoring_session"
  ) {
    return {
      tone: "loading",
      icon: "more-data" as const,
      message: "正在讀取這台裝置上的提醒…"
    };
  }
  if (props.connectivity === "offline") {
    return {
      tone: "offline",
      icon: "state-offline" as const,
      message: "目前離線；這台裝置上已儲存的提醒仍可查看。"
    };
  }
  return null;
});
</script>

<template>
  <div
    v-if="status !== null"
    class="status-banner"
    :class="`status-banner--${status.tone}`"
    :role="status.tone === 'error' ? 'alert' : 'status'"
  >
    <Icon :name="status.icon" :size="20" />
    <span>{{ status.message }}</span>
  </div>
</template>

<style scoped>
.status-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  background: var(--color-tracking-soft);
  font-size: var(--font-size-body);
  text-align: center;
}

.status-banner--error {
  background: var(--color-due-soft);
}

.status-banner--offline {
  background: var(--color-soon-soft);
}
</style>
