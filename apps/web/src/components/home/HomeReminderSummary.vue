<script setup lang="ts">
import type {
  ActionKind,
  SessionProjection
} from "@sunshield/contracts";
import type { ConnectivityStatus } from "@sunshield/platform";
import { ArrowRight, CheckCircle2 } from "@lucide/vue";
import { computed } from "vue";
import { useCurrentTime } from "../../composables/useCurrentTime";
import { buildHomeReminderClockPresentation } from "../../features/reminder/homeReminderClockPresentation";
import { buildReminderPresentation } from "../../features/reminder/reminderPresentation";

interface Props {
  session: SessionProjection | null;
  connectivity: ConnectivityStatus;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  action: [kind: ActionKind];
}>();

const currentTime = useCurrentTime();
const ringRadius = 52;
const ringCircumference = 2 * Math.PI * ringRadius;

const clockPresentation = computed(() => {
  if (props.session === null) return null;
  return buildHomeReminderClockPresentation(
    props.session,
    currentTime.value
  );
});

const reminderPresentation = computed(() => {
  if (props.session === null) return null;
  return buildReminderPresentation({
    primaryAction: props.session.primaryAction,
    zones: props.session.zones,
    connectivity: props.connectivity,
    now: currentTime.value
  });
});

const ringStyle = computed(() => {
  const progress = clockPresentation.value?.progress;
  return {
    strokeDasharray: `${ringCircumference}`,
    strokeDashoffset:
      progress === null || progress === undefined
        ? `${ringCircumference}`
        : `${ringCircumference * (1 - progress)}`
  };
});
</script>

<template>
  <section
    class="home-summary"
    :class="{
      [`home-summary--${clockPresentation?.tone}`]:
        clockPresentation !== null
    }"
    :data-presentation="
      session === null
        ? 'empty'
        : clockPresentation === null
          ? 'untimed'
          : 'countdown'
    "
    :data-reminder-scope="clockPresentation?.scope"
    data-testid="home-reminder-summary"
  >
    <template v-if="session !== null && clockPresentation !== null">
      <p class="home-summary__eyebrow">補擦倒數</p>

      <div class="home-summary__countdown">
        <div class="home-summary__time-group">
          <div
            class="countdown-clock"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="
              clockPresentation.progressPercent ?? undefined
            "
            :aria-label="clockPresentation.ariaLabel"
          >
            <svg
              class="countdown-clock__ring"
              viewBox="0 0 120 120"
              aria-hidden="true"
            >
              <circle
                class="countdown-clock__track"
                cx="60"
                cy="60"
                :r="ringRadius"
              />
              <circle
                class="countdown-clock__progress"
                cx="60"
                cy="60"
                :r="ringRadius"
                :style="ringStyle"
              />
            </svg>
            <span class="countdown-clock__value">
              <strong class="stat-figure">{{ clockPresentation.remainingMinutes }}</strong>
              <small>分鐘</small>
            </span>
          </div>
          <p class="home-summary__time">
            預計
            <span class="stat-figure stat-figure--inline">
              {{ clockPresentation.timeLabel.replace("預計 ", "") }}
            </span>
          </p>
        </div>

        <div class="home-summary__message">
          <h1 class="home-summary__title">
            {{ clockPresentation.title }}
          </h1>
          <p class="home-summary__body">
            {{ reminderPresentation?.body }}
          </p>
        </div>
      </div>

      <button
        v-if="reminderPresentation !== null"
        class="button button--primary home-summary__action"
        type="button"
        @click="emit('action', reminderPresentation.actionKind)"
      >
        {{ reminderPresentation.actionLabel }}
      </button>
    </template>

    <template v-else-if="session !== null && reminderPresentation !== null">
      <div class="home-summary__mark" aria-hidden="true">
        <CheckCircle2 :size="27" :stroke-width="1.6" />
      </div>
      <div>
        <p class="home-summary__eyebrow">
          {{ reminderPresentation.eyebrow }}
        </p>
        <h1 class="home-summary__title">
          {{ reminderPresentation.title }}
        </h1>
        <p class="home-summary__body">
          {{ reminderPresentation.body }}
        </p>
      </div>
      <button
        class="button button--primary home-summary__action"
        type="button"
        @click="emit('action', reminderPresentation.actionKind)"
      >
        {{ reminderPresentation.actionLabel }}
      </button>
    </template>

    <template v-else>
      <div class="home-summary__mark" aria-hidden="true">
        <CheckCircle2 :size="27" :stroke-width="1.6" />
      </div>
      <div>
        <p class="home-summary__eyebrow">本機提醒</p>
        <h1 class="home-summary__title">尚未開始本機提醒</h1>
        <p class="home-summary__body">
          建立後，提醒會保存在這台裝置的 IndexedDB；重新開啟仍可恢復。
        </p>
      </div>
      <RouterLink class="button button--primary" to="/setup">
        開始防曬提醒
        <ArrowRight :size="18" aria-hidden="true" />
      </RouterLink>
    </template>
  </section>
