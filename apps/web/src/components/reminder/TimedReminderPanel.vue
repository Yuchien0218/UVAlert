<script setup lang="ts">
import { CheckCircle2 } from "@lucide/vue";
import type { ReminderPresentation } from "../../features/reminder/reminderPresentation";
import CountdownSunTime from "./CountdownSunTime.vue";

interface Props {
  presentation: ReminderPresentation;
  remainingFraction: number | null;
  progressPercent: number | null;
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
        <CountdownSunTime
          :remaining-fraction="remainingFraction"
          :progress-percent="progressPercent"
          :remaining-minutes="presentation.remainingMinutes ?? 0"
          :progress-aria-label="presentation.ariaLabel"
          :time-label="`預計 ${presentation.timeLabel}`"
        />
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
      <CheckCircle2 :size="18" aria-hidden="true" />
      {{ presentation.actionLabel }}
    </button>
  </article>
</template>

<style scoped>
.reminder-panel {
  --reminder-tone: var(--color-tracking);
  --reminder-tone-soft: var(--color-tracking-soft);
  --countdown-tone: var(--reminder-tone);
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

.reminder-panel__time-group {
  display: grid;
  justify-items: center;
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

.reminder-panel__action {
  width: 100%;
  border-color: var(--reminder-tone);
  background: var(--reminder-tone);
  color: var(--color-white);
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
