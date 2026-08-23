<script setup lang="ts">
import Icon from "../icons/Icon.vue";
import type { SetupSaveStatus } from "../../features/setup/createSetupController";

interface Props {
  step: 1 | 2 | 3;
  maxStep?: 2 | 3;
  title: string;
  description: string;
  backTo?: string | null;
  saveStatus: SetupSaveStatus;
  busy?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  backTo: null,
  busy: false,
  maxStep: 3
});

defineEmits<{
  cancel: [];
}>();

const steps = [
  { label: "情境", to: "/setup/context" },
  { label: "塗抹時間與開始防曬提醒", to: "/setup/timing" },
  { label: "確認設定", to: "/setup/review" }
] as const;

const visibleSteps = props.maxStep === 2
  ? steps.slice(0, 2)
  : steps;
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

    <ol class="setup-shell__progress" aria-label="設定進度">
      <li
        v-for="(progressStep, index) in visibleSteps"
        :key="progressStep.label"
        class="setup-shell__progress-item"
        :class="{
          'setup-shell__progress-item--complete': index + 1 < step,
          'setup-shell__progress-item--current': index + 1 === step
        }"
        :aria-current="index + 1 === step ? 'step' : undefined"
      >
        <RouterLink
          v-if="index + 1 < step"
          class="setup-shell__progress-link"
          :to="progressStep.to"
          :aria-label="`返回步驟 ${index + 1}：${progressStep.label}`"
        >
          <span class="stat-figure">{{ index + 1 }}</span>
          <small>{{ progressStep.label }}</small>
        </RouterLink>
        <template v-else>
          <span class="stat-figure">{{ index + 1 }}</span>
          <small>{{ progressStep.label }}</small>
        </template>
      </li>
    </ol>

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
  grid-template-columns: repeat(3, 1fr);
  margin: 0;
  padding: 0;
  list-style: none;
}

.setup-shell__progress-item {
  position: relative;
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  color: var(--text-secondary);
  text-align: center;
  font-size: 0.9rem;
}

.setup-shell__progress-item::before {
  position: absolute;
  z-index: 0;
  top: 1.125rem;
  right: 50%;
  left: -50%;
  height: 1.5px;
  background: var(--border-subtle);
  content: "";
}

.setup-shell__progress-item:first-child::before {
  display: none;
}

.setup-shell__progress-item > span,
.setup-shell__progress-link > span {
  z-index: 1;
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  place-content: center;
  border: 1.5px solid var(--border-subtle);
  border-radius: 50%;
  background: var(--page-background);
  font-size: 0.875rem;
  font-weight: 600;
}

.setup-shell__progress-link {
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  color: inherit;
  text-decoration: none;
}

.setup-shell__progress-link:hover small {
  text-decoration: underline;
  text-underline-offset: 0.2rem;
}

.setup-shell__progress-item--complete .setup-shell__progress-link > span,
.setup-shell__progress-item--current > span {
  border-color: var(--text-primary);
  background: var(--surface-inverse);
  color: var(--text-inverse);
}

.setup-shell__progress-item--current {
  color: var(--text-primary);
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

  .setup-shell__progress-item {
    font-size: 0.8rem;
  }

  .setup-shell__progress-item > span,
  .setup-shell__progress-link > span {
    width: 2rem;
    height: 2rem;
    font-size: 0.8rem;
  }

  .setup-shell__actions {
    display: grid;
  }
}
</style>