</template>

<style scoped>
.home-summary {
  --home-summary-tone: var(--color-tracking);
  --home-summary-tone-soft: var(--color-tracking-soft);
  display: grid;
  justify-items: start;
  gap: var(--space-5);
  padding: clamp(1.5rem, 7vw, 2.5rem) clamp(1.25rem, 5vw, 2rem);
  border-radius: var(--radius-lg);
  background: var(--home-summary-tone-soft);
  overflow: hidden;
}

.home-summary--soon {
  --home-summary-tone: var(--color-soon);
  --home-summary-tone-soft: var(--color-soon-soft);
}

.home-summary--due {
  --home-summary-tone: var(--color-due);
  --home-summary-tone-soft: var(--color-due-soft);
}

.home-summary__mark {
  display: grid;
  width: 3.25rem;
  height: 3.25rem;
  place-content: center;
  border-radius: 50%;
  background: var(--surface-primary);
  color: var(--home-summary-tone);
}

.home-summary__eyebrow {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
}

.home-summary__countdown {
  display: grid;
  width: 100%;
  justify-items: center;
  gap: var(--space-5);
}

.countdown-clock {
  position: relative;
  display: grid;
  width: clamp(9rem, 42vw, 11rem);
  aspect-ratio: 1;
  place-items: center;
  color: var(--home-summary-tone);
}

.countdown-clock__ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.countdown-clock__track,
.countdown-clock__progress {
  fill: none;
  stroke-width: 6;
}

.countdown-clock__track {
  stroke: var(--border-subtle);
}

.countdown-clock__progress {
  stroke: currentColor;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s linear;
}

.countdown-clock__value {
  display: grid;
  position: relative;
  justify-items: center;
  line-height: 1;
  transform: translateY(0.25rem);
}

.countdown-clock__value strong {
  color: var(--text-primary);
  font-size: clamp(2rem, 10vw, 2.75rem);
  font-weight: 500;
  letter-spacing: -0.04em;
}

.countdown-clock__value small {
  margin-top: var(--space-2);
  color: var(--text-secondary);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
}

.home-summary__message {
  text-align: center;
}

.home-summary__time-group {
  display: grid;
  justify-items: center;
}

.home-summary__title {
  margin: 0;
  font-size: clamp(1.35rem, 5.5vw, 1.8rem);
  font-weight: 500;
  line-height: 1.3;
  letter-spacing: -0.025em;
}

.home-summary__time {
  margin: var(--space-2) 0 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.7;
}

.home-summary__body {
  margin: var(--space-3) 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.home-summary__action {
  width: 100%;
}

@media (min-width: 38rem) {
  .home-summary__countdown {
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    justify-items: start;
  }

  .home-summary__message {
    text-align: left;
  }
}
</style>
