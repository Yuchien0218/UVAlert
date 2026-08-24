<script setup lang="ts">
import Icon from "../icons/Icon.vue";
import type { SetupSaveStatus } from "../../features/setup/createSetupController";

/**
 * 設定流程的外框：工具列（儲存狀態＋取消）、標題、內容、底部行動區。
 *
 * 2026-08-24：設定改成單一頁面（`/setup`）後，這裡移除了步驟指示器
 * （線性進度條＋「步驟 X/2」）與「返回上一步」——只有一頁就沒有步驟，
 * 也沒有上一步可回。`step`／`backTo` 兩個 prop 一併移除。
 */

interface Props {
  title: string;
  description: string;
  saveStatus: SetupSaveStatus;
  busy?: boolean;
}

withDefaults(defineProps<Props>(), {
  busy: false
});

defineEmits<{
  cancel: [];
}>();
</script>

<template>
  <section class="setup-shell" :aria-busy="busy">
    <div class="setup-shell__toolbar">
      <span />

      <span
        v-if="saveStatus === 'saved'"
        class="setup-shell__save-status"
      >
        <Icon name="state-online" :size="20" />
        草稿已儲存
      </span>
      <span
        v-else-if="saveStatus === 'error'"
        class="setup-shell__save-status setup-shell__save-status--error"
        role="status"
      >
        <Icon name="state-offline" :size="20" />
        草稿未儲存
      </span>

      <button
        class="setup-shell__quiet-action"
        type="button"
        :disabled="busy"
        @click="$emit('cancel')"
      >
        <Icon name="tool-close" :size="20" />
        取消
      </button>
    </div>

    <header class="setup-shell__heading">
      <h1 class="setup-shell__title">{{ title }}</h1>
      <p class="setup-shell__description">{{ description }}</p>
    </header>

    <div class="setup-shell__content">
      <slot />
    </div>

    <footer class="setup-shell__actions">
      <slot name="actions" />
    </footer>
  </section>
</template>

<style scoped>
.setup-shell {
  display: grid;
  gap: var(--space-8);
}

.setup-shell__toolbar {
  display: grid;
  min-height: var(--tap-target);
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--space-3);
}

.setup-shell__quiet-action {
  display: inline-flex;
  min-height: var(--tap-target);
  align-items: center;
  gap: var(--space-2);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  text-decoration: none;
}

button.setup-shell__quiet-action {
  justify-self: end;
}

.setup-shell__quiet-action:disabled {
  cursor: wait;
  opacity: 0.55;
}

.setup-shell__save-status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-success);
  font-size: var(--font-size-caption);
  white-space: nowrap;
}

.setup-shell__save-status--error {
  color: var(--color-due);
}

.setup-shell__heading {
  display: grid;
  gap: var(--space-3);
}

.setup-shell__title {
  max-width: 16ch;
  margin: 0;
  font-size: var(--font-size-page-title);
  letter-spacing: var(--letter-spacing-page-title);
  line-height: 1;
}

.setup-shell__description {
  max-width: 38rem;
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.setup-shell__content {
  display: grid;
  gap: var(--space-5);
}

.setup-shell__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding-bottom: env(safe-area-inset-bottom);
}

@media (max-width: 31rem) {
  .setup-shell__toolbar {
    grid-template-columns: 1fr auto;
  }

  .setup-shell__save-status {
    display: none;
  }

  .setup-shell__actions {
    display: grid;
  }
}
</style>
