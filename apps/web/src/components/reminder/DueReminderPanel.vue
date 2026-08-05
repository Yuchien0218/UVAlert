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
    class="due-panel due-panel--due"
    :aria-label="presentation.ariaLabel"
    data-testid="primary-reminder"
    data-presentation="due"
  >
    <p class="due-panel__eyebrow">補擦倒數</p>
    <div class="due-panel__content">
      <div class="due-panel__time-group">
        <CountdownSunTime
          :remaining-fraction="remainingFraction"
          :progress-percent="progressPercent"
          :remaining-minutes="presentation.remainingMinutes ?? 0"
          :progress-aria-label="presentation.ariaLabel"
          :time-label="presentation.timeLabel"
        />
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
      <CheckCircle2 :size="18" aria-hidden="true" />
      {{ presentation.actionLabel }}
    </button>
  </article>
</template>

<style scoped>
.due-panel {
  --reminder-tone: var(--color-due);
  --countdown-tone: var(--reminder-tone);
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

.due-panel__time-group {
  display: grid;
  justify-items: center;
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

.due-panel__action {
  width: 100%;
  border-color: var(--reminder-tone);
  background: var(--reminder-tone);
  color: var(--color-white);
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
