<script setup lang="ts">
import type { ReminderPresentation } from "../../features/reminder/reminderPresentation";

interface Props {
  presentation: ReminderPresentation;
}

defineProps<Props>();

function isClockTime(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value);
}

const emit = defineEmits<{
  action: [kind: ReminderPresentation["actionKind"]];
}>();
</script>

<template>
  <article
    class="untimed-panel"
    :aria-label="presentation.ariaLabel"
    data-testid="primary-reminder"
    data-presentation="untimed"
  >
    <p class="untimed-panel__eyebrow">
      {{ presentation.eyebrow }}
    </p>
    <h2 class="untimed-panel__title">{{ presentation.title }}</h2>
    <p
      class="untimed-panel__label"
      :class="{ 'stat-figure': isClockTime(presentation.timeLabel) }"
    >
      {{ presentation.timeLabel }}
    </p>
    <p class="untimed-panel__body">{{ presentation.body }}</p>
    <button
      class="button button--primary untimed-panel__action"
      type="button"
      @click="emit('action', presentation.actionKind)"
    >
      {{ presentation.actionLabel }}
    </button>
  </article>
</template>

<style scoped>
.untimed-panel {
  display: grid;
  gap: var(--space-5);
  padding: clamp(1.25rem, 5vw, 2rem);
  background: var(--color-untimed-soft);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.untimed-panel__eyebrow {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
}

.untimed-panel__label {
  margin: calc(var(--space-3) * -1) 0 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.untimed-panel__title {
  max-width: 18ch;
  margin: 0;
  font-size: clamp(1.75rem, 7vw, 2.8rem);
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: -0.04em;
}

.untimed-panel__body {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.untimed-panel__action {
  width: 100%;
}
</style>
