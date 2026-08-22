<script setup lang="ts">
import type {
  ActionKind,
  SessionProjection
} from "@sunshield/contracts";
import type { ConnectivityStatus } from "@sunshield/platform";
import { computed } from "vue";
import { useCurrentTime } from "../../composables/useCurrentTime";
import { buildHomeReminderClockPresentation } from "../../features/reminder/homeReminderClockPresentation";
import { buildReminderPresentation } from "../../features/reminder/reminderPresentation";
import CountdownSunTime from "../reminder/CountdownSunTime.vue";
import ReminderEmptyState from "../reminder/ReminderEmptyState.vue";
import Icon from "../icons/Icon.vue";

interface Props {
  session: SessionProjection | null;
  connectivity: ConnectivityStatus;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  action: [kind: ActionKind];
}>();

const currentTime = useCurrentTime();

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

const remainingFraction = computed(
  () => clockPresentation.value?.progress ?? 0
);

// 沒有倒數可顯示時（clockPresentation 為 null），過去不套任何 tone modifier，
// 於是 fallback 到 .home-summary 預設的 tracking 藍——把「無可信期限」畫成
// 「提醒運作中」。改為在這種情況改吃 reminderPresentation 的 tone。
// 兩邊的命名不同：clock 用 tracking／reminder 用 timed，這裡統一成 CSS 的寫法。
const toneModifier = computed<string | null>(() => {
  const clockTone = clockPresentation.value?.tone;
  if (clockTone !== undefined) {
    return `home-summary--${clockTone}`;
  }

  const reminderTone = reminderPresentation.value?.tone;
  if (reminderTone === undefined) return null;

  return `home-summary--${
    reminderTone === "timed" ? "tracking" : reminderTone
  }`;
});

</script>

<template>
  <ReminderEmptyState v-if="session === null" />
  <section
    v-else
    class="home-summary"
    :class="toneModifier"
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
          <CountdownSunTime
            :remaining-fraction="remainingFraction"
            :progress-percent="clockPresentation.progressPercent"
            :remaining-minutes="clockPresentation.remainingMinutes"
            :progress-aria-label="clockPresentation.ariaLabel"
            :time-label="clockPresentation.timeLabel"
          />
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
        <Icon name="state-success" :size="20" />
        {{ reminderPresentation.actionLabel }}
      </button>
    </template>

    <template v-else-if="session !== null && reminderPresentation !== null">
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
        <Icon name="state-success" :size="20" />
        {{ reminderPresentation.actionLabel }}
      </button>
    </template>

  </section>
</template>

<style scoped>
.home-summary {
  --home-summary-tone: var(--color-tracking);
  --home-summary-tone-soft: var(--color-tracking-soft);
  --countdown-tone: var(--home-summary-tone);
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

.home-summary--untimed {
  --home-summary-tone: var(--color-untimed);
  --home-summary-tone-soft: var(--color-untimed-soft);
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
  justify-items: start;
  gap: var(--space-5);
  text-align: left;
}

.home-summary__message {
  text-align: left;
}

.home-summary__time-group {
  display: grid;
  justify-items: center;
}

.home-summary__title {
  margin: 0;
  font-size: clamp(1.3rem, 5vw, 1.8rem);
  line-height: 1.2;
  letter-spacing: -0.03em;
}

.home-summary__body {
  margin: var(--space-3) 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.home-summary__action {
  width: 100%;
  max-width: 32rem;
  border-color: var(--home-summary-tone);
  background: var(--home-summary-tone);
  color: var(--color-white);
}

@media (min-width: 38rem) {
  .home-summary__countdown {
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    justify-items: start;
    text-align: left;
  }

  .home-summary__message {
    text-align: left;
  }
}
</style>
