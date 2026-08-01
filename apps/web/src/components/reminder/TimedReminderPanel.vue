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
    class="reminder-panel"
    :class="
      presentation.tone === 'soon'
        ? 'reminder-panel--soon'
        : 'reminder-panel--tracking'
    "
    :aria-label="presentation.ariaLabel"
    data-testid="primary-reminder"
    :data-presentation="presentation.tone"
  >
    <p class="reminder-panel__eyebrow">補擦倒數</p>

    <div class="reminder-panel__content">
      <div class="reminder-panel__time-group">
        <div class="reminder-panel__minutes" aria-hidden="true">
          <strong class="stat-figure">{{ presentation.remainingMinutes ?? "—" }}</strong>
          <small>分鐘</small>
        </div>
        <p class="reminder-panel__time">
          預計
          <span class="stat-figure stat-figure--inline">
            {{ presentation.timeLabel }}
          </span>
        </p>
      </div>
      <div class="reminder-panel__message">
        <h2 class="reminder-panel__title">{{ presentation.title }}</h2>
        <p class="reminder-panel__body">{{ presentation.body }}</p>
      </div>
    </div>

    <button
      class="button button--primary reminder-panel__action"
      type="button"
      @click="emit('action', presentation.actionKind)"
    >
      {{ presentation.actionLabel }}
    </button>
  </article>
</template>

<style scoped>
.reminder-panel {
  --reminder-tone: var(--color-tracking);
  --reminder-tone-soft: var(--color-tracking-soft);
  display: grid;
  gap: var(--space-5);
  padding: clamp(1.25rem, 5vw, 2rem);
  border-radius: var(--radius-lg);
  background: var(--reminder-tone-soft);
  overflow: hidden;
}

.reminder-panel--soon {
  --reminder-tone: var(--color-soon);
  --reminder-tone-soft: var(--color-soon-soft);
}

.reminder-panel__eyebrow {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
}

.reminder-panel__content {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--space-5);
}

.reminder-panel__minutes {
  display: grid;
  justify-items: center;
  min-width: 5rem;
  color: var(--reminder-tone);
  line-height: 1;
}

.reminder-panel__time-group {
  display: grid;
  justify-items: center;
}

.reminder-panel__minutes strong {
  color: var(--text-primary);
  font-size: clamp(2.5rem, 12vw, 4rem);
  font-weight: 500;
  letter-spacing: -0.05em;
}

.reminder-panel__minutes small {
  margin-top: var(--space-2);
  color: var(--text-secondary);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
}

.reminder-panel__title {
  margin: 0;
  font-size: clamp(1.65rem, 7vw, 2.6rem);
  font-weight: 500;
  line-height: 1.12;
  letter-spacing: -0.035em;
}

.reminder-panel__body {
  margin: var(--space-3) 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.reminder-panel__time {
  margin: var(--space-2) 0 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.7;
}

.reminder-panel__action {
  width: 100%;
}

@media (max-width: 36rem) {
  .reminder-panel__content {
    grid-template-columns: 1fr;
  }

  .reminder-panel__time-group {
    justify-self: start;
    justify-items: start;
  }
}
</style>
