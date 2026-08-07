<script setup lang="ts">
import { CheckCircle2 } from "@lucide/vue";
import type {
  ReminderPresentation,
  SecondaryActionKind
} from "../../features/reminder/reminderPresentation";
import CountdownSunTime from "./CountdownSunTime.vue";

interface Props {
  presentation: ReminderPresentation;
  remainingFraction?: number | null;
  progressPercent?: number | null;
}

const props = withDefaults(defineProps<Props>(), {
  remainingFraction: null,
  progressPercent: null
});

const emit = defineEmits<{
  action: [kind: ReminderPresentation["actionKind"]];
  secondaryAction: [kind: SecondaryActionKind];
}>();

function isClockTime(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value);
}

function getToneClass(): string {
  const tone = props.presentation.tone;
  if (tone === "due") return "reminder-panel--due";
  if (tone === "untimed") return "reminder-panel--untimed";
  return tone === "soon" ? "reminder-panel--soon" : "reminder-panel--tracking";
}

function getToneCSSVars(): Record<string, string> {
  const tone = props.presentation.tone;
  if (tone === "due") {
    return {
      "--reminder-tone": "var(--color-due)",
      "--reminder-tone-soft": "var(--color-due-soft)",
      "--countdown-tone": "var(--reminder-tone)"
    };
  }
  if (tone === "untimed") {
    return {
      "--reminder-tone": "var(--color-untimed)",
      "--reminder-tone-soft": "var(--color-untimed-soft)"
    };
  }
  return {
    "--reminder-tone": tone === "soon" ? "var(--color-soon)" : "var(--color-tracking)",
    "--reminder-tone-soft":
      tone === "soon" ? "var(--color-soon-soft)" : "var(--color-tracking-soft)",
    "--countdown-tone": "var(--reminder-tone)"
  };
}

function getTimeLabel(): string {
  if (props.presentation.tone === "untimed") {
    return props.presentation.timeLabel;
  }
  if (props.presentation.tone === "due") {
    return props.presentation.timeLabel;
  }
  return `預計 ${props.presentation.timeLabel}`;
}

function hasCountdown(): boolean {
  return props.presentation.tone !== "untimed";
}

function getEyebrowText(): string {
  if (props.presentation.tone === "untimed") {
    return props.presentation.eyebrow;
  }
  return "補擦倒數";
}
</script>

<template>
  <article
    class="reminder-panel"
    :class="getToneClass()"
    :style="getToneCSSVars()"
    :aria-label="presentation.ariaLabel"
    data-testid="primary-reminder"
    :data-presentation="presentation.tone"
  >
    <p class="reminder-panel__eyebrow">
      {{ getEyebrowText() }}
    </p>

    <div
      class="reminder-panel__content"
      :class="{
        'reminder-panel__content--with-countdown': hasCountdown()
      }"
    >
      <div v-if="hasCountdown()" class="reminder-panel__time-group">
        <CountdownSunTime
          :remaining-fraction="remainingFraction"
          :progress-percent="progressPercent"
          :remaining-minutes="presentation.remainingMinutes ?? 0"
          :progress-aria-label="presentation.ariaLabel"
          :time-label="getTimeLabel()"
        />
      </div>

      <div
        class="reminder-panel__message"
        :class="{ 'reminder-panel__message--full-width': !hasCountdown() }"
      >
        <h2 class="reminder-panel__title">{{ presentation.title }}</h2>
        <p
          v-if="presentation.tone === 'untimed'"
          class="reminder-panel__label"
          :class="{ 'stat-figure': isClockTime(presentation.timeLabel) }"
        >
          {{ presentation.timeLabel }}
        </p>
        <p class="reminder-panel__body">{{ presentation.body }}</p>
      </div>
    </div>

    <button
      class="button button--primary reminder-panel__action"
      type="button"
      @click="emit('action', presentation.actionKind)"
    >
      <CheckCircle2 v-if="presentation.tone !== 'untimed'" :size="18" aria-hidden="true" />
      {{ presentation.actionLabel }}
    </button>

    <!--
      次要 CTA 排在主要操作之後，層級明確。
      AC-65 要求操作按鈕有清楚層級；急症等主要行動不得被次要內容延後。
    -->
    <div
      v-if="presentation.secondaryActions.length > 0"
      class="reminder-panel__secondary"
    >
      <button
        v-for="secondary in presentation.secondaryActions"
        :key="secondary.kind"
        class="button button--quiet"
        type="button"
        @click="emit('secondaryAction', secondary.kind)"
      >
        {{ secondary.label }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.reminder-panel {
  display: grid;
  gap: var(--space-5);
  padding: clamp(1.25rem, 5vw, 2rem);
  border-radius: var(--radius-lg);
  background: var(--reminder-tone-soft);
  overflow: hidden;
}

.reminder-panel__eyebrow {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-label);
  font-weight: 500;
}

.reminder-panel__content {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--space-5);
}

.reminder-panel__content--with-countdown {
  grid-template-columns: auto minmax(0, 1fr);
}

.reminder-panel__message--full-width {
  grid-column: 1 / -1;
}

.reminder-panel__time-group {
  display: grid;
  justify-items: center;
}

.reminder-panel__title {
  margin: 0;
  font-size: clamp(1.65rem, 7vw, 2.8rem);
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: -0.04em;
}

.reminder-panel--untimed .reminder-panel__title {
  max-width: 18ch;
}

.reminder-panel__label {
  margin: calc(var(--space-3) * -1) 0 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.reminder-panel__body {
  margin: var(--space-3) 0 0;
  color: var(--text-secondary);
  font-size: var(--font-size-body);
  line-height: 1.7;
}

.reminder-panel--untimed .reminder-panel__body {
  margin: 0;
}

.reminder-panel__action {
  width: 100%;
  border-color: var(--reminder-tone);
  background: var(--reminder-tone);
  color: var(--color-white);
}

.reminder-panel__secondary {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-3);
}

.reminder-panel__secondary .button {
  flex: 1 1 auto;
}

.reminder-panel--untimed .reminder-panel__action {
  background: inherit;
  border-color: inherit;
  color: inherit;
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
