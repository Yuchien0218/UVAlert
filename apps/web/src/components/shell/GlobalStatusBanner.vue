<script setup lang="ts">
import type { ConnectivityStatus } from "@sunshield/platform";
import { CloudOff, Database, TriangleAlert } from "@lucide/vue";
import { computed } from "vue";
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
      icon: TriangleAlert,
      message:
        "目前無法讀取這台裝置上的提醒資料。請稍後重新整理。"
    };
  }
  if (
    props.phase === "opening_database" ||
    props.phase === "restoring_session"
  ) {
    return {
      tone: "loading",
      icon: Database,
      message: "正在恢復這台裝置上的提醒…"
    };
  }
  if (props.connectivity === "offline") {
    return {
      tone: "offline",
      icon: CloudOff,
      message: "目前離線；已保存的本機提醒仍可查看。"
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
    <component
      :is="status.icon"
      :size="18"
      :stroke-width="1.7"
      aria-hidden="true"
    />
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
  font-size: 0.875rem;
  text-align: center;
}

.status-banner--error {
  background: var(--color-due-soft);
}

.status-banner--offline {
  background: var(--color-soon-soft);
}
</style>
