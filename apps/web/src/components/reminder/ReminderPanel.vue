<script setup lang="ts">
import Icon from "../icons/Icon.vue";
import type {
  ReminderPresentation,
  SecondaryActionKind
} from "../../features/reminder/reminderPresentation";

interface Props {
  presentation: ReminderPresentation;
}

const props = defineProps<Props>();

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
      <!--
        提醒頁是完整狀態頁，倒數環留在首頁（S-01 資訊順序第 1 項）。
        這裡只用一行摘要，避免兩頁各放一個一模一樣的大環。
      -->
      <p
        v-if="hasCountdown()"
        class="reminder-panel__countdown-summary"
        :aria-label="presentation.ariaLabel"
      >
        <span class="stat-figure">{{ presentation.remainingMinutes ?? 0 }}</span>
        <span class="reminder-panel__countdown-unit">分鐘</span>
        <span class="reminder-panel__countdown-time">{{ getTimeLabel() }}</span>
      </p>

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
      <Icon v-if="presentation.tone !== 'untimed'" name="state-success" :size="20" />
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

.reminder-panel__countdown-summary {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin: 0;
  flex-wrap: wrap;
}

.reminder-panel__countdown-unit,
.reminder-panel__countdown-time {
  color: var(--text-secondary);
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

}
</style>
