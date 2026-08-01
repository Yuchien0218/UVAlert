<script setup lang="ts">
import type { ReminderPresentation } from "../../features/reminder/reminderPresentation";

interface Props {
  presentation: ReminderPresentation;
}

defineProps<Props>();

const emit = defineEmits<{
  action: [kind: ReminderPresentation["actionKind"]];
}>();
</script>

<template>
  <article
    class="due-panel due-panel--due"
    :aria-label="presentation.ariaLabel"
    data-testid="primary-reminder"
    data-presentation="due"
  >
    <p class="due-panel__eyebrow">補擦倒數</p>
    <div class="due-panel__content">
      <div class="due-panel__time-group">
        <div class="due-panel__minutes" aria-hidden="true">
          <strong class="stat-figure">{{ presentation.remainingMinutes ?? 0 }}</strong>
          <small>分鐘</small>
        </div>
        <p class="due-panel__time">{{ presentation.timeLabel }}</p>
      </div>
      <div class="due-panel__copy">
        <h2 class="due-panel__title">{{ presentation.title }}</h2>
        <p class="due-panel__body">{{ presentation.body }}</p>
      </div>
    </div>
    <button
      class="button button--primary due-panel__action"
      type="button"
      @click="emit('action', presentation.actionKind)"
    >
      {{ presentation.actionLabel }}
    </button>
  </article>
</template>

<style scoped>
.due-panel {
  display: grid;
  gap: var(--space-5);
  padding: clamp(1.25rem, 5vw, 2rem);
  border-radius: var(--radius-lg);
  background: var(--color-due-soft);
  overflow: hidden;
}

.due-panel__eyebrow {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
}

.due-panel__content {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--space-5);
}

.due-panel__minutes {
  display: grid;
  justify-items: center;
  min-width: 5rem;
  line-height: 1;
}

.due-panel__time-group {
  display: grid;
  justify-items: center;
}

.due-panel__minutes strong {
  color: var(--text-primary);
  font-size: clamp(2.5rem, 12vw, 4rem);
  font-weight: 500;
  letter-spacing: -0.05em;
}

.due-panel__minutes small {
  margin-top: var(--space-2);
  color: var(--text-secondary);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
}

.due-panel__title {
  margin: 0;
  font-size: clamp(1.75rem, 7vw, 2.8rem);
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: -0.04em;
}

.due-panel__body {
  margin: var(--space-3) 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.due-panel__time {
  margin: var(--space-2) 0 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.7;
}

.due-panel__action {
  width: 100%;
}

@media (max-width: 36rem) {
  .due-panel__content {
    grid-template-columns: 1fr;
  }

  .due-panel__time-group {
    justify-self: start;
    justify-items: start;
  }
}
</style>
