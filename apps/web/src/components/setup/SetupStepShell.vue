<script setup lang="ts">
import Icon from "../icons/Icon.vue";
import type { SetupSaveStatus } from "../../features/setup/createSetupController";

interface Props {
  step: 1 | 2;
  title: string;
  description: string;
  backTo?: string | null;
  saveStatus: SetupSaveStatus;
  busy?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  backTo: null,
  busy: false
});

defineEmits<{
  cancel: [];
}>();

/**
 * 設定流程只有兩步（`/setup/review` 已併入步驟 2，2026-08-15 裁決）。
 * 高保真圖用線性進度條＋「步驟 X/2」文字取代原本的圓形數字節點，
 * 2026-08-23 使用者確認換用此版本。
 */
const steps = [
  { label: "情境", to: "/setup/context" },
  { label: "塗抹時間與開始防曬提醒", to: "/setup/timing" }
] as const;
</script>

<template>
  <section class="setup-shell" :aria-busy="busy">
    <div class="setup-shell__toolbar">
      <RouterLink
        v-if="backTo"
        class="setup-shell__quiet-action"
        :to="backTo"
      >
        <Icon name="tool-arrow-left" :size="20" />
        返回
      </RouterLink>
      <span v-else />

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

    <div class="setup-shell__progress">
      <p class="setup-shell__progress-label">
        步驟 {{ step }}／{{ steps.length }}・{{ steps[step - 1]!.label }}
      </p>
      <div
        class="setup-shell__progress-track"
        role="progressbar"
        :aria-valuenow="step"
        aria-valuemin="1"
        :aria-valuemax="steps.length"
        aria-label="設定進度"
      >
        <div
          class="setup-shell__progress-fill"
          :style="{ width: `${(step / steps.length) * 100}%` }"
        />
      </div>
      <RouterLink
        v-if="step > 1"
        class="setup-shell__progress-back text-link"
        :to="steps[0].to"
        :aria-label="`返回步驟 1：${steps[0].label}`"
      >
        返回步驟 1：{{ steps[0].label }}
      </RouterLink>
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
  font-size: 0.75rem;
  white-space: nowrap;
}

.setup-shell__save-status--error {
  color: var(--color-due);
}

.setup-shell__progress {
  display: grid;
  gap: var(--space-2);
}

.setup-shell__progress-label {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-label);
  font-weight: 500;
}

.setup-shell__progress-track {
  height: 8px;
  border-radius: 4px;
  background: var(--color-surface-card);
  overflow: hidden;
}

.setup-shell__progress-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width var(--motion-base, 240ms) cubic-bezier(0.22, 1, 0.36, 1);
}

@media (prefers-reduced-motion: reduce) {
  .setup-shell__progress-fill {
    transition: none;
  }
}

.setup-shell__progress-back {
  justify-self: start;
}

.setup-shell__heading {
  display: grid;
  gap: var(--space-3);
}

.setup-shell__title {
  max-width: 16ch;
  margin: 0;
  font-size: var(--font-size-page-title);
  letter-spacing: -0.05em;
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
